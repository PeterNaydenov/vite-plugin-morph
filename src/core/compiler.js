/**
 * Morph template compiler using @peter.naydenov/morph
 * @fileoverview Compiles morph template objects to render functions
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError, ErrorCodes } from './errors.js';
import { debug, info } from '../utils/logger.js';

/**
 * Compile morph template using @peter.naydenov/morph library
 * @param {import('./types/processing.js').TemplateContent} template - Template content
 * @param {import('./types/processing.js').ScriptContent} [script] - Script content with helpers
 * @param {import('./types/processing.js').HandshakeContent} [handshake] - Handshake data
 * @param {import('./types/processing.js').CompilationOptions} options - Compilation options
 * @returns {Promise<import('./types/processing.js').CompilationResult>} Compilation result
 */
export async function compileTemplate(
  template,
  script,
  handshake,
  options = {}
) {
  const startTime = Date.now();

  try {
    debug('Compiling morph template');

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
        // Validate helper function
        validateHelperFunction(name, func);
        morphTemplate.helpers[name] = func;
      }
    }

    // Add handshake if included in options
    if (options.includeHandshake && handshake && handshake.data) {
      morphTemplate.handshake = handshake.data;
    }

    // Set build dependencies if provided
    const buildDependencies = options.buildDependencies || {};

    // Compile the template
    const extra = options.extra !== false; // Default to true
    const renderFunction = build(morphTemplate, extra, buildDependencies);

    const compilationTime = Date.now() - startTime;
    const sourceCode = generateFunctionSource(renderFunction, options);

    info(`Template compiled successfully in ${compilationTime}ms`);

    return {
      renderFunction,
      sourceCode,
      compilationTime,
      metadata: {
        compilationTime,
        size: Buffer.byteLength(sourceCode, 'utf8'),
        handshakeIncluded: !!morphTemplate.handshake,
        helperFunctions: Object.keys(morphTemplate.helpers || {}),
      },
    };
  } catch (error) {
    throw createMorphError(
      `Template compilation failed: ${error.message}`,
      template.sourceLocation?.file || '',
      template.sourceLocation,
      ErrorCodes.TEMPLATE_ERROR
    );
  }
}

/**
 * Validate helper function before adding to template
 * @param {string} name - Function name
 * @param {Function} func - Function object
 */
function validateHelperFunction(name, func) {
  if (typeof func !== 'function') {
    throw createMorphError(
      `Helper '${name}' is not a valid function`,
      '',
      null,
      ErrorCodes.SCRIPT_ERROR
    );
  }

  if (!name || typeof name !== 'string') {
    throw createMorphError(
      'Helper function must have a valid name',
      '',
      null,
      ErrorCodes.SCRIPT_ERROR
    );
  }

  debug(`Validated helper function: ${name}`);
}

/**
 * Generate function source code
 * @param {Function} renderFunction - Compiled render function
 * @param {import('./types/processing.js').CompilationOptions} options - Compilation options
 * @returns {string} Function source code
 */
function generateFunctionSource(renderFunction, options) {
  let sourceCode = renderFunction.toString();

  // Add source map comment if enabled
  if (options.sourceMaps) {
    sourceCode = `//# sourceMappingURL=data:application/json;base64,${btoa(
      JSON.stringify({
        version: 3,
        file: 'template.js',
        sourceRoot: '',
        sources: ['template.morph'],
        names: [],
        mappings: '',
      })
    )}\n${sourceCode}`;
  }

  return sourceCode;
}

/**
 * Create optimized template for production
 * @param {import('./types/processing.js').TemplateContent} template - Template content
 * @param {import('./types/processing.js').ScriptContent} [script] - Script content
 * @returns {import('./types/processing.js').TemplateContent} Optimized template
 */
export function optimizeTemplateForProduction(template) {
  if (!template) {
    return template;
  }

  // Remove comments and extra whitespace
  let optimizedHTML = template.html
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Optimize helper functions (placeholder for future implementation)
  // if (script && script.functions) {
  //   const optimizedScript = {
  //     ...script,
  //     code: script.code
  //       .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
  //       .replace(/\/\/.*$/gm, '') // Remove line comments
  //       .replace(/\s+/g, ' ') // Normalize whitespace
  //       .trim(),
  //   };
  // }

  return {
    html: optimizedHTML,
    sourceLocation: template.sourceLocation,
  };
}

/**
 * Validate template syntax
 * @param {import('./types/processing.js').TemplateContent} template - Template content
 * @returns {string[]} Array of validation errors
 */
export function validateTemplate(template) {
  const errors = [];

  if (!template || !template.html) {
    errors.push('Template content is required');
    return errors;
  }

  // Check for common syntax issues
  const html = template.html;

  // Check for unclosed placeholders
  const openPlaceholders = (html.match(/\{\{/g) || []).length;
  const closePlaceholders = (html.match(/\}\}/g) || []).length;

  if (openPlaceholders !== closePlaceholders) {
    errors.push(
      `Mismatched placeholder braces: ${openPlaceholders} open, ${closePlaceholders} close`
    );
  }

  // Check for invalid placeholder syntax
  const invalidPlaceholders = html.match(/\{[^}]*\{[^}]*\}[^}]*\}/g) || [];
  if (invalidPlaceholders.length > 0) {
    errors.push(
      `Invalid placeholder syntax found: ${invalidPlaceholders.join(', ')}`
    );
  }

  return errors;
}
