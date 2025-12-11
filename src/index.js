/**
 * Main entry point for Vite Morph Plugin
 * @fileoverview Exports the plugin function for Vite integration
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { createMorphPlugin } from './plugin/index.js';

/**
 * Vite plugin factory function
 * @param {MorphPluginOptions} [options={}] - Plugin configuration options
 * @returns {*} Vite plugin instance
 */
export default function morphPlugin(options = {}) {
  return createMorphPlugin(options);
}

// Also export as named export for convenience
export const morph = morphPlugin;

// Export types for TypeScript users
export * from './types/index.js';
