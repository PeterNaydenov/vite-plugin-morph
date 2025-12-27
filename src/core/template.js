/**
 * Template content extraction and compilation
 * @fileoverview Handles template processing and @peter.naydenov/morph integration
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { createMorphError, ErrorCodes } from './errors.js';

/**
 * Reconstruct HTML from AST nodes (filters out script/style tags)
 * @param {Array} nodes - Array of AST nodes
 * @returns {string} Reconstructed HTML
 */
function reconstructHTMLFromNodes(nodes) {
  return nodes
    .map((node) => {
      if (node.nodeName === '#text') {
        return node.value;
      } else if (node.nodeName === '#comment') {
        return `<!--${node.data}-->`;
      } else if (node.nodeName === 'script' || node.nodeName === 'style') {
        return ''; // Skip script and style tags
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
export function extractPlaceholdersFromHTML(html) {
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
 * Extract helper names required by template placeholders
 * @param {string} templateHtml - Template HTML content
 * @returns {Array<string>} Array of required helper names
 */
export function extractRequiredHelpers(templateHtml) {
  const helpers = new Set();
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = placeholderRegex.exec(templateHtml)) !== null) {
    const content = match[1].trim();

    // Handle morph's advanced placeholder syntax:
    // {{ data : helper1, helper2, >helper3 }} - multiple helpers separated by commas
    // {{ @all : blank, ^^, >setupData }} - special syntax with symbols
    // {{ contacts : [], #, [], contactCards, #, [], tags }} - complex syntax

    // Split by colons first to get the main parts
    const colonParts = content.split(':').map((p) => p.trim());

    // Skip the first part as it's typically data (unless it looks like a helper)
    for (let i = 1; i < colonParts.length; i++) {
      const part = colonParts[i];

      // Split by commas to handle multiple helpers/parameters
      const commaParts = part.split(',').map((p) => p.trim());

      for (const item of commaParts) {
        // Check if this looks like a helper name (not empty, not just symbols, not array literals)
        if (
          item &&
          item !== '' &&
          !/^[\[\]{}#@^*<>]+$/.test(item) && // eslint-disable-line no-useless-escape -- brackets need escaping in character classes
          !item.includes('=') && // Exclude assignments
          !/^\d+$/.test(item) && // Exclude numbers
          item.length > 1
        ) {
          // Exclude single characters

          // Remove special prefixes that indicate different action types
          // > - data functions, [] - mixing functions, ? - conditional render
          // + - extended render, ^ - memory actions, ^^ - overwrite action
          let cleanName = item;
          cleanName = cleanName.replace(/^\^+/, ''); // Remove ^^ or ^ prefixes
          cleanName = cleanName.replace(/^\?\??/, ''); // Remove ? or ?? prefixes
          cleanName = cleanName.replace(/^\+\+?/, ''); // Remove + or ++ prefixes
          cleanName = cleanName.replace(/^\[\]/, ''); // Remove [] prefix
          cleanName = cleanName.replace(/^>/, ''); // Remove > prefix

          if (cleanName && cleanName !== '') {
            helpers.add(cleanName);
          }
        }
      }
    }
  }

  return Array.from(helpers);
}

/**
 * Extract template content from parsed document
 * @param {import('../types/index.d.ts').Document} document - Parsed HTML document
 * @returns {import('../types/index.d.ts').TemplateContent} Template content
 */
export function extractTemplateContent(document, rawContent, rawPlaceholders) {
  try {
    // Extract template HTML from raw content by removing script and style tags
    let html = rawContent;

    // Remove script tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove style tags
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Trim whitespace
    html = html.trim();

    // Check if this is just default HTML structure or empty
    const trimmedHtml = html.trim();
    const isDefaultHTML =
      trimmedHtml === '<html><head></head><body></body></html>' ||
      trimmedHtml === '<html><head></head><body></body></html>' ||
      trimmedHtml === '';
    const isEmpty = trimmedHtml === '';

    // Use raw placeholders
    const placeholders = rawPlaceholders;

    // Validate placeholders for syntax errors
    // Check for unclosed {{
    const openBraces = (html.match(/\{\{/g) || []).length;
    const closeBraces = (html.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw createMorphError(
        `Malformed placeholder: mismatched {{ and }} braces`,
        '',
        null,
        ErrorCodes.TEMPLATE_ERROR
      );
    }

    return {
      html: isDefaultHTML || isEmpty ? '' : html,
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
