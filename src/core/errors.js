/**
 * Error handling and reporting system for morph plugin
 * @fileoverview Provides error creation, formatting, and management utilities
 * @author Peter Naydenov
 * @version 0.0.10
 */

/**
 * Create a morph plugin error with enhanced information
 * @param {Error|string} originalError - Original error or message
 * @param {string} filePath - File path where error occurred
 * @param {import('../types/index.d.ts').SourceLocation} [location] - Error location in file
 * @param {string} [code] - Error code
 * @returns {import('../types/index.d.ts').MorphPluginError} Enhanced error object
 */
export function createMorphError(
  originalError,
  filePath,
  location = null,
  code = 'UNKNOWN_ERROR'
) {
  const message =
    typeof originalError === 'string'
      ? originalError
      : originalError?.message || originalError?.toString() || 'Unknown error';

  const error = new Error(message);
  error.name = 'MorphPluginError';
  error.code = code;
  error.location = location || {
    file: filePath,
    line: 1,
    column: 1,
    offset: 0,
  };
  error.filePath = filePath;
  error.severity = 'error';
  error.originalError =
    typeof originalError === 'object' ? originalError : undefined;
  error.stack =
    typeof originalError === 'object' ? originalError.stack : error.stack;

  return error;
}

/**
 * Create a morph plugin warning
 * @param {string} message - Warning message
 * @param {string} filePath - File path
 * @param {import('../types/index.d.ts').SourceLocation} [location] - Warning location
 * @param {string} [code] - Error code
 * @returns {import('../types/index.d.ts').MorphPluginError} Warning object
 */
export function createMorphWarning(
  message,
  filePath,
  location = null,
  code = 'WARNING'
) {
  return {
    name: 'MorphPluginWarning',
    message,
    code,
    location: location || { file: filePath, line: 1, column: 1, offset: 0 },
    filePath,
    severity: 'warning',
  };
}

/**
 * Format error for console output
 * @param {import('../types/index.d.ts').MorphPluginError} error - Error object
 * @returns {string} Formatted error message
 */
export function formatError(error) {
  let formatted = `\n❌ ${error.code}: ${error.message}`;

  if (error.location && error.location.file) {
    formatted += `\n   📍 Location: ${error.location.file}:${error.location.line}:${error.location.column}`;
  }

  if (error.location && error.location.offset) {
    formatted += `\n   📍 Offset: ${error.location.offset}`;
  }

  if (error.originalError && error.originalError.stack) {
    formatted += `\n   📋 Stack trace available`;
  }

  return formatted;
}

/**
 * Format error for file output
 * @param {import('../types/index.d.ts').MorphPluginError} error - Error object
 * @returns {import('../types/index.d.ts').FormattedError} Formatted error for files
 */
export function formatErrorForFile(error) {
  return {
    message: error.message,
    location: error.location,
    code: error.code,
    suggestion: getSuggestion(error.code),
    documentation: getDocumentation(error.code),
  };
}

/**
 * Get suggestion for error code
 * @param {string} code - Error code
 * @returns {string|undefined} Suggestion message
 */
function getSuggestion(code) {
  const suggestions = {
    PARSE_ERROR: 'Check HTML syntax and ensure all tags are properly closed',
    CSS_PARSE_ERROR: 'Validate CSS syntax and check for missing semicolons',
    JSON_PARSE_ERROR: 'Ensure JSON is valid and properly escaped',
    TEMPLATE_ERROR: 'Check morph placeholder syntax: {{ data : action }}',
    SCRIPT_ERROR: 'Validate JavaScript syntax in script tags',
    CONFIG_ERROR: 'Check plugin configuration in vite.config.js',
    MALFORMED_TEMPLATE:
      'Ensure template has proper HTML structure and valid morph syntax',
    INVALID_TEMPLATE_TAG: 'Template tags must be properly opened and closed',
    MISSING_TEMPLATE: 'No template content found in morph file',
    INVALID_SCRIPT_TAG: 'Script tags must have proper opening and closing tags',
    INVALID_STYLE_TAG: 'Style tags must have proper opening and closing tags',
  };

  return suggestions[code];
}

/**
 * Get documentation URL for error code
 * @param {string} code - Error code
 * @returns {string|undefined} Documentation URL
 */
function getDocumentation(code) {
  const docs = {
    PARSE_ERROR:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#parse-errors',
    CSS_PARSE_ERROR:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#css-errors',
    JSON_PARSE_ERROR:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#json-errors',
    TEMPLATE_ERROR:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#template-errors',
    SCRIPT_ERROR:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#script-errors',
    CONFIG_ERROR:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/configuration.md',
    MALFORMED_TEMPLATE:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#malformed-templates',
    INVALID_TEMPLATE_TAG:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#template-tags',
    MISSING_TEMPLATE:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#missing-templates',
    INVALID_SCRIPT_TAG:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#script-tags',
    INVALID_STYLE_TAG:
      'https://github.com/your-repo/vite-plugin-morph/blob/main/docs/troubleshooting.md#style-tags',
  };

  return docs[code];
}

/**
 * Error codes enumeration
 * @readonly
 * @enum {string}
 */
