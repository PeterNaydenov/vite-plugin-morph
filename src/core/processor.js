/**
 * Main morph file processing pipeline
 * @fileoverview Orchestrates conversion of .morph files to ES modules
 * @author Peter Naydenov
 * @version 1.0.0
 */

import {
  parseMorphFile,
  extractScriptContent,
  extractStyleContent,
} from './parser.js';
import { extractTemplateContent } from './template.js';
import { processScriptContent } from './script.js';
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
    const script = scriptRaw ? processScriptContent(scriptRaw) : null;
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
      template: result.templateObject
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

  // Create template object for morph library
  const helpers = {};

  // Add function helpers
  if (script && script.functions) {
    Object.assign(helpers, script.functions);
  }

  // Add template helpers
  if (script && script.templates) {
    Object.assign(helpers, script.templates);
  }

  const templateObject = {
    template: template.html,
    helpers: Object.keys(helpers).length > 0 ? helpers : undefined,
    handshake:
      handshake && handshake.data && !isProductionMode(options)
        ? handshake.data
        : {},
  };

  // Store helpers separately for code generation
  const helperFunctions = helpers;

  // Generate ES module code
  const moduleCode = generateESModule(
    templateObject,
    helperFunctions,
    style,
    handshake,
    script,
    options
  );

  return {
    code: moduleCode,
    cssExports: style
      ? await processCSS(style, morphFile.filePath, options)
      : undefined,
    usedVariables: style ? extractCSSVariables(style.css) : undefined,
    templateObject,
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
    templateObject: null,
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
 * Generate ES module code with template object
 * @param {Object} templateObject - Template object for morph library
 * @param {import('./types/processing.js').StyleContent} [style] - Style content
 * @param {import('./types/processing.js').HandshakeContent} [handshake] - Handshake content
 * @param {import('./types/processing.js').ScriptContent} [script] - Script content
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {string} ES module code
 */
function generateESModule(
  templateObject,
  helperFunctions,
  style,
  handshake,
  script,
  options
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
  parts.push('');

  // Create template object
  parts.push(`// Template object`);
  parts.push(`const template = ${JSON.stringify(templateObject, null, 2)};`);
  parts.push('');

  // Add helpers if present
  if (helperFunctions && Object.keys(helperFunctions).length > 0) {
    parts.push(`// Helpers`);
    for (const [name, helper] of Object.entries(helperFunctions)) {
      if (typeof helper === 'function') {
        parts.push(`template.helpers.${name} = ${helper.toString()};`);
      } else {
        // String helper - add as template string
        parts.push(`template.helpers.${name} = \`${helper}\`;`);
      }
    }
    parts.push('');
  }

  // Build and export render function
  parts.push(`// Build render function`);
  parts.push(`const renderFunction = morph.build(template);`);
  parts.push('');

  parts.push(`// Export render function`);
  parts.push(`export default renderFunction;`);

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

// Import CSS processing (will be implemented in css.js)
async function processCSS() {
  // CSS processing will be implemented in User Story 2
  // For now, return empty exports
  return {
    container: 'container_a1b2c3',
    btn: 'btn_d4e5f6',
  };
}
