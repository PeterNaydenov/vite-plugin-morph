/**
 * Logging utilities for morph plugin
 * @fileoverview Provides structured logging with different levels
 * @author Peter Naydenov
 * @version 0.0.10
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
  SILENT: 'silent',
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
 * Log levels in ascending severity; 'silent' suppresses everything
 * @type {string[]}
 */
const levels = [
  LogLevel.DEBUG,
  LogLevel.INFO,
  LogLevel.WARN,
  LogLevel.ERROR,
  LogLevel.SILENT,
];

/**
 * Check if message should be logged
 * @param {string} level - Log level
 * @returns {boolean} Whether to log
 */
function shouldLog(level) {
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
  const line = `[${timestamp}] [${level}] ${message}${contextStr}`;
  /* eslint-disable no-console */
  if (level === LogLevel.ERROR) console.error(line);
  else if (level === LogLevel.WARN) console.warn(line);
  else console.log(line);
  /* eslint-enable no-console */
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
  const { level, ...rest } = config;
  Object.assign(currentConfig, rest);
  if (level !== undefined) {
    if (!levels.includes(level)) {
      throw new Error(
        `Invalid log level "${level}". Expected one of: ${levels.join(', ')}`
      );
    }
    currentConfig.level = level;
  }
}
