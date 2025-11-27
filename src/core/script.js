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

  if (!scriptContent) {
    return functions;
  }

  try {
    const ast = parse(scriptContent, {
      sourceType: 'module',
      plugins: ['jsx'],
    });

    // Try @babel/traverse first, fallback to basic parsing if it fails
    try {
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
          const { node: varNode } = path;
          if (
            varNode.id.type === 'Identifier' &&
            (varNode.init?.type === 'ArrowFunctionExpression' ||
              varNode.init?.type === 'FunctionExpression')
          ) {
            const functionName = varNode.id.name;
            try {
              // Extract the function code
              const start = varNode.init.start;
              const end = varNode.init.end;
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
    } catch (traverseError) {
      warn(
        `@babel/traverse failed: ${traverseError.message}. Using regex fallback.`
      );

      // Enhanced regex fallback for functions and templates
      try {
        // Split script into individual statements/lines for processing
        const lines = scriptContent.split('\n');
        let currentStatement = '';
        let inMultilineConstruct = false;
        let constructType = ''; // 'template', 'function', 'arrow'

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          currentStatement += (currentStatement ? '\n' : '') + lines[i];

          // Track multiline constructs
          if (!inMultilineConstruct) {
            if (line.startsWith('const ') && line.includes('`')) {
              inMultilineConstruct = true;
              constructType = 'template';
            } else if (line.startsWith('function ')) {
              inMultilineConstruct = true;
              constructType = 'function';
            } else if (line.startsWith('const ') && line.includes('=>')) {
              inMultilineConstruct = true;
              constructType = 'arrow';
            }
          }

          // Check if statement is complete
          let complete = false;
          if (inMultilineConstruct) {
            if (
              constructType === 'template' &&
              line.includes('`') &&
              !line.endsWith('\\`')
            ) {
              complete = true;
            } else if (constructType === 'function' && line.includes('}')) {
              // Count braces to ensure function is complete
              const openBraces = (currentStatement.match(/\{/g) || []).length;
              const closeBraces = (currentStatement.match(/\}/g) || []).length;
              // For functions, we expect one more closing brace than opening (the function body)
              if (openBraces > 0 && closeBraces >= openBraces) {
                complete = true;
              }
            } else if (constructType === 'arrow' && !line.endsWith(',')) {
              complete = true;
            }
          } else if (currentStatement.trim().endsWith(';')) {
            complete = true;
          }

          if (complete) {
            // Process the complete statement
            const statement = currentStatement.trim();

            try {
              // Extract function declarations
              if (statement.startsWith('function ')) {
                // Remove trailing comments that might break eval
                const cleanStatement = statement
                  .replace(/\/\/.*$/gm, '')
                  .trim();
                const funcMatch = cleanStatement.match(/function\s+(\w+)/);
                if (funcMatch) {
                  const funcName = funcMatch[1];
                  try {
                    functions[funcName] = eval('(' + cleanStatement + ')');
                    debug(`Parsed function declaration: ${funcName}`);
                  } catch (funcError) {
                    warn(
                      `Function declaration eval failed for ${funcName}: ${funcError.message}`
                    );
                  }
                }
              }
              // Extract const arrow functions
              else if (
                statement.startsWith('const ') &&
                statement.includes('=>')
              ) {
                const constMatch = statement.match(
                  /const\s+(\w+)\s*=\s*(.+);?$/
                );
                if (constMatch) {
                  const varName = constMatch[1];
                  const varValue = constMatch[2].trim();
                  try {
                    functions[varName] = eval('(' + varValue + ')');
                    debug(`Parsed arrow function: ${varName}`);
                  } catch (funcError) {
                    warn(
                      `Arrow function eval failed for ${varName}: ${funcError.message}`
                    );
                  }
                }
              }
            } catch (statementError) {
              warn(`Failed to parse statement: ${statementError.message}`);
            }

            // Reset for next statement
            currentStatement = '';
            inMultilineConstruct = false;
            constructType = '';
          }
        }
      } catch (fallbackError) {
        warn(`Enhanced regex fallback failed: ${fallbackError.message}`);
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
      sourceType: 'module',
      plugins: ['jsx'],
    });

    // Try @babel/traverse first, fallback if it fails
    try {
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
                    // For arrow functions, check if they return template literals
                    if (node.init.body?.type === 'TemplateLiteral') {
                      // Arrow function returning template literal - treat as template
                      const literalContent = node.init.body.quasis
                        .map((q) => q.value.raw)
                        .join('');
                      if (isWellFormedTemplate(literalContent)) {
                        templates[templateName] = literalContent;
                        debug(`Parsed helper template: ${templateName}`);
                      }
                    }
                    // Other arrow functions are handled as functions
                  } else {
                    // Handle non-function expressions as templates
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
    } catch (traverseError) {
      warn(
        `@babel/traverse failed in template parsing: ${traverseError.message}. Using regex fallback.`
      );

      // Simple regex fallback for template literals
      try {
        // Match all const template declarations
        const templateRegex = /const\s+(\w+)\s*=\s*`([\s\S]*?)`;?\s*/g;
        let match;
        while ((match = templateRegex.exec(scriptContent)) !== null) {
          const varName = match[1];
          const templateContent = match[2];
          if (isWellFormedTemplate(templateContent)) {
            templates[varName] = templateContent;
            debug(`Parsed template: ${varName}`);
          }
        }
      } catch (fallbackError) {
        warn(`Template regex fallback failed: ${fallbackError.message}`);
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
  if (!scriptContent) {
    console.log('[vite-plugin-morph] No script content to process');
    return {
      code: '',
      functions: {},
      templates: {},
      sourceLocation: {
        file: '',
        line: 1,
        column: 1,
        offset: 0,
      },
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
    sourceLocation: {
      file: '',
      line: 1,
      column: 1,
      offset: 0,
    },
  };
}
