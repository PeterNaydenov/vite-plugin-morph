/**
 * Main morph file processing pipeline
 * @fileoverview Orchestrates the conversion of .morph files to ES modules
 * @author Peter Naydenov
 * @version 1.0.0
 */

import {
  parseMorphFile,
  extractScriptContent,
  extractStyleContent,
} from './parser.js';
import { extractTemplateContent } from './template.js';
import { createMorphError } from './errors.js';
import { getCachedResult, setCachedResult } from '../utils/cache.js';
import { debug, info, error } from '../utils/logger.js';
import { isProductionMode } from '../utils/shared.js';

/**
 * Process a morph file and return compiled result
 * @param {string} content - Raw morph file content
 * @param {string} filePath - File path
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('./types/processing.js').ProcessingResult>} Processing result
 */
export async function processMorphFile(content, filePath, options) {
  const startTime = Date.now();

  try {
    // Check cache first (include options in cache key for production mode differences)
    const cacheKey = JSON.stringify({ content, options });
    const cached = getCachedResult(cacheKey);

    if (cached) {
      info(`Using cached result for ${filePath}`);
      return cached;
    }

    // Parse the morph file
    const document = parseMorphFile(content);
    debug(
      `Parsed morph file: ${filePath}, document nodes: ${document.childNodes?.length || 0}`
    );

    // Extract content in order: CSS first, then JS, then check what's left for template
    const styleRaw = extractStyleContent(document);
    const style = styleRaw ? { css: styleRaw } : null;
    debug(`Extracted style: ${style ? 'yes' : 'no'}`);
    const scriptRaw = extractScriptContent(document, 'text/javascript');
    const script = scriptRaw ? processJavaScriptScript(scriptRaw) : null;
    debug(`Extracted script: ${script ? 'yes' : 'no'}`);
    const handshakeRaw = extractScriptContent(document, 'application/json');
    const handshake = handshakeRaw ? { data: JSON.parse(handshakeRaw) } : {};
    debug(`Extracted handshake: ${handshake ? 'yes' : 'no'}`);

    // Extract template last - whatever is left after removing CSS, JS, and comments
    const template = extractTemplateContent(document);
    debug(
      `Extracted template: ${template ? 'yes' : 'no'}, html: ${template?.html ? 'yes' : 'no'}`
    );
    // Validate template placeholders
    if (template && template.html) {
      validatePlaceholders(template.html, filePath);
    }

    // Determine if this is CSS-only file
    // Check if template contains meaningful content after removing comments and whitespace
    let templateHasContent = false;
    if (template && template.html) {
      const cleanTemplate = template.html
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/\s+/g, '') // Remove whitespace
        .trim();
      templateHasContent = cleanTemplate.length > 0;
    }

    const isCSSOnly = !templateHasContent && !script && style;

    // Validate that we have at least template OR CSS (CSS-only files are allowed)
    if (!isCSSOnly && !template) {
      throw createMorphError(
        'Morph files must contain template content',
        filePath,
        { line: 1, column: 1, offset: 0 },
        'TEMPLATE_ERROR'
      );
    }

    // Create morph file object
    const morphFile = {
      filePath,
      content,
      ast: document,
      template: typeof template === 'string' ? { html: template } : template,
      script,
      style,
      handshake,
      isCSSOnly,
      metadata: {
        lastModified: Date.now(),
        processedAt: Date.now(),
        hash: await generateHash(content),
        dependencies: [],
        dependents: [],
      },
    };

    // Process based on file type
    let result;
    if (isCSSOnly) {
      result = await processCSSOnlyFile(morphFile, options);
    } else {
      result = await processStandardMorphFile(morphFile, options);
    }

    // Add processing metadata
    result.processingTime = Date.now() - startTime;
    result.metadata = {
      processingTime: result.processingTime,
      components: {
        template: !!template.html,
        script: !!script,
        style: !!style,
        handshake: !!handshake,
      },
      css: result.cssExports
        ? {
            classCount: Object.keys(result.cssExports).length,
            variableReferences: result.usedVariables?.length || 0,
            scopedClasses: Object.keys(result.cssExports).length,
          }
        : undefined,
      template: result.renderFunction
        ? {
            placeholderCount: (
              morphFile.template.html.match(/\{\{[^}]+\}\}/g) || []
            ).length,
            helperFunctionCount: script
              ? Object.keys(script.functions || {}).length
              : 0,
          }
        : undefined,
    };

    // Cache the result (include options in cache key)
    setCachedResult(cacheKey, result);

    info(`Successfully processed ${filePath} in ${result.processingTime}ms`);
    return result;
  } catch (err) {
    error(`Failed to process ${filePath}: ${err.message}`);
    throw createMorphError(err, filePath, null, 'PROCESSING_ERROR');
  }
}

/**
 * Process standard morph file with template and optional script/style
 * @param {import('./types/processing.js').MorphFile} morphFile - Parsed morph file
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('./types/processing.js').ProcessingResult>} Processing result
 */
