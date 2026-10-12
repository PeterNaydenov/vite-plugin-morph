/**
 * HTML AST parsing utilities using parse5
 * @fileoverview Provides functions to parse and extract content from .morph files
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { parseFragment } from 'parse5';
import { debug } from '../utils/logger.js';

function findScriptNodes(node, scriptType) {
  const nodes = [];

  if (node.nodeName === 'script' && node.attrs) {
    const hasCorrectType = node.attrs.some(
      (attr) => attr.name === 'type' && attr.value === scriptType
    );
    const hasNoType =
      !node.attrs.some((attr) => attr.name === 'type') &&
      scriptType === 'text/javascript';

    if (hasCorrectType || hasNoType) {
      nodes.push(node);
    }
  }

  if (node.childNodes) {
    for (const child of node.childNodes) {
      nodes.push(...findScriptNodes(child, scriptType));
    }
  }

  return nodes;
}

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
    } catch {
      // Not strict JSON - normalize the JSON-like extensions below
    }

    return JSON.parse(normalizeJsonLike(content));
  } catch (error) {
    throw new Error(`Failed to parse JSON-like content: ${error.message}`, { cause: error });
  }
}

/**
 * Convert JSON-like text to strict JSON: drop comments, turn single-quoted
 * strings into double-quoted ones and remove trailing commas. Scans
 * character by character so string contents (e.g. "https://...") are
 * never mistaken for comments or quotes.
 * @param {string} content - JSON-like text
 * @returns {string} Strict JSON text
 */
function normalizeJsonLike(content) {
  let out = '';
  let i = 0;

  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      // Double-quoted string: copy verbatim, honouring escapes
      let j = i + 1;
      while (j < content.length && content[j] !== '"') {
        j += content[j] === '\\' ? 2 : 1;
      }
      out += content.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "'") {
      // Single-quoted string: re-quote with double quotes
      let value = '';
      let j = i + 1;
      while (j < content.length && content[j] !== "'") {
        if (content[j] === '\\') {
          value += content[j + 1] === "'" ? "'" : content.slice(j, j + 2);
          j += 2;
        } else {
          value += content[j] === '"' ? '\\"' : content[j];
          j += 1;
        }
      }
      out += `"${value}"`;
      i = j + 1;
    } else if (ch === '/' && next === '/') {
      while (i < content.length && content[i] !== '\n') i += 1;
    } else if (ch === '/' && next === '*') {
      const end = content.indexOf('*/', i + 2);
      i = end === -1 ? content.length : end + 2;
    } else if (ch === '}' || ch === ']') {
      out = out.replace(/,\s*$/, '') + ch; // trailing comma
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }

  return out.trim();
}

/**
 * Parse morph file content into AST
 * @param {string} content - Raw morph file content
 * @returns {import('../types/index.d.ts').Document} Parsed HTML document
 */
export function parseMorphFile(content) {
  try {
    // sourceCodeLocationInfo is needed to recover the <style> block's real
    // line number in the file, for dev-mode CSS source maps (see
    // getStyleContentLocation()) — otherwise harmless/unused.
    return parseFragment(content, { sourceCodeLocationInfo: true });
  } catch (error) {
    throw new Error(`Failed to parse morph file: ${error.message}`, { cause: error });
  }
}

/**
 * Parse HTML fragment (for template content)
 * @param {string} content - HTML fragment content
 * @returns {import('../types/index.d.ts').Document} Parsed HTML fragment
 */
export function parseHTMLFragment(content) {
  try {
    return parseFragment(content);
  } catch (error) {
    throw new Error(`Failed to parse HTML fragment: ${error.message}`, { cause: error });
  }
}

/**
 * Extract content from specific script tags
 * @param {import('../types/index.d.ts').Document} document - Parsed HTML document
 * @param {string} scriptType - Type of script tag ('text/javascript', 'application/json', etc.)
 * @returns {string|null} Script content or null if not found
 */
export function extractScriptContent(document, scriptType) {
  const scriptNodes = findScriptNodes(document, scriptType);
  if (scriptNodes.length === 0) {
    return null;
  }

  // Return the concatenated content of all script tags
  const scriptContent = scriptNodes
    .map((node) =>
      node.childNodes.map((child) => child.nodeValue || child.value || '').join('')
    )
    .join('');
  debug(`Extracted ${scriptNodes.length} script node(s) of type ${scriptType}`);
  return scriptContent;
}

/**
 * Extract content from specific style tags
 * @param {import('../types/index.d.ts').Document} document - Parsed HTML document
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
 * Get the line number (1-based, relative to the full .morph file) where the
 * <style> block's content begins. Used to build dev-mode CSS source maps that
 * point browser DevTools back to the correct line in the original file.
 * Requires parseMorphFile()'s sourceCodeLocationInfo to have been set.
 * @param {import('../types/index.d.ts').Document} document - Parsed HTML document
 * @returns {{startLine: number}|null} Location info, or null if unavailable
 */
export function getStyleContentLocation(document) {
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
  if (styleNodes.length === 0) return null;

  const textNode = styleNodes[0].childNodes?.[0];
  if (!textNode?.sourceCodeLocation) return null;

  return { startLine: textNode.sourceCodeLocation.startLine };
}

/**
 * Extract content from specific script tags
 * @param {import('../types/index.d.ts').Document} document - Parsed HTML document
 * @param {string} scriptType - Type of script tag ('text/javascript', 'application/json', etc.)
 * @returns {string|null} Script content or null if not found
 */
export function extractHandshakeContent(document, scriptType) {
  const scriptNodes = findScriptNodes(document, scriptType);
  if (scriptNodes.length === 0) {
    return null;
  }

  // Return the concatenated content of all script tags
  const handshakeContent = scriptNodes
    .map((node) =>
      node.childNodes.map((child) => child.nodeValue || child.value || '').join('')
    )
    .join('');
  debug(`Extracted ${scriptNodes.length} handshake node(s) of type ${scriptType}`);
  return handshakeContent;
}

/**
 * Get source location information from AST node
 * @param {import('../types/index.d.ts').Node} node - AST node
 * @returns {import('../types/index.d.ts').SourceLocation} Location information
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
 * @param {import('../types/index.d.ts').Node[]} nodes - AST nodes
 * @returns {string} Reconstructed HTML
 */
