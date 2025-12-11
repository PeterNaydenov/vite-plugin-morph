/**
 * Script content extraction and processing
 * @fileoverview Extracts and processes JavaScript from <script> tags in morph files
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { parse } from 'acorn';
import { simple as walk } from 'acorn-walk';
import { debug, warn } from '../utils/logger.js';

/**
 * Parse helper functions from script content using AST
 * @param {string} scriptContent - JavaScript code
 * @returns {Object<string,Function>} Parsed helper functions
 */
function parseHelperFunctions(scriptContent) {
  const functions = {};

  if (!scriptContent) {
    return functions;
  }

  try {
    const ast = parse(scriptContent, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowImportExportEverywhere: false,
    });

    // Only process top-level declarations
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
        try {
          // Extract the function code
          const start = node.start;
          const end = node.end;
          let functionCode = scriptContent.slice(start, end).trim();
          // Remove comments that might be included in the AST range
          functionCode = functionCode
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '')
            .trim();
          functions[node.id.name] = eval('(' + functionCode + ')');
          debug(`Parsed helper function: ${node.id.name}`);
        } catch (parseError) {
          warn(
            `Failed to parse function ${node.id.name}: ${parseError.message}`
          );
        }
      } else if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier') {
            const varName = declarator.id.name;

            if (declarator.init?.type === 'FunctionExpression') {
              // Function expression - treat as function helper
              try {
                const start = declarator.init.start;
                const end = declarator.init.end;
                let functionCode = scriptContent.slice(start, end).trim();
                // Remove comments that might be included in the AST range
                functionCode = functionCode
                  .replace(/\/\*[\s\S]*?\*\//g, '')
                  .replace(/\/\/.*$/gm, '')
                  .trim();
                functions[varName] = eval('(' + functionCode + ')');
                debug(`Parsed helper function: ${varName}`);
              } catch (parseError) {
                warn(
                  `Failed to parse function ${varName}: ${parseError.message}`
                );
              }
            } else if (
              declarator.init?.type === 'ArrowFunctionExpression' &&
              declarator.init.body?.type !== 'TemplateLiteral'
            ) {
              // Arrow function that doesn't return a template literal - treat as function helper
              try {
                const start = declarator.init.start;
                const end = declarator.init.end;
                let functionCode = scriptContent.slice(start, end).trim();
                // Remove comments that might be included in the AST range
                functionCode = functionCode
                  .replace(/\/\*[\s\S]*?\*\//g, '')
                  .replace(/\/\/.*$/gm, '')
                  .trim();
                functions[varName] = eval('(' + functionCode + ')');
                debug(`Parsed helper function: ${varName}`);
              } catch (parseError) {
                warn(
                  `Failed to parse function ${varName}: ${parseError.message}`
                );
              }
            }
          }
        }
      }
    }
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

  if (!scriptContent) {
    return templates;
  }

  try {
    const ast = parse(scriptContent, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowImportExportEverywhere: false,
    });

    // Only process top-level declarations
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier') {
            const templateName = declarator.id.name;
            let templateContent = null;

            if (declarator.init) {
              // Get the original code for this node
              const start = declarator.init.start;
              const end = declarator.init.end;
              templateContent = scriptContent.slice(start, end).trim();
            }

            if (templateContent) {
              try {
                // Handle direct template literals
                if (declarator.init?.type === 'TemplateLiteral') {
                  // Direct template literal
                  const literalContent = declarator.init.quasis
                    .map((q) => q.value.raw)
                    .join('');
                  if (isWellFormedTemplate(literalContent)) {
                    templates[templateName] = literalContent;
                    debug(`Parsed template: ${templateName}`);
                  }
                }
                // Handle string literals
                else if (
                  declarator.init?.type === 'Literal' &&
                  typeof declarator.init.value === 'string'
                ) {
                  // String literal - treat as DEFINITE template helper
                  const stringContent = declarator.init.value;
                  templates[templateName] = stringContent;
                  debug(`Parsed string template: ${templateName}`);
                }
                // Handle arrow functions that return template literals
                else if (
                  declarator.init?.type === 'ArrowFunctionExpression' &&
                  declarator.init.body?.type === 'TemplateLiteral'
                ) {
                  // Arrow function returning template literal - treat as template
                  const literalContent = declarator.init.body.quasis
                    .map((q) => q.value.raw)
                    .join('');
                  if (isWellFormedTemplate(literalContent)) {
                    templates[templateName] = literalContent;
                    debug(`Parsed arrow template: ${templateName}`);
                  }
                }
              } catch (parseError) {
                warn(
                  `Failed to parse template ${templateName}: ${parseError.message}`
                );
              }
            }
          }
        }
      }
    }
  } catch (error) {
    warn(`Error parsing helper templates: ${error.message}`);
  }

  return templates;
}

/**
 * Check if template content is well-formed
 * @param {string} templateContent - Template content to validate
 * @returns {boolean} True if template is well-formed
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

  // Basic check for templates with HTML tags - be more permissive
  if (/<[^>]+>/.test(templateContent)) {
    // Simple check: ensure roughly balanced tags
    const openTags = (templateContent.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (templateContent.match(/<\/[^>]+>/g) || []).length;
    const selfClosingTags =
      (templateContent.match(/<[^>]*\/>/g) || []).length +
      (templateContent.match(/<input[^>]*>/gi) || []).length +
      (templateContent.match(/<br[^>]*>/gi) || []).length +
      (templateContent.match(/<img[^>]*>/gi) || []).length +
      (templateContent.match(/<hr[^>]*>/gi) || []).length;

    // Require exact tag balance (allowing some tolerance for self-closing tags)
    return openTags === closeTags + selfClosingTags;
  }

  return true;
}

/**
 * Process script content and extract helpers
 * @param {string} scriptContent - JavaScript code from script tag
 * @returns {import('../types/index.js').ScriptContent} Script content with helpers
 */
export function processScriptContent(scriptContent) {
  if (!scriptContent) {
    console.log('[vite-plugin-morph] No script content to process');
    return {
      code: '',
      functions: {},
      templates: {},
    };
  }

  console.log(
    '[vite-plugin-morph] Processing script content:',
    scriptContent.substring(0, 200) + '...'
  );

  // Parse helper functions
  const functions = parseHelperFunctions(scriptContent);
  console.log('[vite-plugin-morph] Parsed functions:', Object.keys(functions));

  // Parse helper templates
  const templates = parseHelperTemplates(scriptContent);
  console.log('[vite-plugin-morph] Parsed templates:', Object.keys(templates));

  return {
    code: scriptContent,
    functions,
    templates,
  };
}
