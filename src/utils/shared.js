/**
 * Shared utility functions for morph plugin
 * @fileoverview Common utilities used across multiple modules
 * @author Peter Naydenov
 * @version 1.0.0
 */

/**
 * Check if running in production mode
 * @param {import('../types/index.js').MorphPluginOptions} options - Plugin options
 * @returns {boolean} Whether in production mode
 */
export function isProductionMode(options) {
  return (
    process.env.NODE_ENV === 'production' ||
    process.argv.includes('--production') ||
    options.production?.removeHandshake === true
  );
}
