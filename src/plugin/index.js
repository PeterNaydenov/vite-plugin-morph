/**
 * Vite plugin implementation for morph file processing
 * @fileoverview Core plugin logic and Vite integration
 * @author Peter Naydenov
 * @version 0.0.10
 */

import configModule from './config.js';
import {
  startCssCollection,
  finalizeCssCollection,
} from '../services/css-collection.js';

/**
 * Process a morph file and return compiled result
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('../types/index.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../types/index.js').ProcessingResult>} Processing result
 */
async function processMorphFileForHmr(code, id, options) {
  // Import and call the processor
  const { processMorphFile } = await import('../core/processor.js');
  return processMorphFile(code, id, options);
}

/**
 * Create Vite plugin for morph file processing
 * @param {import('../types/index.js').MorphPluginOptions} options - Plugin configuration
 * @returns {*} Vite plugin instance
 */
export function createMorphPlugin(options = {}) {
  const resolvedOptions = resolveOptions(options);

  return {
    name: 'vite-plugin-morph',

    // Handle .morph file transformation
    async transform(code, id) {
      if (!id || !id.endsWith('.morph')) {
        return null;
      }

      // Validate inputs
      if (typeof code !== 'string') {
        throw new Error(
          `Invalid code parameter: expected string, got ${typeof code}`
        );
      }
      if (typeof id !== 'string') {
        throw new Error(
          `Invalid id parameter: expected string, got ${typeof id}`
        );
      }

      try {
        const result = await processMorphFile(code, id, resolvedOptions);

        // Validate result
        if (!result || typeof result.code !== 'string') {
          throw new Error(
            `processMorphFile returned invalid result: ${JSON.stringify(result)}`
          );
        }

        return {
          code: result.code,
          map: result.map,
          meta: {
            'vite-plugin-morph': {
              type: 'morph',
              warnings: result.warnings || [],
              processingTime: result.processingTime || 0,
            },
          },
        };
      } catch (error) {
        // Ensure error has a valid message
        const safeError =
          error && typeof error === 'object'
            ? error
            : new Error(
                typeof error === 'string' ? error : 'Unknown transform error'
              );

        if (!safeError.message) {
          safeError.message = 'Transform failed with no error message';
        }

        throw await createMorphError(safeError, id || 'unknown-file');
      }
    },

    // Handle hot module replacement
    async handleHotUpdate(context) {
      if (!context.file.endsWith('.morph')) {
        return null;
      }

      try {
        // Read the updated file content
        const updatedContent = await context.read();

        // Check if the file contains CSS
        const hasCss = await checkFileHasCss(updatedContent);

        if (hasCss) {
          // For CSS changes, we need to invalidate the CSS bundle
          // and send a CSS update to the client
          const cssUpdate = await generateCssUpdate(
            context.file,
            updatedContent,
            resolvedOptions
          );

          if (cssUpdate) {
            return {
              type: 'css-update',
              path: cssUpdate.bundlePath,
              acceptedPath: cssUpdate.bundlePath,
              timestamp: context.timestamp,
            };
          }
        }

        // For non-CSS changes, return the module to be reloaded
        return [context.modules[0]]; // Reload the main module
      } catch (error) {
        console.warn(`HMR update failed for ${context.file}:`, error.message);
        return null;
      }
    },

    // Configure plugin
    configResolved(config) {
      // Validate configuration
      validatePluginConfig(resolvedOptions, config);
    },

    // Build lifecycle hooks for CSS collection
    buildStart() {
      // Start collecting component CSS with chunking options
      const cssOptions = resolvedOptions.css || {};
      const chunkingOptions = cssOptions.chunking || {};
      const outputDir = cssOptions.outputDir || 'dist/components';

      startCssCollection({
        outputDir,
        chunkingEnabled: chunkingOptions.enabled,
        chunkStrategy: chunkingOptions.strategy,
        maxChunkSize: chunkingOptions.maxChunkSize,
      });
    },

    async buildEnd() {
      // Finalize CSS collection and generate bundle
      await finalizeCssCollection();
    },
  };
}

/**
 * Resolve and validate plugin options
 * @param {import('../types/index.js').MorphPluginOptions} options - Raw options
 * @returns {import('../types/index.js').MorphPluginOptions} Resolved options
 */
function resolveOptions(options) {
  return mergeOptions(configModule.defaultConfig, options);
}

/**
 * Process a morph file and return compiled result
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('../types/index.js').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../types/index.js').ProcessingResult>} Processing result
 */
async function processMorphFile(code, id, options) {
  // This will be implemented in core/processor.js
  const { processMorphFile } = await import('../core/processor.js');
  return processMorphFile(code, id, options);
}

/**
 * Validate plugin configuration
 * @param {import('../types/index.js').MorphPluginOptions} options - Plugin options
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
 * @returns {import('../types/index.js').MorphPluginError} Enhanced error
 */
async function createMorphError(error, filePath) {
  // This will be implemented in core/errors.js
  const { createMorphError } = await import('../core/errors.js');
  return createMorphError(error, filePath);
}

/**
 * Check if a morph file contains CSS content
 * @param {string} content - File content
 * @returns {boolean} True if file contains CSS
 */
async function checkFileHasCss(content) {
  try {
    const { extractStyleContent } = await import('../core/parser.js');
    const { parseMorphFile } = await import('../core/parser.js');

    const document = parseMorphFile(content);
    const styleContent = extractStyleContent(document);

    return styleContent && styleContent.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Generate CSS update for HMR
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @param {Object} options - Plugin options
 * @returns {Object|null} CSS update info or null
 */
async function generateCssUpdate(filePath, content, options) {
  try {
    // Process the morph file to get the CSS
    const result = await processMorphFileForHmr(content, filePath, options);

    if (result.cssExports) {
      // Invalidate CSS cache for this component
      const { getCssCollector } = await import('../services/css-collection.js');
      const collector = getCssCollector();
      collector.clearCache();

      // Return update info for the CSS bundle
      return {
        bundlePath: 'dist/components/components.css', // Default bundle path
        css: result.cssExports,
      };
    }

    return null;
  } catch (error) {
    console.warn(
      `Failed to generate CSS update for ${filePath}:`,
      error.message
    );
    return null;
  }
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