export const ErrorCodes = {
  PARSE_ERROR: 'PARSE_ERROR',
  CSS_PARSE_ERROR: 'CSS_PARSE_ERROR',
  CSS_PROCESSING_ERROR: 'CSS_PROCESSING_ERROR',
  CSS_SCOPING_ERROR: 'CSS_SCOPING_ERROR',
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  SCRIPT_ERROR: 'SCRIPT_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  MALFORMED_TEMPLATE: 'MALFORMED_TEMPLATE',
  INVALID_TEMPLATE_TAG: 'INVALID_TEMPLATE_TAG',
  MISSING_TEMPLATE: 'MISSING_TEMPLATE',
  INVALID_SCRIPT_TAG: 'INVALID_SCRIPT_TAG',
  INVALID_STYLE_TAG: 'INVALID_STYLE_TAG',
};

/**
 * Create malformed template error
 * @param {string} filePath - File path
 * @param {import('./../types/index.d.ts').SourceLocation} [location] - Error location
 * @param {string} [details] - Additional error details
 * @returns {import('./../types/index.d.ts').MorphPluginError} Malformed template error
 */
export function createMalformedTemplateError(
  filePath,
  location = null,
  details = ''
) {
  const message = details
    ? `Malformed template: ${details}`
    : 'Template structure is malformed or contains invalid syntax';

  return createMorphError(
    message,
    filePath,
    location,
    ErrorCodes.MALFORMED_TEMPLATE
  );
}

/**
 * Create invalid template tag error
 * @param {string} filePath - File path
 * @param {import('./../types/index.d.ts').SourceLocation} [location] - Error location
 * @param {string} [tagName] - Name of the invalid tag
 * @returns {import('./../types/index.d.ts').MorphPluginError} Invalid template tag error
 */
export function createInvalidTemplateTagError(
  filePath,
  location = null,
  tagName = ''
) {
  const message = tagName
    ? `Invalid template tag: <${tagName}>`
    : 'Invalid template tag found';

  return createMorphError(
    message,
    filePath,
    location,
    ErrorCodes.INVALID_TEMPLATE_TAG
  );
}

/**
 * Create missing template error
 * @param {string} filePath - File path
 * @returns {import('./../types/index.d.ts').MorphPluginError} Missing template error
 */
export function createMissingTemplateError(filePath) {
  return createMorphError(
    'No template content found in morph file',
    filePath,
    null,
    ErrorCodes.MISSING_TEMPLATE
  );
}

/**
 * Create invalid script tag error
 * @param {string} filePath - File path
 * @param {import('./../types/index.d.ts').SourceLocation} [location] - Error location
 * @returns {import('./../types/index.d.ts').MorphPluginError} Invalid script tag error
 */
export function createInvalidScriptTagError(filePath, location = null) {
  return createMorphError(
    'Script tag must have proper opening and closing tags',
    filePath,
    location,
    ErrorCodes.INVALID_SCRIPT_TAG
  );
}

/**
 * Create invalid style tag error
 * @param {string} filePath - File path
 * @param {import('./../types/index.d.ts').SourceLocation} [location] - Error location
 * @returns {import('./../types/index.d.ts').MorphPluginError} Invalid style tag error
 */
export function createInvalidStyleTagError(filePath, location = null) {
  return createMorphError(
    'Style tag must have proper opening and closing tags',
    filePath,
    location,
    ErrorCodes.INVALID_STYLE_TAG
  );
}

/**
 * Create CSS processing error
 * @param {string} message - Error message
 * @param {string} filePath - File path
 * @param {import('./../types/index.d.ts').SourceLocation} [location] - Error location
 * @param {Error} [originalError] - Original PostCSS error
 * @returns {import('./../types/index.d.ts').MorphPluginError} CSS processing error
 */
export function createCssProcessingError(
  message,
  filePath,
  location = null,
  originalError = null
) {
  const enhancedMessage = `CSS processing failed: ${message}`;
  const error = createMorphError(
    enhancedMessage,
    filePath,
    location,
    ErrorCodes.CSS_PROCESSING_ERROR
  );
  error.originalError = originalError;
  return error;
}

/**
 * Create CSS scoping error
 * @param {string} message - Error message
 * @param {string} filePath - File path
 * @param {import('./../types/index.d.ts').SourceLocation} [location] - Error location
 * @returns {import('./../types/index.d.ts').MorphPluginError} CSS scoping error
 */
export function createCssScopingError(message, filePath, location = null) {
  const enhancedMessage = `CSS scoping failed: ${message}`;
  return createMorphError(
    enhancedMessage,
    filePath,
    location,
    ErrorCodes.CSS_SCOPING_ERROR
  );
}

/**
 * Extract location from PostCSS error
 * @param {Error} postcssError - PostCSS error object
 * @param {string} filePath - File path
 * @returns {import('./../types/index.d.ts').SourceLocation} Extracted location
 */
export function extractLocationFromPostCssError(postcssError, filePath) {
  if (postcssError && postcssError.source && postcssError.line) {
    return {
      file: filePath,
      line: postcssError.line,
      column: postcssError.column || 1,
      offset: postcssError.source.start ? postcssError.source.start.offset : 0,
    };
  }

  return {
    file: filePath,
    line: 1,
    column: 1,
    offset: 0,
  };
}