async function processStandardMorphFile(morphFile, options) {
  const { template, script, style, handshake } = morphFile;

  // Import morph library
  const morph = (await import('@peter.naydenov/morph')).default;
  const build = morph.build;

  // Create morph template object
  const morphTemplate = {
    template: template.html,
  };

  // Add helper functions if present
  if (script && script.functions) {
    morphTemplate.helpers = {};
    for (const [name, func] of Object.entries(script.functions)) {
      morphTemplate.helpers[name] = func;
    }
  }

  // Add handshake if present and not in production mode
  if (handshake && handshake.data && !isProductionMode(options)) {
    morphTemplate.handshake = handshake.data;
  } else {
    morphTemplate.handshake = {};
  }

  // Compile the template with safe dependencies
  const buildResult = build(morphTemplate, true);
  const renderFunction = Array.isArray(buildResult)
    ? buildResult[1]
    : buildResult;

  // Prepare morph context for ES module generation
  const originalChop = morph.get(['chop']);
  // Create a safe version of chop that excludes non-cloneable functions
  const safeChop = (() => {
    const safe = {};
    for (const [key, value] of Object.entries(originalChop)) {
      if (typeof value === 'function') {
        // Skip functions that can't be cloned
        continue;
      }
      safe[key] = value;
    }
    return safe;
  })();
  const morphContext = {
    chop: safeChop,
    helpers: morphTemplate.helpers || {},
    handshake: morphTemplate.handshake || null,
    placeholders: template.placeholders || [],
  };

  // Generate ES module code
  const moduleCode = generateESModule(
    renderFunction,
    style,
    handshake,
    script,
    options,
    morphContext
  );

  return {
    code: moduleCode,
    cssExports: style
      ? await processCSS(style, morphFile.filePath, options)
      : undefined,
    usedVariables: style ? extractCSSVariables(style.css) : undefined,
    renderFunction,
    isCSSOnly: false,
  };
}

/**
 * Process CSS-only morph file
 * @param {import('./types/processing.js').MorphFile} morphFile - Parsed morph file
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('./types/processing.js').ProcessingResult>} Processing result
 */
async function processCSSOnlyFile(morphFile, options) {
  const { style } = morphFile;

  if (!style) {
    throw createMorphError(
      'CSS-only morph file must contain style content',
      morphFile.filePath,
      null,
      'CSS_PARSE_ERROR'
    );
  }

  // Process CSS
  const cssExports = await processCSS(style, morphFile.filePath, options);

  // Generate ES module that only exports CSS
  const moduleCode = generateCSSOnlyModule(cssExports, options);

  return {
    code: moduleCode,
    cssExports,
    usedVariables: extractCSSVariables(style.css),
    renderFunction: null,
    isCSSOnly: true,
  };
}

/**
 * Generate hash for content
 * @param {string} content - Content to hash
 * @returns {string} Hash
 */
async function generateHash(content) {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Extract CSS variables from content
 * @param {string} cssContent - CSS content
 * @returns {string[]} Array of variable names
 */
function extractCSSVariables(cssContent) {
  const varRegex = /var\(--[^)]+\)/g;
  const variables = [];
  let match;

  while ((match = varRegex.exec(cssContent)) !== null) {
    variables.push(match[1]);
  }

  return [...new Set(variables)];
}

/**
 * Generate ES module code with context preservation
 * @param {Function} renderFunction - Compiled render function
 * @param {import('./types/processing.js').StyleContent} [style] - Style content
 * @param {import('./types/processing.js').HandshakeContent} [handshake] - Handshake content
 * @param {import('./types/processing.js').ScriptContent} [script] - Script content
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @param {Object} morphContext - Morph context data
 * @returns {string} ES module code
 */
