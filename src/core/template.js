/**
 * Template content extraction and compilation
 * @fileoverview Handles template processing and @peter.naydenov/morph integration
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError, ErrorCodes } from './errors.js';

/**
 * Reconstruct HTML from AST nodes (filters out script/style tags)
 * @param {Array} nodes - Array of AST nodes
 * @returns {string} Reconstructed HTML
 */
function reconstructHTMLFromNodes(nodes) {
  return nodes
    .filter((node) => node.nodeName !== 'script' && node.nodeName !== 'style')
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
          ? reconstructHTMLFromNodes(node.childNodes)
          : '';
        return `<${node.nodeName}${attrs ? ' ' + attrs : ''}>${childContent}</${node.nodeName}>`;
      }
    })
    .join('');
}

/**
 * Extract placeholders from HTML string
 * @param {string} html - HTML content
 * @returns {Array<Object>} Array of placeholder objects
 */
function extractPlaceholdersFromHTML(html) {
  const placeholders = [];
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;
  let index = 0;

  while ((match = placeholderRegex.exec(html)) !== null) {
    placeholders.push({
      index,
      text: match[0],
      content: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
    index++;
  }

  return placeholders;
}

/**
 * Extract template content from parsed document
 * @param {import('../types/index.js').Document} document - Parsed HTML document
 * @returns {import('../types/index.js').TemplateContent} Template content
 */
export function extractTemplateContent(document) {
  try {
    // Get all nodes except script and style tags
    const templateNodes = document.childNodes.filter(
      (node) => node.nodeName !== 'script' && node.nodeName !== 'style'
    );

    // Reconstruct HTML from template nodes
    const html = reconstructHTMLFromNodes(templateNodes);

    // Extract placeholders for validation
    const placeholders = extractPlaceholdersFromHTML(html);

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
