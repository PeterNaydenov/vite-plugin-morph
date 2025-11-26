/**
 * HTML AST parsing utilities using parse5
 * @fileoverview Provides functions to parse and extract content from .morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { parse, parseFragment } from 'parse5';

/**
 * Parse morph file content into AST
 * @param {string} content - Raw morph file content
 * @returns {import('../types/index.js').Document} Parsed HTML document
 */
export function parseMorphFile(content) {
  try {
    return parse(content);
  } catch (error) {
    throw new Error(`Failed to parse morph file: ${error.message}`);
  }
}

/**
 * Parse HTML fragment (for template content)
 * @param {string} content - HTML fragment content
 * @returns {import('../types/index.js').Document} Parsed HTML fragment
 */
export function parseHTMLFragment(content) {
  try {
    return parseFragment(content);
  } catch (error) {
    throw new Error(`Failed to parse HTML fragment: ${error.message}`);
  }
}

/**
 * Extract content from specific script tags
 * @param {import('../types/index.js').Document} document - Parsed HTML document
 * @param {string} scriptType - Type of script tag ('text/javascript', 'application/json', etc.)
 * @returns {string|null} Script content or null if not found
 */
export function extractScriptContent(document, scriptType) {
  // Helper function to search recursively for script nodes
  function findScriptNodes(node) {
    const nodes = [];

    if (node.nodeName === 'script' && node.attrs) {
      const hasCorrectType = node.attrs.some(
        (attr) => attr.name === 'type' && attr.value === scriptType
      );
      // Also match scripts without type attribute (default to JavaScript)
      const hasNoType =
        !node.attrs.some((attr) => attr.name === 'type') &&
        scriptType === 'text/javascript';

      if (hasCorrectType || hasNoType) {
        nodes.push(node);
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        nodes.push(...findScriptNodes(child));
      }
    }

    return nodes;
  }

  const scriptNodes = findScriptNodes(document);

  if (scriptNodes.length > 0) {
    // Return the concatenated content of all script tags
    return scriptNodes
      .map((node) => node.childNodes.map((child) => child.value || '').join(''))
      .join('');
  }

  return null;
}

/**
 * Extract content from specific style tags
 * @param {import('../types/index.js').Document} document - Parsed HTML document
 * @returns {string|null} Style content or null if not found
 */
export function extractStyleContent(document) {
  // Helper function to search recursively for style nodes
  function findStyleNodes(node) {
    const nodes = [];

    if (node.nodeName === 'style') {
      nodes.push(node);
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        nodes.push(...findStyleNodes(child));
      }
    }

    return nodes;
  }

  const styleNodes = findStyleNodes(document);

  if (styleNodes.length > 0) {
    // Return the content of the first style tag
    return styleNodes[0].childNodes.map((child) => child.value || '').join('');
  }

  return null;
}

/**
 * Extract content from specific script tags
 * @param {import('../types/index.js').Document} document - Parsed HTML document
 * @param {string} scriptType - Type of script tag ('text/javascript', 'application/json', etc.)
 * @returns {string|null} Script content or null if not found
 */
export function extractHandshakeContent(document, scriptType) {
  // Helper function to search recursively for script nodes
  function findScriptNodes(node) {
    const nodes = [];

    if (node.nodeName === 'script' && node.attrs) {
      const hasCorrectType = node.attrs.some(
        (attr) => attr.name === 'type' && attr.value === scriptType
      );
      // Also match scripts without type attribute (default to JavaScript)
      const hasNoType =
        !node.attrs.some((attr) => attr.name === 'type') &&
        scriptType === 'text/javascript';

      if (hasCorrectType || hasNoType) {
        nodes.push(node);
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        nodes.push(...findScriptNodes(child));
      }
    }

    return nodes;
  }

  const scriptNodes = findScriptNodes(document);

  if (scriptNodes.length > 0) {
    // Return the concatenated content of all script tags
    return scriptNodes
      .map((node) => node.childNodes.map((child) => child.value || '').join(''))
      .join('');
  }

  return null;
}

/**
 * Get source location information from AST node
 * @param {import('../types/index.js').Node} node - AST node
 * @returns {import('../types/index.js').SourceLocation} Location information
 */
export function getNodeLocation(node) {
  // parse5 provides location information
  if (node.__location) {
    return {
      file: '', // Will be set by caller
      line: node.__location.line,
      column: node.__location.col,
      offset: node.__location.startOffset,
    };
  }

  return {
    file: '',
    line: 1,
    column: 1,
    offset: 0,
  };
}

/**
 * Reconstruct HTML from AST nodes
 * @param {import('../types/index.js').Node[]} nodes - AST nodes
 * @returns {string} Reconstructed HTML
 */
