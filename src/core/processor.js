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
  extractHandshakeContent,
} from './parser.js';
import { extractTemplateContent, extractRequiredHelpers } from './template.js';
import { processScriptContent } from './script.js';
import { createMorphError } from './errors.js';
import { getCachedResult, setCachedResult } from '../utils/cache.js';
import { debug, info, error } from '../utils/logger.js';
import { isProductionMode } from '../utils/shared.js';

/**
 * Process a morph file and return compiled result
 * @param {string} content - Raw morph file content
 * @param {string} filePath - File path
 * @param {import('../../types/index.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../../types/index.js').ProcessingResult>} Processing result
 */
export async function processMorphFile(content, filePath, options) {
  const startTime = Date.now();

  try {
    // Check cache first (include options in cache key for production mode differences)
    const cacheKey = JSON.stringify({ content, options, version: 3 });
    const cached = getCachedResult(cacheKey);

    if (cached) {
      info(`Using cached result for ${filePath}`);
      return cached;
    }

    // Parse morph file
    const document = parseMorphFile(content);
    debug(
      `Parsed morph file: ${filePath}, document nodes: ${document.childNodes?.length || 0}`
    );

    // Extract content in order: CSS first, then JS, then check what's left for template
    const styleRaw = extractStyleContent(document);
    const style = styleRaw ? { css: styleRaw } : null;
    debug(`Extracted style: ${style ? 'yes' : 'no'}`);
    const scriptRaw = extractScriptContent(document, 'text/javascript');

    // Process script content to extract functions and templates
    const script = processScriptContent(scriptRaw);

    // Extract template content
    const template = extractTemplateContent(document);

    // Extract handshake data from script
    const handshakeRaw = extractHandshakeContent(document, 'application/json');
    const handshake = handshakeRaw ? { data: JSON.parse(handshakeRaw) } : {};

    // Build helpers object
    const helpers = {};

    // Add function helpers
    if (script && script.functions) {
      Object.assign(helpers, script.functions);
    }

    // Add template helpers
    if (script && script.templates) {
      // For string helpers, preserve backticks in template object (as expected by tests)
      Object.assign(helpers, script.templates);
    }

    // Validate that all helpers referenced in template are available
    const requiredHelpers = extractRequiredHelpers(template.html);
    const missingHelpers = requiredHelpers.filter((name) => !(name in helpers));

    if (missingHelpers.length > 0) {
      throw createMorphError(
        `Missing helper functions: ${missingHelpers.join(', ')}. Ensure all helpers used in template are defined in <script> tags.`,
        filePath
      );
    }

    const templateObject = {
      template: template.html,
      helpers: Object.keys(helpers).length > 0 ? helpers : {},
      handshake:
        handshake && handshake.data && !isProductionMode(options)
          ? handshake.data
          : {},
    };

    // Store helpers separately for code generation
    const helperFunctions = helpers;

    // Determine if this is CSS-only
    const isCSSOnly = !!style && !scriptRaw && !template.html;

    // Generate ES module code
    const moduleCode = generateESModule(
      templateObject,
      helperFunctions,
      style,
      handshake?.data,
      options,
      isCSSOnly
    );

    const processingTime = Date.now() - startTime;

    // Create result object
    const result = {
      code: moduleCode,
      cssExports: style?.css,
      usedVariables: template.usedVariables,
      templateObject,
      isCSSOnly,
      processingTime,
      metadata: {
        processingTime,
        components: {
          template: !!template.html,
          script: !!scriptRaw,
          style: !!style,
          handshake: !!(handshake && handshake.data),
        },
        css: style ? { variables: style.variables } : undefined,
        template: template
          ? {
              placeholderCount: template.placeholders.length,
              helperFunctionCount: Object.keys(helperFunctions).length,
            }
          : undefined,
      },
    };

    // Cache result
    setCachedResult(cacheKey, result);

    info(`Successfully processed ${filePath} in ${processingTime}ms`);
    return result;
  } catch (err) {
    const errorResult = createMorphError(err, filePath);
    error(`Failed to process ${filePath}: ${errorResult.message}`);

    // Return error result
    return {
      code: '',
      cssExports: null,
      usedVariables: undefined,
      templateObject: null,
      isCSSOnly: false,
      processingTime: Date.now() - startTime,
      metadata: {
        processingTime: Date.now() - startTime,
        components: {
          template: false,
          script: false,
          style: false,
          handshake: false,
        },
        css: undefined,
        template: undefined,
      },
      errors: [errorResult],
    };
  }
}

/**
 * Generate ES module code from processed morph components
 * @param {import('../../types/index.js').TemplateObject} templateObject - Processed template object
 * @param {Object<string,Function>} helperFunctions - Helper functions
 * @param {import('../../types/index.js').StyleObject|null} style - Processed style object
 * @param {import('../../types/index.js').HandshakeObject|null} handshake - Handshake data
 * @param {import('../../types/index.js').MorphPluginOptions} options - Plugin options
 * @param {boolean} isCSSOnly - Whether this is a CSS-only file
 * @returns {string} Generated ES module code
 */
function generateESModule(
  templateObject,
  helperFunctions,
  style,
  handshake,
  options,
  isCSSOnly
) {
  const parts = [];

  if (isCSSOnly) {
    // CSS-only files: export styles directly, no morph utilities
    parts.push('// Export CSS styles');
    parts.push(`export const styles = ${JSON.stringify(style.css)};`);
  } else {
    // Regular morph files: include morph utilities
    parts.push(`import morph from '@peter.naydenov/morph';`);
    parts.push('');

    // Create template object
    parts.push('// Template object');
    parts.push(`const template = ${JSON.stringify(templateObject, null, 2)};`);
    parts.push('');

    // Add helpers if present
    if (helperFunctions && Object.keys(helperFunctions).length > 0) {
      parts.push('// Helpers');
      for (const [name, helper] of Object.entries(helperFunctions)) {
        if (typeof helper === 'function') {
          parts.push(`template.helpers.${name} = ${helper.toString()};`);
        } else {
          // String helper - preserve original template literal format
          parts.push('template.helpers.' + name + ' = `' + helper + '`;');
        }
      }
    }

    // Build render function
    parts.push('');
    parts.push('// Build render function');
    parts.push('const renderFunction = morph.build(template);');
    parts.push('');

    // Export render function as default
    parts.push('');
    parts.push('// Export render function as default');
    parts.push('export default renderFunction;');

    // Export template object as named export
    parts.push('');
    parts.push('// Export template object as named export');
    parts.push('export { template };');

    // Export handshake data if present
    if (handshake) {
      parts.push('');
      parts.push('// Handshake data (separate export)');
      parts.push(`export const handshake = ${JSON.stringify(handshake)};`);
    }

    // Export CSS if present
    if (style) {
      parts.push('');
      parts.push('// Export CSS');
      parts.push(`export const css = ${JSON.stringify(style.css)};`);
    }
  } // else !isCSSOnly
  return parts.join('\n');
}
