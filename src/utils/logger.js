/**
 * Logging utilities for morph plugin
 * @fileoverview Provides structured logging with different levels
 * @author Peter Naydenov
 * @version 1.0.0
 */

/**
 * Log levels
 * @readonly
 * @enum {string}
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Current logging configuration
 * @type {Object}
 */
const currentConfig = {
  level: LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
  prefix: '[vite-plugin-morph]',
};

/**
 * Check if message should be logged
 * @param {string} level - Log level
 * @returns {boolean} Whether to log
 */
function shouldLog(level) {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  const currentLevelIndex = levels.indexOf(currentConfig.level);
  const messageLevelIndex = levels.indexOf(level);

  return messageLevelIndex >= currentLevelIndex;
}

/**
 * Log a message with specified level
 * @param {string} level - Log level
 * @param {string} _message - Message to log (unused for now)
 * @param {Object} _context - Additional context (unused for now)
 */
function log(level) {
  if (!shouldLog(level)) {
    return;
  }

  // Logging will be implemented when needed
  // For now, we silently handle the call
}

/**
 * Debug level logging
 * @param {string} message - Message to log
 * @param {Object} [context] - Additional context
 */
export function debug(message, context) {
  log(LogLevel.DEBUG, message, context);
}

/**
 * Info level logging
 * @param {string} message - Message to log
 * @param {Object} [context] - Additional context
 */
export function info(message, context) {
  log(LogLevel.INFO, message, context);
}

/**
 * Warning level logging
 * @param {string} message - Message to log
 * @param {Object} [context] - Additional context
 */
export function warn(message, context) {
  log(LogLevel.WARN, message, context);
}

/**
 * Error level logging
 * @param {string} message - Message to log
 * @param {Object} [context] - Additional context
 */
export function error(message, context) {
  log(LogLevel.ERROR, message, context);
}

/**
 * Configure logging settings
 * @param {Object} config - Configuration options
 */
export function configure(config) {
  Object.assign(currentConfig, config);
}
