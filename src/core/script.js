/**
 * Script content extraction and processing
 * @fileoverview Extracts and processes JavaScript from <script> tags in morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { debug, warn } from '../utils/logger.js';

/**
 * Parse helper functions from script content using AST
 * @param {string} scriptContent - JavaScript code
 * @returns {Object<string,Function>} Parsed helper functions
 */
function parseHelperFunctions(scriptContent) {
  const functions = {};

  try {
    const ast = parse(scriptContent, {
      sourceType: 'module',
      plugins: ['jsx'],
    });

    traverse(ast, {
      FunctionDeclaration(path) {
        const { node } = path;
        if (node.id && node.id.name) {
          try {
            // Extract the function code
            const start = node.start;
            const end = node.end;
            const functionCode = scriptContent.slice(start, end).trim();
            functions[node.id.name] = eval('(' + functionCode + ')');
            debug(`Parsed helper function: ${node.id.name}`);
          } catch (parseError) {
            warn(
              `Failed to parse function ${node.id.name}: ${parseError.message}`
            );
          }
        }
      },

      VariableDeclarator(path) {
        const { node } = path;
        if (
          node.id.type === 'Identifier' &&
          (node.init?.type === 'ArrowFunctionExpression' ||
            node.init?.type === 'FunctionExpression')
        ) {
          const functionName = node.id.name;
          try {
            // Extract the function code
            const start = node.init.start;
            const end = node.init.end;
            const functionCode = scriptContent.slice(start, end).trim();
            functions[functionName] = eval('(' + functionCode + ')');
            debug(`Parsed helper function: ${functionName}`);
          } catch (parseError) {
            warn(
              `Failed to parse function ${functionName}: ${parseError.message}`
            );
          }
        }
      },
    });
  } catch (error) {
    warn(`Error parsing helper functions: ${error.message}`);
  }

  return functions;
}

/**
 * Parse helper templates from script content using AST
 * @param {string} scriptContent - JavaScript code
 * @returns {Object<string,string>} Parsed helper templates
 */
function parseHelperTemplates(scriptContent) {
  const templates = {};

  try {
    const ast = parse(scriptContent, {
      sourceType: 'module',
      plugins: ['jsx'],
    });

    traverse(ast, {
      VariableDeclarator(path) {
        const { node } = path;
        if (node.id.type === 'Identifier') {
          const templateName = node.id.name;
          let templateContent = null;

          if (node.init) {
            // Get the original code for this node
            const start = node.init.start;
            const end = node.init.end;
            templateContent = scriptContent.slice(start, end).trim();
          }

          if (templateContent) {
            try {
              // Skip regular function expressions (they're handled as functions)
              const isRegularFunction =
                node.init?.type === 'FunctionExpression';
              const isArrowFunction =
                node.init?.type === 'ArrowFunctionExpression';

              if (!isRegularFunction) {
                if (isArrowFunction) {
                  // For arrow functions, treat entire content as template
                  templates[templateName] = templateContent;
                  debug(`Parsed helper template: ${templateName}`);
                } else {
                  // Handle direct template literal assignment
                  if (node.init?.type === 'TemplateLiteral') {
                    // Extract raw content and handle empty templates
                    const literalContent = node.init.quasis
                      .map((q) => q.value.raw)
                      .join('');
                    if (isWellFormedTemplate(literalContent)) {
                      // Store the literal content directly
                      templates[templateName] = literalContent;
                      debug(`Parsed helper template: ${templateName}`);
                    }
                  } else if (isWellFormedTemplate(templateContent)) {
                    // For other expressions, check if they're well-formed templates
                    templates[templateName] = templateContent;
                    debug(`Parsed helper template: ${templateName}`);
                  }
                }
              }
            } catch (parseError) {
              warn(
                `Failed to parse template ${templateName}: ${parseError.message}`
              );
            }
          }
        }
      },
    });
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
