/**
 * JSDoc type definitions for Vite Morph Plugin
 * @fileoverview TypeScript-compatible type definitions for JavaScript implementation
 * @author Peter Naydenov
 * @version 0.0.10
 */

/**
 * Plugin configuration options
 */
export interface MorphPluginOptions {
  /** Global CSS configuration */
  globalCSS?: {
    /** Directory containing global CSS files with variables */
    directory: string;
    /** File patterns to include */
    include?: string[];
    /** File patterns to exclude */
    exclude?: string[];
  };
  /** Production optimization settings */
  production?: {
    /** Remove handshake data in production builds */
    removeHandshake?: boolean;
    /** Minify generated CSS */
    minifyCSS?: boolean;
  };
  /** Development settings */
  development?: {
    /** Include source maps for debugging */
    sourceMaps?: boolean;
    /** Enable hot module replacement */
    hmr?: boolean;
    /** Enable CSS hot reloading */
    cssHmr?: boolean;
  };
  /** Error handling configuration */
  errorHandling?: {
    /** Fail build on errors */
    failOnError?: boolean;
    /** Show detailed error locations */
    showLocation?: boolean;
    /** Maximum number of errors to report */
    maxErrors?: number;
    /** Enhanced CSS error reporting */
    cssErrors?: boolean;
  };
  /** CSS processing configuration */
  css?: {
    /** Enable CSS processing features */
    enabled?: boolean;
    /** PostCSS configuration */
    postcss?: {
      /** Enable autoprefixer */
      autoprefixer?: boolean;
      /** Enable CSS minification */
      minify?: boolean;
      /** Generate source maps */
      sourceMaps?: boolean;
    };
    /** CSS modules configuration */
    modules?: {
      /** Enable CSS modules for component scoping */
      enabled?: boolean;
      /** Scoped class name pattern */
      generateScopedName?: string;
    };
    /** CSS layers configuration */
    layers?: {
      /** Enable CSS @layer for cascade control */
      enabled?: boolean;
      /** Layer precedence order */
      order?: string[];
    };
    /** CSS tree-shaking configuration */
    treeShaking?: {
      /** Enable CSS tree-shaking */
      enabled?: boolean;
    };
    /** CSS bundling configuration */
    bundling?: {
      /** Enable CSS bundling */
      enabled?: boolean;
      /** CSS bundle output directory */
      outputDir?: string;
    };
    /** CSS chunking configuration */
    chunking?: {
      /** Enable CSS chunking for large bundles */
      enabled?: boolean;
      /** Chunking strategy ('size', 'category', 'manual') */
      strategy?: string;
      /** Maximum chunk size in bytes */
      maxChunkSize?: number;
    };
    /** CSS output directory */
    outputDir?: string;
    /** CSS debugging configuration */
    debug?: {
      /** Enable CSS debugging */
      enabled?: boolean;
      /** Enable verbose logging */
      verbose?: boolean;
      /** Show source map information */
      showSourceMaps?: boolean;
    };
  };
}

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
 * @property {Object} [cssSourceMap] - CSS source map
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
