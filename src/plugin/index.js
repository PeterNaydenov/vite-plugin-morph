/**
 * Vite plugin implementation for morph file processing
 * @fileoverview Core plugin logic and Vite integration
 * @author Peter Naydenov
 * @version 1.0.0
 */

/**
 * Create Vite plugin for morph file processing
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin configuration
 * @returns {import('vite').Plugin} Vite plugin instance
 */
export function createMorphPlugin(options = {}) {
  const resolvedOptions = resolveOptions(options);

  return {
    name: 'vite-plugin-morph',

    // Handle .morph file transformation
    async transform(code, id) {
      if (!id.endsWith('.morph')) {
        return null;
      }

      try {
        const result = await processMorphFile(code, id, resolvedOptions);
        return {
          code: result.code,
          map: result.map,
          meta: {
            'vite-plugin-morph': {
              type: 'morph',
              warnings: result.warnings,
              processingTime: result.processingTime,
            },
          },
        };
      } catch (error) {
        throw createMorphError(error, id);
      }
    },

    // Handle hot module replacement
    async handleHotUpdate(context) {
      if (!context.file.endsWith('.morph')) {
        return null;
      }

      return handleMorphHMR(context, resolvedOptions);
    },

    // Configure plugin
    configResolved(config) {
      // Validate configuration
      validatePluginConfig(resolvedOptions, config);
    },
  };
}

/**
 * Resolve and validate plugin options
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Raw options
 * @returns {import('./types/plugin.js').MorphPluginOptions} Resolved options
 */
function resolveOptions(options) {
  const defaults = {
    globalCSS: {
      directory: 'src/styles',
      include: ['**/*.css'],
      exclude: [],
    },
    production: {
      removeHandshake: true,
      minifyCSS: true,
    },
    development: {
      sourceMaps: true,
      hmr: true,
    },
    errorHandling: {
      failOnError: true,
      showLocation: true,
      maxErrors: 10,
    },
  };

  return mergeOptions(defaults, options);
}

/**
 * Process a morph file and return compiled result
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('./types/processing.js').ProcessingResult>} Processing result
 */
async function processMorphFile(code, id, options) {
  // This will be implemented in core/processor.js
  const { processMorphFile } = await import('./core/processor.js');
  return processMorphFile(code, id, options);
}

/**
 * Handle hot module replacement for morph files
 * @param {import('vite').HmrContext} context - HMR context
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('vite').HmrResult>} HMR result
 */
async function handleMorphHMR(context, options) {
  // This will be implemented in plugin/hmr.js
  const { handleMorphHMR } = await import('./plugin/hmr.js');
  return handleMorphHMR(context, options);
}

/**
 * Validate plugin configuration
 * @param {import('./types/plugin.js').MorphPluginOptions} options - Plugin options
 * @param {import('vite').ResolvedConfig} config - Vite config
 */
function validatePluginConfig(options, config) {
  // This will be implemented in config.js
  import('./config.js').then(({ validateConfig }) => {
    validateConfig(options, config);
  });
}

/**
 * Create morph error with location information
 * @param {Error} error - Original error
 * @param {string} filePath - File path
 * @returns {import('./types/processing.js').MorphPluginError} Enhanced error
 */
async function createMorphError(error, filePath) {
  // This will be implemented in core/errors.js
  const { createMorphError } = await import('./core/errors.js');
  return createMorphError(error, filePath);
}

/**
 * Deep merge options objects
 * @param {Object} defaults - Default options
 * @param {Object} options - User options
 * @returns {Object} Merged options
 */
function mergeOptions(defaults, options) {
  const result = { ...defaults };

  for (const key in options) {
    if (typeof options[key] === 'object' && !Array.isArray(options[key])) {
      result[key] = { ...defaults[key], ...options[key] };
    } else {
      result[key] = options[key];
    }
  }

  return result;
}
