/**
 * Script content extraction and processing
 * @fileoverview Extracts and processes JavaScript from <script> tags in morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { debug, warn } from '../utils/logger.js';

/**
 * Parse helper functions from script content
 * @param {string} scriptContent - JavaScript code
 * @returns {Object<string,Function>} Parsed helper functions
 */
function parseHelperFunctions(scriptContent) {
  const functions = {};

  try {
    // Match function declarations: function name() {}
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;

    while ((match = functionRegex.exec(scriptContent)) !== null) {
      const functionName = match[1];

      try {
        // Create a simple function placeholder for testing
        // In a real implementation, you'd parse the actual function body
        functions[functionName] = function () {
          return 'mock function';
        };
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
    // This regex specifically looks for template literals with backticks
    const templateRegex =
      /(?:const|let|var)\s+(\w+)\s*=\s*`([^`]*(?:\\.[^`]*)*)`/g;
    let match;

    while ((match = templateRegex.exec(scriptContent)) !== null) {
      const templateName = match[1];
      const templateContent = match[2];

      // Check if template is well-formed HTML
      if (isWellFormedTemplate(templateContent)) {
        templates[templateName] = templateContent;
        debug(`Parsed helper template: ${templateName}`);
      }
    }
  } catch (error) {
    warn(`Error parsing helper templates: ${error.message}`);
  }

  return templates;
}

/**
 * Check if template content is well-formed
 * @param {string} templateContent - Template content to check
 * @returns {boolean} Whether template is well-formed
 */
function isWellFormedTemplate(templateContent) {
  // Empty templates are allowed
  if (templateContent.trim() === '') {
    return true;
  }

  // Must contain placeholders or HTML tags to be considered a template
  if (!templateContent.includes('{{') && !/<[^>]+>/.test(templateContent)) {
    return false;
  }

  // Basic HTML well-formedness check for templates with tags
  if (/<[^>]+>/.test(templateContent)) {
    // Simple check: count opening vs closing tags
    const openTags = (templateContent.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (templateContent.match(/<\/[^>]+>/g) || []).length;

    // Allow self-closing tags
    const selfClosingTags = (templateContent.match(/<[^>]*\/>/g) || []).length;

    return openTags === closeTags + selfClosingTags;
  }

  return true;
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
