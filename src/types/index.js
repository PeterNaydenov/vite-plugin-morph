/**
 * JSDoc type definitions for Vite Morph Plugin
 * @fileoverview TypeScript-compatible type definitions for JavaScript implementation
 * @author Peter Naydenov
 * @version 0.0.7
 */

/**
 * Plugin configuration options
 * @typedef {Object} MorphPluginOptions
 * @property {Object} [globalCSS] - Global CSS configuration
 * @property {string} globalCSS.directory - Directory containing global CSS files with variables
 * @property {string[]} [globalCSS.include] - File patterns to include, defaults to array of patterns
 * @property {string[]} [globalCSS.exclude] - File patterns to exclude, defaults to []
 * @property {Object} [production] - Production optimization settings
 * @property {boolean} [production.removeHandshake=true] - Remove handshake data in production builds
 * @property {boolean} [production.minifyCSS=true] - Minify generated CSS
 * @property {Object} [development] - Development settings
 * @property {boolean} [development.sourceMaps=true] - Include source maps for debugging
 * @property {boolean} [development.hmr=true] - Enable hot module replacement
 * @property {Object} [errorHandling] - Error handling configuration
 * @property {Object} [css] - CSS processing configuration
 * @property {boolean} [css.enabled=true] - Enable CSS processing features
 * @property {Object} [css.postcss] - PostCSS configuration
 * @property {Object} [css.modules] - CSS modules configuration
 * @property {boolean} [css.modules.enabled=true] - Enable CSS modules for component scoping
 * @property {string} [css.modules.generateScopedName] - Scoped class name pattern
 * @property {Object} [css.layers] - CSS layers configuration
 * @property {boolean} [css.layers.enabled=true] - Enable CSS @layer for cascade control
 * @property {string[]} [css.layers.order] - Layer precedence order
 * @property {Object} [css.treeShaking] - CSS tree-shaking configuration
 * @property {boolean} [css.treeShaking.enabled=true] - Enable CSS tree-shaking
 * @property {Object} [css.bundling] - CSS bundling configuration
 * @property {boolean} [css.bundling.enabled=true] - Enable CSS bundling
 * @property {string} [css.bundling.outputDir] - CSS bundle output directory
 * @property {boolean} [errorHandling.failOnError=true] - Fail build on errors
 * @property {boolean} [errorHandling.showLocation=true] - Show detailed error locations
 * @property {number} [errorHandling.maxErrors=10] - Maximum number of errors to report
 */

/**
 * Parsed HTML document from parse5
 * @typedef {Object} Document
 * @property {string} nodeName - Node type name
 * @property {Object[]} attrs - Node attributes
 * @property {Object[]} childNodes - Child nodes
 */

/**
 * HTML AST node
 * @typedef {Object} Node
 * @property {string} nodeName - Node name
 * @property {Object[]} [attrs] - Node attributes
 * @property {Node[]} [childNodes] - Child nodes
 * @property {string} [value] - Node value (for text nodes)
 * @property {string} [data] - Node data (for comment nodes)
 */

/**
 * Source location information
 * @typedef {Object} SourceLocation
 * @property {string} file - File path
 * @property {number} line - Line number (1-based)
 * @property {number} column - Column number (1-based)
 * @property {number} offset - Character offset from start
 */

/**
 * Morph plugin error
 * @typedef {Object} MorphPluginError
 * @property {string} name - Error name
 * @property {string} message - Error message
 * @property {string} code - Error code
 * @property {SourceLocation} location - Error location
 * @property {string} filePath - File path
 * @property {string} severity - Error severity ('error' | 'warning' | 'info')
 * @property {Error} [originalError] - Original error object
 * @property {string} [stack] - Stack trace
 */

/**
 * Formatted error for file output
 * @typedef {Object} FormattedError
 * @property {string} message - Error message
 * @property {SourceLocation} location - Error location
 * @property {string} code - Error code
 * @property {string} [suggestion] - Suggested fix
 * @property {string} [documentation] - Documentation URL
 */

/**
 * Processing result from morph file
 * @typedef {Object} ProcessingResult
 * @property {string} code - Generated ES module code
 * @property {Object} [map] - Source map
 * @property {string} [cssExports] - CSS code (if any)
 * @property {string[]} [usedVariables] - CSS variables used in template
 * @property {Object} templateObject - Template object for morph library
 * @property {boolean} isCSSOnly - True if this is CSS-only .morph file
 * @property {number} processingTime - Processing time in milliseconds
 * @property {ProcessingMetadata} metadata - Processing metadata
 * @property {MorphPluginError[]} [errors] - Processing errors
 * @property {MorphPluginError[]} [warnings] - Processing warnings
 */

/**
 * Processing metadata
 * @typedef {Object} ProcessingMetadata
 * @property {number} processingTime - Processing time in milliseconds
 * @property {Object} components - Extracted components
 * @property {boolean} components.template - Has template content
 * @property {number} components.helpers - Number of helper functions/templates
 * @property {boolean} components.handshake - Has handshake content
 * @property {boolean} components.css - Has CSS content
 */

