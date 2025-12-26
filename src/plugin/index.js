/**
 * Vite plugin implementation for morph file processing
 * @fileoverview Core plugin logic and Vite integration
 * @author Peter Naydenov
 * @version 0.0.10
 */

import path, { join } from 'path';
import configModule, { resolveThemeDirectories } from './config.js';
import {
  startCssCollection,
  finalizeCssCollection,
  getCssCollector,
} from '../services/css-collection.js';
import { createThemeDiscovery } from '../services/theme-discovery.js';

/**
 * Process a morph file and return compiled result
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../types/index.d.ts').ProcessingResult>} Processing result
 */
async function processMorphFileForHmr(code, id, options) {
  // Import and call the processor
  const { processMorphFile } = await import('../core/processor.js');
  return processMorphFile(code, id, options);
}

/**
 * Create Vite plugin for morph file processing
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Plugin configuration
 * @returns {*} Vite plugin instance
 */
export function createMorphPlugin(options = {}) {
  const resolvedOptions = resolveOptions(options);
  let discoveredThemes = null;
  let rootDir = process.cwd();
  let cssDependencies = new Map(); // Track CSS dependencies

  return {
    name: 'vite-plugin-morph',
    enforce: 'pre', // Run before other plugins

    // Configure Vite to handle .morph files
    configureServer(server) {
      server.middlewares.use('/src/**/*.morph', async (req, res, next) => {
        // This shouldn't be needed, but let's see if it helps
        console.log('[vite-plugin-morph] Middleware hit for:', req.url);
        next();
      });
    },



    // Handle virtual module resolution
    resolveId(id) {
      if (id === 'virtual:morph-themes') {
        return '\0virtual:morph-themes';
      }
      if (id === 'virtual:morph-css') {
        return '\0virtual:morph-css';
      }
      if (id === 'virtual:morph-client') {
        return '\0virtual:morph-client';
      }
      if (id === '\0virtual:morph-client') {
        return '\0virtual:morph-client';
      }
      // Handle .morph files - let Vite resolve them normally
      // We'll handle them in load/transform hooks
    },

    // Load .morph files
    async load(id) {
      if (id.endsWith('.morph')) {
        console.log('[vite-plugin-morph] Loading .morph file:', id);
        // In dev mode, Vite handles file reading, but we need to return the content
        // for the transform hook to work
        const fs = await import('fs');
        const code = fs.readFileSync(id.replace(/\?.*$/, ''), 'utf8');
        return code;
      }
    },

    // Load virtual module content
    async load(id) {
      if (id === '\0virtual:morph-themes') {
        if (!discoveredThemes) {
          // Resolve theme directories relative to project root
          const themeDirs = resolveThemeDirectories(resolvedOptions, rootDir);

          const themeDiscovery = createThemeDiscovery({
            directories: themeDirs,
            defaultTheme: resolvedOptions.themes?.defaultTheme || 'default',
          });
          discoveredThemes = await themeDiscovery.discoverThemes();
        }

        // Convert Map to object for export
        const themesObject = {};
        for (const [name, theme] of discoveredThemes) {
          themesObject[name] = theme;
        }

        const defaultTheme = resolvedOptions.themes?.defaultTheme || 'default';

        return `export const defaultTheme = "${defaultTheme}";
export default ${JSON.stringify(themesObject, null, 2)};`;
      }

      if (id === '\0virtual:morph-css') {
        // Get collected CSS from the collector
        const collector = getCssCollector();

        // Get all collected CSS as a single string
        const allCss = Array.from(collector.components.values()).join('\n\n');

        return `export const collectedCss = ${JSON.stringify(allCss)};`;
      }

      if (id === '\0virtual:morph-client') {
        // Generate client module code based on environment
        return await generateClientModule(resolvedOptions, rootDir);
      }
    },

    // Handle client interface imports and generate config
    async transform(code, id) {
      // If this file imports the client interface and we have global CSS configured,
      // inject the virtual client module import
      if (code.includes('@peter.naydenov/vite-plugin-morph/client') &&
          !id.endsWith('.morph') &&
          resolvedOptions.globalCSS) {
        // Inject import of virtual client module
        const injectedCode = `import 'virtual:morph-client';\n${code}`;
        return {
          code: injectedCode,
          map: null,
        };
      }

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

      // Pass CSS variables file path to processor
      const cssVarsFile = resolvedOptions.css?.variablesFile;

      try {
        const result = await processMorphFile(code, id, {
        ...resolvedOptions,
        cssVarsFile: resolvedOptions.css?.variablesFile,
        rootDir,
        test: process.env.NODE_ENV === 'test'
      });

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
      if (!context.file.endsWith('.morph') && !context.file.endsWith('.css')) {
        return null;
      }

      try {
        // Handle morph files
        if (context.file.endsWith('.morph')) {
          // Read the updated file content
          const updatedContent = await context.read();

          // Check if the file contains CSS
          const hasCss = await checkFileHasCss(updatedContent);

          if (hasCss) {
            // For CSS changes in dev mode, trigger module reload
            // This will regenerate the client module with updated CSS
            return context.modules;
          }

          // For non-CSS changes, return the module to be reloaded
          return context.modules;
        }

        // Handle global CSS files
        if (context.file.endsWith('.css') && resolvedOptions.globalCSS) {
          // Check if this CSS file is in the global CSS directory
          const globalCssDir = path.join(rootDir, resolvedOptions.globalCSS.directory);
          const isInGlobalDir = context.file.startsWith(globalCssDir);

          if (isInGlobalDir) {
            // Read the updated CSS content
            const cssContent = await context.read();

            // Update the global CSS in the collector
            const collector = getCssCollector();
            collector.updateGlobalCss(context.file, cssContent);

            // Trigger HMR by returning modules that depend on CSS
            return context.modules;
          }
        }

        return null;
      } catch (error) {
        console.warn(`HMR update failed for ${context.file}:`, error.message);
        return null;
      }
    },

    // Configure plugin
    configResolved(config) {
      // Store root directory
      rootDir = config.root || rootDir;
      // Validate configuration
      validatePluginConfig(resolvedOptions, config);
    },

    // Build lifecycle hooks for CSS collection
    async buildStart() {
      // Start collecting component CSS with chunking options
      const cssOptions = resolvedOptions.css || {};
      const chunkingOptions = cssOptions.chunking || {};
      const outputDir = cssOptions.outputDir || 'dist/components';

      const collector = startCssCollection({
        outputDir,
        chunkingEnabled: chunkingOptions.enabled,
        chunkStrategy: chunkingOptions.strategy,
        maxChunkSize: chunkingOptions.maxChunkSize,
      });

      // Read and collect global CSS files if configured
      if (resolvedOptions.globalCSS) {
        const { readCSSFiles } = await import('../services/css-reader.js');
        const globalCssFiles = await readCSSFiles({
          directory: path.join(rootDir, resolvedOptions.globalCSS.directory),
          include: resolvedOptions.globalCSS.include,
          exclude: resolvedOptions.globalCSS.exclude,
        });
        collector.addGlobalCss(globalCssFiles);
      }
    },

    async buildEnd() {
      // Finalize CSS collection and generate bundle
      await finalizeCssCollection();
    },
  };
}

/**
 * Resolve and validate plugin options
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Raw options
 * @returns {import('../types/index.d.ts').MorphPluginOptions} Resolved options
 */
function resolveOptions(options) {
  return mergeOptions(configModule.defaultConfig, options);
}

/**
 * Process a morph file and return compiled result
 * @param {string} code - File content
 * @param {string} id - File path
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../types/index.d.ts').ProcessingResult>} Processing result
 */
async function processMorphFile(code, id, options) {
  // This will be implemented in core/processor.js
  const { processMorphFile } = await import('../core/processor.js');
  return processMorphFile(code, id, options);
}

/**
 * Validate plugin configuration
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Plugin options
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
 * @returns {import('../types/index.d.ts').MorphPluginError} Enhanced error
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
 * Generate client module code for dev or build mode
 * @param {Object} options - Plugin options
 * @param {string} rootDir - Project root directory
 * @returns {Promise<string>} Generated module code
 */
async function generateClientModule(options, rootDir) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // Dev mode: Provide configuration data for runtime consumption
    const collector = getCssCollector();
    const morphCss = Array.from(collector.components.values()).join('\n\n');
    const globalCss = collector.getGlobalCss() || '';
    const collectedCss = globalCss ? `${globalCss}\n\n${morphCss}` : morphCss;

    // Get theme information from theme discovery
    const themeDiscovery = await createThemeDiscovery({
      directories: [join(rootDir, 'src/themes')],
      defaultTheme: options.themes?.defaultTheme || 'default',
    });
    const themes = await themeDiscovery.discoverThemes();
    const themeNames = Array.from(themes.keys());
    const defaultTheme = options.themes?.defaultTheme || 'default';

    // Generate theme URL mapping for dev mode
    const themeUrls = {};
    themeNames.forEach(name => {
      themeUrls[name] = `/themes/${name}.css`;
    });

    console.log('[Vite Plugin Morph] Generated CSS for client:', {
      cssLength: collectedCss.length,
      containsVariables: collectedCss.includes('--color-main-background'),
      containsRoot: collectedCss.includes(':root')
    });

    return `
import { setMorphConfig } from '@peter.naydenov/vite-plugin-morph/client';

// Development mode configuration for unified runtime
const config = {
  environment: 'development',
  css: ${JSON.stringify(collectedCss)},
  themes: ${JSON.stringify(themeNames)},
  defaultTheme: ${JSON.stringify(defaultTheme)},
  themeUrls: ${JSON.stringify(themeUrls)}
};

setMorphConfig(config);

// HMR support: Update CSS when morph files change
if (import.meta.hot) {
  import.meta.hot.on('morph-css-update', (newCss) => {
    setMorphConfig({ css: newCss });
  });
}

// Export config for debugging
export const __morphConfig__ = config;
`;
  } else {
    // Build mode: Provide placeholder configuration
    // This will be replaced during bundle generation with actual asset URLs
    return `
// Build mode configuration placeholder - will be replaced with actual assets
export const __morphConfig__ = {
  environment: 'build',
  css: '',
  themes: [],
  defaultTheme: 'default',
  themeUrls: {}
};
`;
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
