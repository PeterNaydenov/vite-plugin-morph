/**
 * Plugin configuration validation
 * @fileoverview Validates plugin configuration options
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError, ErrorCodes } from '../core/errors.js';

/**
 * Validate plugin configuration
 * @param {import('../../types/index.js').MorphPluginOptions} options - Plugin options
 * @param {import('vite').ResolvedConfig} config - Vite config
 */
export function validateConfig(options) {
  const errors = [];

  // Validate globalCSS configuration
  if (options.globalCSS) {
    if (!options.globalCSS.directory) {
      errors.push(
        'globalCSS.directory is required when globalCSS is specified'
      );
    }

    if (
      options.globalCSS.include &&
      !Array.isArray(options.globalCSS.include)
    ) {
      errors.push('globalCSS.include must be an array');
    }

    if (
      options.globalCSS.exclude &&
      !Array.isArray(options.globalCSS.exclude)
    ) {
      errors.push('globalCSS.exclude must be an array');
    }
  }

  // Validate production configuration
  if (options.production) {
    if (typeof options.production.removeHandshake !== 'boolean') {
      errors.push('production.removeHandshake must be a boolean');
    }

    if (typeof options.production.minifyCSS !== 'boolean') {
      errors.push('production.minifyCSS must be a boolean');
    }
  }

  // Validate development configuration
  if (options.development) {
    if (typeof options.development.sourceMaps !== 'boolean') {
      errors.push('development.sourceMaps must be a boolean');
    }

    if (typeof options.development.hmr !== 'boolean') {
      errors.push('development.hmr must be a boolean');
    }
  }

  // Validate error handling configuration
  if (options.errorHandling) {
    if (typeof options.errorHandling.failOnError !== 'boolean') {
      errors.push('errorHandling.failOnError must be a boolean');
    }

    if (typeof options.errorHandling.showLocation !== 'boolean') {
      errors.push('errorHandling.showLocation must be a boolean');
    }

    if (
      typeof options.errorHandling.maxErrors !== 'number' ||
      options.errorHandling.maxErrors < 1
    ) {
      errors.push('errorHandling.maxErrors must be a positive number');
    }
  }

  // Report errors
  if (errors.length > 0) {
    const error = createMorphError(
      `Configuration validation failed:\n${errors.join('\n')}`,
      'vite.config.js',
      null,
      ErrorCodes.CONFIG_ERROR
    );

    if (options.errorHandling?.failOnError !== false) {
      throw error;
    }
    // Note: In production with failOnError: false, errors are silently ignored
  }
}
