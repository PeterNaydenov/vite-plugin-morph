/**
 * Main morph file processing pipeline
 * @fileoverview Orchestrates the conversion of .morph files to ES modules
 * @author Peter Naydenov
 * @version 1.0.0
 */

import {
  parseMorphFile,
  extractTemplateContent,
  extractScriptContent,
  extractStyleContent,
} from './parser.js';
import { createMorphError } from './errors.js';
import { getCachedResult, setCachedResult } from '../utils/cache.js';
import { debug, info, error } from '../utils/logger.js';

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
    debug(`Processing morph file: ${filePath}`);

    // Check cache first
    const cached = getCachedResult(content);
    if (cached) {
      info(`Using cached result for ${filePath}`);
      return cached;
    }

    // Parse the morph file
    const document = parseMorphFile(content);

    // Extract different content sections
    const template = extractTemplateContent(document);
    const scriptRaw = extractScriptContent(document, 'text/javascript');
    const script = scriptRaw ? processJavaScriptScript(scriptRaw) : null;
    const styleRaw = extractStyleContent(document);
    const style = styleRaw ? { css: styleRaw } : null;
    const handshakeRaw = extractScriptContent(document, 'application/json');
    const handshake = handshakeRaw ? { data: JSON.parse(handshakeRaw) } : null;

    // Determine if this is CSS-only file
    // Check if template contains meaningful content (not just comments/whitespace)
    let templateHasContent = false;
    if (template && template.html) {
      const cleanTemplate = template.html
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
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

    // Cache the result
    setCachedResult(content, result);

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
  const { build } = await import('@peter.naydenov/morph');

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
  }

  // Compile the template
  const renderFunction = build(morphTemplate);

  // Generate ES module code
  const moduleCode = generateESModule(
    renderFunction,
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
 * Check if running in production mode
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {boolean} Whether in production mode
 */
function isProductionMode(options) {
  // Check Vite's build mode or custom production flag
  const result =
    process.env.NODE_ENV === 'production' ||
    process.argv.includes('--production') ||
    options.production?.removeHandshake === true;
  console.log('isProductionMode check:', {
    nodeEnv: process.env.NODE_ENV,
    argv: process.argv,
    options: options,
    result,
  });
  return result;
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
 * Generate ES module code
 * @param {Function} renderFunction - Compiled render function
 * @param {import('./types/processing.js').StyleContent} [style] - Style content
 * @param {import('./types/processing.js').HandshakeContent} [handshake] - Handshake content
 * @param {import('./types/processing.js').ScriptContent} [script] - Script content
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {string} ES module code
 */
function generateESModule(renderFunction, style, handshake, script, options) {
  const parts = [];

  // Add CSS exports if present
  if (style && options.development?.sourceMaps) {
    parts.push(`// CSS exports`);
    parts.push(
      `export const styles = ${JSON.stringify(style.scopedClasses || {})};`
    );
  }

  // Add helper functions if present
  if (script && script.source) {
    parts.push(`// Helper functions`);
    parts.push(script.source);
  }

  // Add render function
  parts.push(`// Render function`);
  parts.push(`export default ${renderFunction.toString()};`);

  // Add handshake in development mode
  if (handshake && handshake.data && !isProductionMode(options)) {
    parts.push(`// Handshake data`);
    parts.push(`export const handshake = ${JSON.stringify(handshake.data)};`);
  }

  return parts.join('\n\n');
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
 * Process JavaScript script content to extract functions
 * @param {string} scriptContent - Raw JavaScript content
 * @returns {import('./types/processing.js').ScriptContent} Processed script content
 */
function processJavaScriptScript(scriptContent) {
  // For now, just return the raw script content
  // Function extraction will be implemented in a later phase
  return {
    functions: {},
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
