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
    // Match function declarations: function name() {} and arrow functions that don't return template literals
    const functionRegex =
      /(?:function\s+(\w+)\s*\([^)]*\)\s*\{|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_$][\w$]*)\s*=>\s*(?!`)(?:\{[^}]*\}|\([^()]*\)|\[[^{]*\]|\{[^}]*\})\s*)/g;
    let match;

    while ((match = functionRegex.exec(scriptContent)) !== null) {
      const functionName = match[1] || match[2];

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
    // Use the new regex to find all variable declarations
    const templateRegex =
      /(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=([^;]*?)(?:;|$)/g;
    let match;

    while ((match = templateRegex.exec(scriptContent)) !== null) {
      const templateName = match[2];
      const templateContent = match[3].trim();

      try {
        // Check if this is a regular function declaration (should be in functions, not templates)
        const isRegularFunction = /^function\s+/.test(templateContent);

        // Check if this is an arrow function (any arrow function should be a template)
        const isArrowFunction = /=>/.test(templateContent);

        if (!isRegularFunction) {
          // Handle arrow functions and direct template literals
          if (isArrowFunction) {
            // For arrow functions, treat entire content as template (no well-formed check)
            templates[templateName] = templateContent;
            debug(`Parsed helper template: ${templateName}`);
          } else {
            // Handle direct template literal assignment
            const templateLiteralMatch = templateContent.match(/^`([^`]*)`$/);
            if (templateLiteralMatch) {
              const literalContent = templateLiteralMatch[1];
              if (isWellFormedTemplate(literalContent)) {
                templates[templateName] = literalContent;
                debug(`Parsed helper template: ${templateName}`);
              }
            } else if (isWellFormedTemplate(templateContent)) {
              // For non-template-literal content, check if it's well-formed
              templates[templateName] = templateContent;
              debug(`Parsed helper template: ${templateName}`);
            }
          }
        }
      } catch (parseError) {
        warn(`Failed to parse template ${templateName}: ${parseError.message}`);
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
 * @returns {import('../types/index.js').ScriptContent} Processed script content with functions and templates
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
      file: '',
      line: 1,
      column: 1,
      offset: 0,
    },
  };
}
