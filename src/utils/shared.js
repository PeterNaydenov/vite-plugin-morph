/**
 * Shared utility functions for morph plugin
 * @fileoverview Common utilities used across multiple modules
 * @author Peter Naydenov
 * @version 0.0.10
 */

/**
 * Check if running in production mode
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @returns {boolean} Whether in production mode
 */
export function isProductionMode(options) {
  // Handle undefined process.env or process.argv
  const nodeEnv = process.env?.NODE_ENV;
  const argv = process.argv || [];

  // Check NODE_ENV (case insensitive for common variations)
  const isNodeEnvProduction =
    nodeEnv && ['production', 'PRODUCTION', 'Production'].includes(nodeEnv);

  // If NODE_ENV is explicitly set to development, we're not in production
  const isExplicitlyDevelopment =
    nodeEnv === 'development' || nodeEnv === 'dev';

  // Check command line arguments
  const hasProductionFlag = argv.includes('--production');

  // Check options - only consider if NODE_ENV is not explicitly set to development
  const optionsIndicateProduction =
    !isExplicitlyDevelopment && options?.production?.removeHandshake === true;

  return isNodeEnvProduction || hasProductionFlag || optionsIndicateProduction;
}
