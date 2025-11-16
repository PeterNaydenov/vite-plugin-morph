/**
 * Script content extraction and processing
 * @fileoverview Extracts and processes JavaScript from <script> tags in morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError, ErrorCodes } from './errors.js';
import { debug, warn } from '../utils/logger.js';

/**
 * Extract script content from parsed document
 * @param {import('./types/processing.js').Document} document - Parsed HTML document
 * @param {string} [scriptType='text/javascript'] - Type of script to extract
 * @returns {import('./types/processing.js').ScriptContent|null} Script content or null
 */
export function extractScriptContent(document, scriptType = 'text/javascript') {
  try {
    // Find script nodes with specified type
    const scriptNodes = document.childNodes.filter(
      (node) =>
        node.nodeName === 'script' &&
        node.attrs &&
        node.attrs.some(
          (attr) => attr.name === 'type' && attr.value === scriptType
        )
    );

    if (scriptNodes.length === 0) {
      debug(`No ${scriptType} script found in morph file`);
      return null;
    }

    if (scriptNodes.length > 1) {
      warn(`Multiple ${scriptType} scripts found, using the first one`);
    }

    // Get the first script node
    const scriptNode = scriptNodes[0];

    // Extract text content from script node
    const textNodes = scriptNode.childNodes.filter(
      (node) => node.nodeName === '#text'
    );
    const scriptContent = textNodes.map((node) => node.value).join('');

    if (!scriptContent.trim()) {
      debug(`Empty ${scriptType} script found`);
      return null;
    }

    // Parse helper functions from script content
    const functions = parseHelperFunctions(scriptContent);

    return {
      code: scriptContent,
      functions,
      sourceLocation: {
        file: '', // Will be set by caller
        line: getScriptLineNumber(document, scriptNode),
        column: 1,
        offset: getScriptOffset(document, scriptNode),
      },
    };
  } catch (error) {
    throw createMorphError(
      `Failed to extract ${scriptType} content: ${error.message}`,
      '',
      null,
      ErrorCodes.SCRIPT_ERROR
    );
  }
}

/**
 * Parse helper functions from script content
 * @param {string} scriptContent - JavaScript code
 * @returns {Object<string,Function>} Parsed helper functions
 */
function parseHelperFunctions(scriptContent) {
  const functions = {};

  try {
    // Use Function constructor to parse the script
    // This is a simplified approach - in production you'd use a proper JS parser
    const functionRegex =
      /(?:function\s+(\w+)\s*\([^)]*\)\s*\{|(?:const|let|var)\s+(\w+)\s*=\s*(?:function\s*\([^)]*\)\s*\{)|([^=]+)\s*=>\s*\{)/g;
    let match;

    while ((match = functionRegex.exec(scriptContent)) !== null) {
      const functionName = match[1] || match[2];

      try {
        // Extract function body (simplified)
        const functionStart = scriptContent.indexOf(match[0]);
        const functionBody = extractFunctionBody(
          scriptContent,
          functionStart + match[0].length
        );

        // Create function from body
        const func = new Function('return ' + functionBody);
        functions[functionName] = func;

        debug(`Parsed helper function: ${functionName}`);
      } catch (parseError) {
        warn(`Failed to parse function ${functionName}: ${parseError.message}`);
      }
    }
  } catch (error) {
    warn(`Error parsing helper functions: ${error.message}`);
  }

  return functions;
}

/**
 * Extract function body from script content
 * @param {string} scriptContent - Full script content
 * @param {number} startIndex - Start of function body
 * @returns {string} Function body
 */
function extractFunctionBody(scriptContent, startIndex) {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let endIndex = startIndex;

  for (let i = startIndex; i < scriptContent.length; i++) {
    const char = scriptContent[i];

    // Handle string literals
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (
      inString &&
      char === stringChar &&
      scriptContent[i - 1] !== '\\'
    ) {
      inString = false;
    }

    // Count braces outside of strings
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
  }

  return scriptContent.substring(startIndex, endIndex).trim();
}

/**
 * Get line number of script node
 * @param {import('./types/processing.js').Document} document - Parsed document
 * @param {import('./types/processing.js').Node} scriptNode - Script node
 * @returns {number} Line number
 */
function getScriptLineNumber(document, scriptNode) {
  // This is a simplified approach
  // In practice, you'd use the AST location information
  const allText = documentToString(document);
  const scriptText = nodeToString(scriptNode);
  const scriptIndex = allText.indexOf(scriptText);

  if (scriptIndex === -1) {
    return 1;
  }

  return allText.substring(0, scriptIndex).split('\n').length + 1;
}

/**
 * Get offset of script node
 * @param {import('./types/processing.js').Document} document - Parsed document
 * @param {import('./types/processing.js').Node} scriptNode - Script node
 * @returns {number} Character offset
 */
function getScriptOffset(document, scriptNode) {
  const allText = documentToString(document);
  const scriptText = nodeToString(scriptNode);

  return allText.indexOf(scriptText);
}

/**
 * Convert document to string (simplified)
 * @param {import('./types/processing.js').Document} document - Parsed document
 * @returns {string} String representation
 */
function documentToString(document) {
  return document.childNodes.map((node) => nodeToString(node)).join('');
}

/**
 * Convert node to string (simplified)
 * @param {import('./types/processing.js').Node} node - AST node
 * @returns {string} String representation
 */
function nodeToString(node) {
  if (node.nodeName === '#text') {
    return node.value;
  } else if (node.nodeName === '#comment') {
    return `<!--${node.data}-->`;
  } else {
    const attrs = node.attrs
      ? node.attrs.map((attr) => `${attr.name}="${attr.value}"`).join(' ')
      : '';
    const childContent = node.childNodes
      ? node.childNodes.map((child) => nodeToString(child)).join('')
      : '';
    return `<${node.nodeName}${attrs ? ' ' + attrs : ''}>${childContent}</${node.nodeName}>`;
  }
}

/**
 * Validate script content
 * @param {import('./types/processing.js').ScriptContent} script - Script content
 * @returns {boolean} Whether script is valid
 */
export function validateScriptContent(script) {
  if (!script) {
    return true; // No script is valid
  }

  const errors = [];

  // Check for syntax issues (simplified)
  if (script.code.includes('eval(')) {
    errors.push('Use of eval() is not recommended in helper functions');
  }

  if (script.code.includes('Function(')) {
    errors.push('Use of Function() constructor is not recommended');
  }

  if (
    script.code.includes('setTimeout(') ||
    script.code.includes('setInterval(')
  ) {
    errors.push('Async operations in helper functions may cause issues');
  }

  if (errors.length > 0) {
    warn(`Script validation warnings:\n${errors.join('\n')}`);
  }

  return errors.length === 0;
}
