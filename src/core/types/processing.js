/**
 * Processing pipeline type definitions
 * @fileoverview Defines types for morph file processing pipeline
 * @author Peter Naydenov
 * @version 1.0.0
 */

/**
 * Script content extraction result
 * @typedef {Object} ScriptContent
 */
export class ScriptContent {
  /**
   * Creates a new script content result
   * @param {string} code - JavaScript code
   * @param {Object<string,Function>} functions - Parsed helper functions
   * @param {import('./types/processing.js').SourceLocation} [location] - Source location information
   */
  constructor(code, functions = {}, sourceLocation = {}) {
    this.code = code;
    this.functions = functions;
    this.sourceLocation = sourceLocation || {
      file: '',
      line: 1,
      column: 1,
      offset: 0,
    };
  }
}

/**
 * Helper template extraction result
 * @typedef {Object} TemplateContent
 */
export class TemplateContent {
  /**
   * Creates a new template content result
   * @param {Object<string,string>} templates - Parsed helper templates
   */
  constructor(templates = {}) {
    this.templates = templates;
  }
}

/**
 * Morph plugin error with enhanced information
 * @typedef {Error} MorphPluginError
 */
export class MorphPluginError extends Error {
  /**
   * Creates an enhanced morph plugin error
   * @param {Error|string} originalError - Original error or message
   * @param {import('./types/processing.js').SourceLocation} [location] - Error location in file
   * @param {string} [code] - Error code
   */
  constructor(
    originalError,
    filePath,
    location = null,
    code = 'UNKNOWN_ERROR'
  ) {
    super(originalError.message);
    this.filePath = filePath;
    this.location = location || {
      file: '',
      line: 1,
      column: 1,
      offset: 0,
    };
    this.code = code;
  }
}
