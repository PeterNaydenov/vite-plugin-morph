/**
 * Vite plugin hooks implementation
 * @fileoverview Implements transform and HMR hooks for .morph files
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createMorphError } from '../core/errors.js';
import { processMorphFile } from '../core/processor.js';
import { debug, info, warn, error } from '../utils/logger.js';

/**
 * Transform hook for .morph files
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('vite').TransformOptions} [options] - Vite transform options
 * @returns {Promise<import('./types/plugin.js').TransformResult>} Transform result
 */
export async function transformHook(code, id, options = {}) {
  // Only process .morph files
  if (!id.endsWith('.morph')) {
    return null;
  }

  // Get plugin options from Vite config
  const pluginOptions = getPluginOptions(options);

  try {
    debug(`Transforming .morph file: ${id}`);

    // Process the morph file
    const result = await processMorphFile(code, id, pluginOptions);

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
 * @returns {import('./types/plugin.js').MorphPluginOptions} Plugin options
 */
function getPluginOptions(configOrOptions) {
  // Handle both ResolvedConfig and TransformOptions
  const config = configOrOptions.config || configOrOptions;

  // Check if this is a direct options object (like in tests)
  if (config && (config.production || config.development)) {
    return config;
  }

  if (!config || !config.plugins) {
    return {};
  }

  // Find our plugin in plugins array
  const morphPlugin = config.plugins.find(
    (plugin) =>
      plugin &&
      (plugin.name === 'vite-plugin-morph' || plugin.name === 'morphPlugin')
  );

  return morphPlugin ? morphPlugin.options || {} : {};
}

/**
 * Validate transform result
 * @param {import('./types/plugin.js').TransformResult} result - Transform result
 * @returns {boolean} Whether result is valid
 */
export function validateTransformResult(result) {
  if (!result || !result.code) {
    return false;
  }

  // Check for common issues
  if (result.code.includes('Transform Error')) {
    return false;
  }

  if (result.meta && result.meta['vite-plugin-morph']) {
    const meta = result.meta['vite-plugin-morph'];
    if (meta.errors && meta.errors.length > 0) {
      return false;
    }
  }

  return true;
}

/**
 * Create source map for .morph file
 * @param {string} filePath - File path
 * @param {string} generatedCode - Generated code
 * @param {string} originalCode - Original file content
 * @returns {Object} Source map object
 */
export function createSourceMap(filePath, generatedCode, originalCode) {
  // This is a simplified source map implementation
  // In practice, you'd use a proper source map generator

  const lines = originalCode.split('\n');
  const generatedLines = generatedCode.split('\n');

  const mappings = [];

  // Create simple line-based mapping
  for (let i = 0; i < Math.min(lines.length, generatedLines.length); i++) {
    mappings.push({
      generated: {
        line: i + 1,
        column: 1,
      },
      original: {
        line: i + 1,
        column: 1,
      },
    });
  }

  return {
    version: 3,
    file: filePath.replace(/\.morph$/, '.js'),
    sourceRoot: '',
    sources: [filePath],
    names: [],
    mappings: JSON.stringify(mappings),
  };
}