/**
 * Vite transform hook result
 * @typedef {Object} TransformResult
 * @property {string} code - Generated JavaScript code
 * @property {Object} [map] - Source map
 * @property {Object} [meta] - Additional metadata
 * @property {string} meta.type - Original file type ('morph')
 * @property {TransformWarning[]} [meta.warnings] - Processing warnings
 * @property {number} [meta.processingTime] - Processing time in milliseconds
 */

/**
 * Transform warning
 * @typedef {Object} TransformWarning
 * @property {string} message - Warning message
 * @property {SourceLocation} [location] - Warning location
 * @property {'info'|'warning'|'error'} severity - Warning severity
 */

/**
 * HMR context from Vite
 * @typedef {Object} HmrContext
 * @property {string} file - Changed file path
 * @property {number} timestamp - Change timestamp
 * @property {Object[]} modules - Affected modules
 * @property {Function} read - Function to read file content
 * @property {Object} server - Vite server instance
 */

/**
 * HMR result
 * @typedef {Object} HmrResult
 * @property {Object[]} modules - Modules to update
 * @property {HmrUpdate[]} updates - HMR updates to send
 */

/**
 * HMR update
 * @typedef {Object} HmrUpdate
 * @property {'js-update'|'css-update'|'custom'} type - Update type
 * @property {string} path - Module path
 * @property {number} timestamp - Update timestamp
 * @property {*} [customData] - Custom update data
 */

/**
 * CSS processing options
 * @typedef {Object} CSSProcessingOptions
 * @property {boolean} scopeClasses - Generate scoped class names
 * @property {boolean} sourceMaps - Include source maps
 * @property {boolean} minify - Minify output
 * @property {Function} [generateClassName] - Custom class name generator
 */

/**
 * CSS processing result
 * @typedef {Object} CSSProcessingResult
 * @property {string} css - Processed CSS code
 * @property {Record<string,string>} exports - CSS module exports
 * @property {Object} [map] - Source map
 * @property {string[]} usedVariables - Used global variables
 * @property {Record<string,string>} scopedClasses - Generated class names
 */

/**
 * Template compilation options
 * @typedef {Object} CompilationOptions
 * @property {boolean} includeHandshake - Include handshake in output
 * @property {boolean} optimize - Optimize for production
 * @property {boolean} sourceMaps - Generate source maps
 */

/**
 * Template compilation result
 * @typedef {Object} CompilationResult
 * @property {Function} renderFunction - Compiled render function
 * @property {string} sourceCode - Function source code
 * @property {Object} [map] - Source map
 * @property {CompilationMetadata} metadata - Compilation metadata
 */

/**
 * Template compilation metadata
 * @typedef {Object} CompilationMetadata
 * @property {number} compilationTime - Compilation time in milliseconds
 * @property {number} size - Function size in bytes
 * @property {boolean} handshakeIncluded - Handshake included
 * @property {string[]} helperFunctions - Helper functions used
 */

/**
 * Morph file object representation
 * @typedef {Object} MorphFile
 * @property {string} filePath - File path
 * @property {string} content - Raw file content
 * @property {Document} ast - Parsed HTML document
 * @property {TemplateContent} template - Extracted template content
 * @property {ScriptContent} [script] - Extracted script content
 * @property {StyleContent} [style] - Extracted style content
 * @property {HandshakeContent} [handshake] - Extracted handshake content
 * @property {boolean} isCSSOnly - True if this is CSS-only file
 * @property {Object} metadata - File metadata
 * @property {number} metadata.lastModified - Last modified timestamp
 * @property {number} metadata.processedAt - Processing timestamp
 * @property {string} metadata.hash - Content hash
 * @property {string[]} metadata.dependencies - File dependencies
 * @property {string[]} metadata.dependents - File dependents
 */

/**
 * Style content extraction result
 * @typedef {Object} StyleContent
 * @property {string} css - Raw CSS content
 * @property {Record<string,string>} [scopedClasses] - Generated scoped class names
 */

/**
 * Handshake content extraction result
 * @typedef {Object} HandshakeContent
 * @property {Object} data - Parsed JSON handshake data
 */

/**
 * Template content extraction result
 * @typedef {Object} TemplateContent
 * @property {string} html - Extracted HTML template
 * @property {Object[]} placeholders - Array of placeholder objects
 * @property {SourceLocation} sourceLocation - Source location information
 */

/**
 * Script content extraction result
 * @typedef {Object} ScriptContent
 * @property {string} code - JavaScript code
 * @property {Object<string,Function>} functions - Parsed helper functions
 * @property {Object<string,string>} templates - Parsed helper templates
 * @property {SourceLocation} sourceLocation - Source location information
 */

// Types are available through JSDoc typedefs above
// No runtime exports needed for type definitions
