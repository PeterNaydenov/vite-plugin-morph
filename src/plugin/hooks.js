/**
 * Vite plugin hooks implementation
 * @fileoverview Implements transform and HMR hooks for .morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError } from '../core/errors.js';
import { processMorphFile } from '../core/processor.js';
import { debug, info, error } from '../utils/logger.js';

/**
 * Transform hook for .morph files
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('vite').TransformOptions} [options] - Vite transform options
 * @returns {Promise<import('../../types/index.js').TransformResult>} Transform result
 */
export async function transformHook(code, id, options = {}) {
  // Only process .morph files
  if (!id.endsWith('.morph')) return null;

  // Get plugin options from Vite config
  const pluginOptions = getPluginOptions(options);

  try {
    // Process the morph file
    const result = await processMorphFile(code, id, pluginOptions);

    // Check if processing resulted in errors
    if (result.errors && result.errors.length > 0) {
      // Return error in meta for tests to inspect
      return {
        code: `// Processing Error: ${result.errors[0].message}`,
        map: null,
        meta: {
          'vite-plugin-morph': {
            type: 'morph',
            errors: result.errors,
            processingTime: result.processingTime,
            isCSSOnly: false,
          },
        },
      };
    }

    // Create transform result
    const transformResult = {
      code: result.code,
      map: result.map,
      meta: {
        'vite-plugin-morph': {
          type: 'morph',
          warnings: result.warnings || [],
          processingTime: result.processingTime,
          isCSSOnly: result.isCSSOnly || false,
        },
      },
    };

    info(`Successfully transformed ${id} in ${result.processingTime}ms`);
    return transformResult;
  } catch (err) {
    error(`Transform failed for ${id}: ${err.message}`);

    // Create error with location information
    const morphError = createMorphError(err, id, null, 'TRANSFORM_ERROR');

    // Return error in meta for tests to inspect
    return {
      code: `// Transform Error: ${morphError.message}`,
      map: null,
      meta: {
        'vite-plugin-morph': {
          type: 'morph',
          errors: [morphError],
          processingTime: 0,
          isCSSOnly: false,
        },
      },
    };
  }
}

/**
 * Handle hot module replacement for .morph files
 * @param {import('vite').HmrContext} context - HMR context
 * @returns {Promise<import('vite').HmrResult|null>} HMR result
 */
export async function handleHotUpdate(context) {
  if (!context.file.endsWith('.morph')) {
    return null;
  }

  try {
    debug(`Handling HMR for ${context.file}`);

    // Read the updated file content
    const code = await context.read();

    // Process the updated file
    const result = await processMorphFile(
      code,
      context.file,
      getPluginOptions(context.server.config)
    );

    // Create HMR updates
    const updates = [];

    // Update the main module
    updates.push({
      type: 'js-update',
      path: context.file,
      timestamp: context.timestamp,
    });

    // If CSS is present, also update CSS
    if (result.cssExports) {
      updates.push({
        type: 'css-update',
        path: `${context.file}.css`,
        timestamp: context.timestamp,
      });
    }

    // Send updates to client
    if (context.server && context.server.ws) {
      context.server.ws.send({
        type: 'update',
        updates,
      });
    }

    info(`HMR update sent for ${context.file}`);

    return {
      modules: context.modules,
      updates,
    };
  } catch (err) {
    error(`HMR failed for ${context.file}: ${err.message}`);

    // Send error to client
    if (context.server && context.server.ws) {
      context.server.ws.send({
        type: 'error',
        err: {
          message: err.message,
          file: context.file,
          timestamp: context.timestamp,
        },
      });
    }

    return null;
  }
}

/**
 * Get plugin options from Vite config
 * @param {import('vite').ResolvedConfig|import('vite').TransformOptions} configOrOptions - Vite config or transform options
 * @returns {import('../../types/index.js').MorphPluginOptions} Plugin options
 */
function getPluginOptions(configOrOptions) {
  // Handle both ResolvedConfig and TransformOptions
  const config = configOrOptions.config || configOrOptions;

  // Check if this is a direct options object (like in tests)
  if (config && (config.production || config.development)) {
    return config;
  }

  if (!config || !config.plugins) {
    return {
      development: {
        sourceMaps: false,
        hmr: false,
      },
      production: {
        removeHandshake: true,
        minifyCSS: true,
      },
    };
  }

  // Find our plugin in plugins array
  const morphPlugin = config.plugins.find(
    (plugin) =>
      plugin &&
      (plugin.name === 'vite-plugin-morph' || plugin.name === 'morphPlugin')
  );

  return morphPlugin ? morphPlugin.options || {} : {};
}
