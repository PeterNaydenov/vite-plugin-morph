/**
 * Script content extraction and processing
 * @fileoverview Extracts and processes JavaScript from <script> tags in morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError, ErrorCodes } from './errors.js';
import { debug, warn } from '../utils/logger.js';
import { Document, ScriptContent } from './types/processing.js';

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
 * Parse helper templates from script content
 * @param {string} scriptContent - JavaScript code
 * @returns {Object<string,string>} Parsed helper templates
 */
function parseHelperTemplates(scriptContent) {
  const templates = {};

  try {
    // Match const template declarations: const name = `template content`
    const templateRegex = /(?:const|let|var)\s+(\w+)\s*=\s*`([^`]+)`/g;
    let match;

    while ((match = templateRegex.exec(scriptContent)) !== null) {
      const templateName = match[1];
      const templateContent = match[2];

      // Remove surrounding quotes if present
      const cleanContent = templateContent.replace(
        /^['"]|['"](.+?)['"]$/g,
        '$1'
      );

      templates[templateName] = cleanContent;
      debug(`Parsed helper template: ${templateName}`);
    }
  } catch (error) {
    warn(`Error parsing helper templates: ${error.message}`);
  }

  return templates;
}

/**
 * Process script content to extract both functions and templates
 * @param {string} scriptContent - JavaScript code
 * @returns {ScriptContent} Processed script content
 */
export function processScriptContent(scriptContent) {
  // Parse helper functions
  const functions = parseHelperFunctions(scriptContent);

  // Parse helper templates
  const templates = parseHelperTemplates(scriptContent);

  return {
    code: scriptContent,
    functions,
    templates,
    sourceLocation: {
      file: '', // Will be set by caller
      line: 1,
      column: 1,
      offset: 0,
    },
  };
}