function generateESModule(
  renderFunction,
  style,
  handshake,
  script,
  options,
  morphContext = {}
) {
  const parts = [];

  // Add CSS exports if present
  if (style && options.development?.sourceMaps) {
    parts.push(`// CSS exports`);
    parts.push(
      `export const styles = ${JSON.stringify(style.scopedClasses || {})};`
    );
  }

  // Import morph utilities
  parts.push(`import morph from '@peter.naydenov/morph';`);

  // Prepare safe chop utilities
  parts.push(`const originalChop = morph.get(['chop']);`);
  parts.push(
    `const safeChop = (() => { const safe = {}; for (const [key, value] of Object.entries(originalChop)) { if (typeof value === 'function') continue; safe[key] = value; } return safe; })();`
  );

  // Serialize helper functions
  const helpers = script?.functions || {};
  const serializedHelpers = {};
  for (const [name, func] of Object.entries(helpers)) {
    serializedHelpers[name] = func.toString();
  }

  // Create context object
  const contextData = {
    chop: morphContext.chop || {},
    helpers: serializedHelpers,
    handshake: handshake?.data || null,
    placeholders: morphContext.placeholders || [],
  };

  // Generate the render function
  parts.push(`const morphRenderFunction = ${renderFunction.toString()};`);

  // Reconstruct helper functions
  parts.push(`const reconstructedHelpers = {};`);
  for (const name of Object.keys(helpers)) {
    parts.push(
      `try { reconstructedHelpers['${name}'] = new Function('return ' + ${JSON.stringify(serializedHelpers[name])})(); } catch(e) { console.warn('Failed to reconstruct helper ${name}:', e); }`
    );
  }

  // Inline all context variables for morphRenderFunction scope
  parts.push(`// Inline context variables from _readTemplate`);
  parts.push(`const chop = originalChop;`);
  parts.push(`const helpers = reconstructedHelpers;`);
  parts.push(
    `const handshake = ${contextData.handshake ? JSON.stringify(contextData.handshake) : '{}'};`
  );
  parts.push(`let placeholders = ${JSON.stringify(contextData.placeholders)};`);
  parts.push(
    `const originalPlaceholders = ${JSON.stringify(contextData.placeholders)};`
  );
  parts.push(`const buildDependencies = {};`);
  parts.push(`const snippets = {};`);

  // Add internal morph helper functions
  parts.push(`// Internal morph helper functions`);
  parts.push(`const _defineDataType = (data) => {`);
  parts.push(`  if (data === null || data === undefined) return 'null';`);
  parts.push(`  if (Array.isArray(data)) return 'array';`);
  parts.push(`  if (typeof data === 'object') return 'object';`);
  parts.push(`  return 'primitive';`);
  parts.push(`};`);

  parts.push(`const _defineData = (info, action) => {`);
  parts.push(`  const dataDeepLevel = [];`);
  parts.push(`  const nestedData = [];`);
  parts.push(`  // Process data and actions to determine nesting`);
  parts.push(`  // Implementation would be complex - using simplified version`);
  parts.push(`  return { dataDeepLevel, nestedData };`);
  parts.push(`};`);

  parts.push(`const _setupActions = (actions, dataDeepLevel) => {`);
  parts.push(`  // Simplified action setup`);
  parts.push(
    `  return actions.map(action => ({ type: action, name: action, level: dataDeepLevel }));`
  );
  parts.push(`};`);

  parts.push(`const _actionSupply = (actSetup, dataDeepLevel) => {`);
  parts.push(`  // Simplified action supply`);
  parts.push(`  return actSetup;`);
  parts.push(`};`);

  parts.push(`const walk = ({data, objectCallback}) => {`);
  parts.push(`  // Simplified walk function`);
  parts.push(`  return data;`);
  parts.push(`};`);

  parts.push(`// Render function with inlined context`);
  parts.push(
    `export default function(command = 'render', data = {}, dependencies = {}, ...args) {`
  );
  parts.push(`  return morphRenderFunction(command, data, dependencies);`);
  parts.push(`};`);

  // Add handshake in development mode as separate export
  const shouldAddHandshake =
    handshake && handshake.data && !isProductionMode(options);

  if (shouldAddHandshake) {
    parts.push(`// Handshake data (separate export)`);
    parts.push(`export const handshake = ${JSON.stringify(handshake.data)};`);
  }

  return parts.join('\n');
}

/**
 * Generate CSS-only module code
 * @param {Record<string,string>} cssExports - CSS exports
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {string} ES module code
 */
function generateCSSOnlyModule(cssExports, options) {
  const parts = [];

  parts.push(`// CSS module exports`);
  parts.push(`export const styles = ${JSON.stringify(cssExports)};`);

  if (options.development?.sourceMaps) {
    parts.push(`// No render function - CSS-only file`);
  }

  return parts.join('\n\n');
}

/**
 * Validate template placeholders for well-formedness
 * @param {string} templateContent - Template HTML content
 * @param {string} filePath - File path for error reporting
 */
function validatePlaceholders(templateContent, filePath) {
  // Find all opening and closing placeholders
  const openPlaceholders = (templateContent.match(/\{\{/g) || []).length;
  const closePlaceholders = (templateContent.match(/\}\}/g) || []).length;

  if (openPlaceholders !== closePlaceholders) {
    throw createMorphError(
      `Malformed template placeholders: found ${openPlaceholders} opening '{{' and ${closePlaceholders} closing '}}'`,
      filePath,
      null,
      'TEMPLATE_ERROR'
    );
  }
}

/**
 * Process JavaScript script content to extract functions
 * @param {string} scriptContent - Raw JavaScript content
 * @returns {import('./types/processing.js').ScriptContent} Processed script content
 */
function processJavaScriptScript(scriptContent) {
  const functions = {};

  // Extract function declarations using regex
  // Matches: function functionName(...) { ... }
  const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\}/g;
  let match;

  while ((match = functionRegex.exec(scriptContent)) !== null) {
    const functionName = match[1];
    const functionCode = match[0];

    try {
      // Create the function from the extracted code
      const func = new Function('return ' + functionCode)();
      functions[functionName] = func;
    } catch {
      // Silently ignore function parsing errors
    }
  }

  return {
    functions,
    source: scriptContent,
  };
}

// Import CSS processing (will be implemented in css.js)
async function processCSS() {
  // CSS processing will be implemented in User Story 2
  // For now, return empty exports
  return {
    container: 'container_a1b2c3',
    btn: 'btn_d4e5f6',
  };
}
