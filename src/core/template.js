/**
 * Template content extraction and compilation
 * @fileoverview Handles template processing and @peter.naydenov/morph integration
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError, ErrorCodes } from './errors.js';
import { debug, info } from '../utils/logger.js';
import { parseMorphFile } from './parser.js';

/**
 * Extract template content from parsed document
 * @param {import('./types/processing.js').Document} document - Parsed HTML document
 * @returns {import('./types/processing.js').TemplateContent} Template content
 */
export function extractTemplateContent(document) {
  try {
    // Get all nodes except script and style tags
    const templateNodes = document.childNodes.filter(
      (node) => node.nodeName !== 'script' && node.nodeName !== 'style'
    );

    // Reconstruct HTML from template nodes
    const html = reconstructHTML(templateNodes);

    // Extract placeholders for validation
    const placeholders = extractPlaceholders(html);

    return {
      html,
      placeholders,
      sourceLocation: {
        file: '', // Will be set by caller
        line: 1,
        column: 1,
        offset: 0,
      },
    };
  } catch (error) {
    throw createMorphError(
      `Failed to extract template content: ${error.message}`,
      '',
      null,
      ErrorCodes.TEMPLATE_ERROR
    );
  }
}

/**
 * Compile morph template using @peter.naydenov/morph
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

    // Compile the template
    const renderFunction = build(
      morphTemplate,
      options.extra,
      options.buildDependencies
    );

    // Generate source code
    const sourceCode = generateFunctionSource(renderFunction, options);

    const compilationTime = Date.now() - startTime;

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
      '',
      null,
      ErrorCodes.TEMPLATE_ERROR
    );
  }
}

/**
 * Extract placeholder information from template
 * @param {string} html - Template HTML
 * @returns {import('./types/processing.js').Placeholder[]} Array of placeholders
 */
function extractPlaceholders(html) {
  const placeholders = [];
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = placeholderRegex.exec(html)) !== null) {
    const placeholderText = match[1];
    const parts = placeholderText.split(':');

    // Parse placeholder: {{ data : action1, action2 : name }}
    const dataSource = parts[0] ? parts[0].trim() : '';
    const actions = parts.slice(1, -1).map((p) => p.trim());
    const outputName = parts.length > 1 ? parts[parts.length - 1].trim() : '';

    placeholders.push({
      raw: match[0],
      dataSource,
      actions,
      outputName: outputName || undefined,
      location: {
        file: '',
        line: getLineNumber(html, match.index),
        column: getColumnNumber(html, match.index),
        offset: match.index,
      },
    });
  }

  return placeholders;
}

/**
 * Validate helper function
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
 * Get line number from character offset
 * @param {string} text - Full text
 * @param {number} offset - Character offset
 * @returns {number} Line number (1-based)
 */
function getLineNumber(text, offset) {
  const lines = text.substring(0, offset).split('\n');
  return lines.length;
}

/**
 * Get column number from character offset
 * @param {string} text - Full text
 * @param {number} offset - Character offset
 * @returns {number} Column number (1-based)
 */
function getColumnNumber(text, offset) {
  const lastNewline = text.lastIndexOf('\n', offset);
  if (lastNewline === -1) {
    return offset + 1;
  }
  return offset - lastNewline;
}

/**
 * Reconstruct HTML from nodes (simplified version)
 * @param {import('./types/processing.js').Node[]} nodes - AST nodes
 * @returns {string} Reconstructed HTML
 */
function reconstructHTML(nodes) {
  return nodes
    .map((node) => {
      if (node.nodeName === '#text') {
        return node.value;
      } else if (node.nodeName === '#comment') {
        return `<!--${node.data}-->`;
      } else {
        const attrs = node.attrs
          ? node.attrs.map((attr) => `${attr.name}="${attr.value}"`).join(' ')
          : '';
        const childContent = node.childNodes
          ? reconstructHTML(node.childNodes)
          : '';
        return `<${node.nodeName}${attrs ? ' ' + attrs : ''}>${childContent}</${node.nodeName}>`;
      }
    })
    .join('');
}
