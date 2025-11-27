/**
 * Logging utilities for morph plugin
 * @fileoverview Provides structured logging with different levels
 * @author Peter Naydenov
 * @version 0.0.7
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
 * Core logging function
 * @param {string} level - Log level
 * @param {string} message - Message to log
 * @param {Object} [context] - Additional context
 */
function log(level, message, context) {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] [${level}] ${message}${contextStr}`);
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
