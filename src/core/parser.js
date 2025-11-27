/**
 * HTML AST parsing utilities using parse5
 * @fileoverview Provides functions to parse and extract content from .morph files
 * @author Peter Naydenov
 * @version 0.0.7
 */

import { parse, parseFragment } from 'parse5';

/**
 * Parse JSON-like content with comments and flexible syntax
 * @param {string} content - JSON-like content with comments
 * @returns {object} Parsed object
 */
export function parseJsonLike(content) {
  try {
    // First, try parsing as regular JSON to see if it's already valid
    try {
      return JSON.parse(content.trim());
    } catch (jsonError) {
      // If JSON.parse fails, try to clean up comments and single quotes
    }

    // Remove single-line comments
    let cleaned = content.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    // Basic single quote to double quote conversion (simple cases)
    // This is not perfect but handles common cases
    cleaned = cleaned.replace(/'([^']*)'/g, '"$1"');

    // Parse as JSON
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse JSON-like content: ${error.message}`);
  }
}

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

  console.log(
    '[vite-plugin-morph] Found',
    scriptNodes.length,
    'script nodes for type:',
    scriptType
  );

  if (scriptNodes.length > 0) {
    // Return the concatenated content of all script tags
    const scriptContent = scriptNodes
      .map((node) => {
        const content = node.childNodes
          .map((child) => child.nodeValue || child.value || '')
          .join('');
        console.log(
          '[vite-plugin-morph] Script content extracted:',
          content.substring(0, 200) + '...'
        );
        return content;
      })
      .join('');
    console.log(
      '[vite-plugin-morph] Extracted script content:',
      scriptContent.substring(0, 200) + '...'
    );
    return scriptContent;
  }

  console.log(
    '[vite-plugin-morph] No script content found for type:',
    scriptType
  );
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

  console.log(
    '[vite-plugin-morph] Found',
    scriptNodes.length,
    'handshake script nodes for type:',
    scriptType
  );

  if (scriptNodes.length > 0) {
    // Return the concatenated content of all script tags
    const handshakeContent = scriptNodes
      .map((node) => {
        console.log(
          '[vite-plugin-morph] Handshake script node childNodes:',
          node.childNodes.length
        );
        return node.childNodes
          .map((child) => {
            console.log(
              '[vite-plugin-morph] Handshake child node:',
              child.nodeName,
              'value:',
              child.nodeValue || child.value
            );
            return child.nodeValue || child.value || '';
          })
          .join('');
      })
      .join('');
    console.log(
      '[vite-plugin-morph] Extracted handshake content:',
      handshakeContent.substring(0, 200) + '...'
    );
    return handshakeContent;
  }

  console.log(
    '[vite-plugin-morph] No handshake content found for type:',
    scriptType
  );
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
