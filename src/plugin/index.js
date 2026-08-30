/**
 * Vite plugin implementation for morph file processing
 * @fileoverview Core plugin logic and Vite integration
 * @author Peter Naydenov
 * @version 0.0.10
 */

import path, { join } from 'path';
import { createHash } from 'crypto';
import fs from 'fs';
import configModule, { resolveThemeDirectories, validateConfig } from './config.js';
import {
  startCssCollection,
  finalizeCssCollection,
  getCssCollector,
} from '../services/css-collection.js';
import { extractThemesFromDirs, extractThemesFromDir } from '../services/theme-variables.js';
import {
  detectMorphLibraries,
  getImportedPackages,
  loadPostCSSConfig,
  isCacheValid,
  findCachedFile,
  processLocalCss,
  getLocalCssCache,
  processLibraryMainCSS,
} from '../services/library-css-processor.js';
import { buildCssRuleFromResult } from '../utils/shared.js';

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
  let morphLibraries = []; // Store detected morph libraries
  let libraryCssUrls = new Map(); // Library name → processed CSS URL
  let localThemesCode = ''; // Local themes registration code
  let isDevServer = false; // True when running `vite` (serve), false for `vite build`

  if (resolvedOptions.css?.debug?.enabled) {
    import('../utils/css-debug.js').then(({ enableCssDebugging }) => {
      enableCssDebugging({
        verbose: resolvedOptions.css.debug.verbose,
        showSourceMaps: resolvedOptions.css.debug.showSourceMaps,
      });
    });
  }

  return {
    name: 'vite-plugin-morph',
    enforce: 'pre', // Run before other plugins

    // Configure Vite to handle .morph files
    configureServer(server) {

      // Serve processed CSS from cache (dev mode)
      server.middlewares.use('/@morph-processed', (req, res, next) => {
        const urlPath = req.url.replace('/', '');

        // Try exact match first
        let cachePath = path.join(
          rootDir,
          '.vite',
          'cache',
          'morph-processed',
          urlPath
        );

        // If not found, try prefix match (for URLs without hash)
        if (!fs.existsSync(cachePath)) {
          const files = fs.readdirSync(
            path.join(rootDir, '.vite', 'cache', 'morph-processed')
          );
          const matchingFile = files.find((f) => f.startsWith(urlPath));
          if (matchingFile) {
            cachePath = path.join(
              rootDir,
              '.vite',
              'cache',
              'morph-processed',
              matchingFile
            );
          }
        }


        if (fs.existsSync(cachePath)) {
          const css = fs.readFileSync(cachePath, 'utf-8');
          res.setHeader('Content-Type', 'text/css');
          res.end(css);
        } else {
          next();
        }
      });

      // Serve local CSS from globalCSS.directory with HMR support
      server.middlewares.use('/@morph-css/local', async (req, res, next) => {
        const urlPath = req.url.replace('/', ''); // e.g., "main.css"

        // Skip theme files - they're handled by the theme middleware
        if (urlPath.startsWith('themes/')) {
          next();
          return;
        }

        const globalCssConfig = resolvedOptions.globalCSS || {};
        const cssDir = path.join(
          rootDir,
          globalCssConfig.directory || 'src/styles'
        );
        const entryFile = globalCssConfig.entry || 'main.css';
        const cacheDir = path.join(rootDir, '.vite', 'cache', 'morph-local');

        // Only handle the entry file for now
        const fileName =
          urlPath === '' || urlPath === entryFile ? entryFile : urlPath;
        const cssPath = path.join(cssDir, fileName);

        if (!fs.existsSync(cssPath)) {
          next();
          return;
        }

        // Check cache validity
        let cacheInfo = getLocalCssCache(cssPath, cacheDir);

        // Re-process if cache invalid
        if (!cacheInfo) {
          const postcssConfig = await loadPostCSSConfig(rootDir);
          const result = await processLocalCss(
            cssPath,
            cssDir,
            cacheDir,
            postcssConfig
          );
          cacheInfo = {
            cachePath: result.cachePath,
            mtime: result.mtime,
            fileName: result.fileName,
          };
        } else {
        }

        if (fs.existsSync(cacheInfo.cachePath)) {
          let css = fs.readFileSync(cacheInfo.cachePath, 'utf-8');
          const layersEnabled = resolvedOptions.css?.layers?.enabled !== false;

          // Attach the source map processLocalCss() already generates
          // (postcss-import tracks real positions through @import inlining,
          // sourcesContent included) so DevTools can jump from a global-CSS
          // rule straight to the real file — written to disk but never
          // actually served until now.
          const mapPath = cacheInfo.cachePath + '.map';
          let mapComment = '';
          if (fs.existsSync(mapPath)) {
            try {
              const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
              if (layersEnabled) {
                // The @layer app {} wrap below adds one generated line above
                // the original content — shift the map to match.
                map.mappings = ';' + map.mappings;
              }
              const base64 = Buffer.from(JSON.stringify(map)).toString(
                'base64'
              );
              mapComment = `\n/*# sourceMappingURL=data:application/json;base64,${base64} */`;
            } catch (e) {
              // Malformed map — serve the CSS without one rather than fail the request.
            }
          }

          // General/global project CSS belongs in the `app` layer (brand-level
          // customization) of the five-layer cascade.
          if (layersEnabled) {
            css = `@layer app {\n${css}\n}`;
          }
          css += mapComment;

          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(css);
        } else {
          next();
        }
      });

      // Serve local theme CSS files for HMR
      server.middlewares.use('/@morph-css/local/themes', (req, res, next) => {
        const urlPath = req.url.replace('/', ''); // e.g., "light.css"

        const localThemesConfig = resolvedOptions.localThemes || {};
        const themesDir = path.join(
          rootDir,
          localThemesConfig.directory || 'src/themes'
        );
        const cssPath = path.join(themesDir, urlPath);

        if (!fs.existsSync(cssPath)) {
          next();
          return;
        }

        const css = fs.readFileSync(cssPath, 'utf-8');
        res.setHeader('Content-Type', 'text/css');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(css);
      });

      // Watch local CSS files
      const globalCssConfig = resolvedOptions.globalCSS || {};
      const cssDir = path.join(
        rootDir,
        globalCssConfig.directory || 'src/styles'
      );
      if (fs.existsSync(cssDir)) {
        const cssFiles = fs
          .readdirSync(cssDir)
          .filter((f) => f.endsWith('.css'));
        for (const cssFile of cssFiles) {
          const cssPath = path.join(cssDir, cssFile);
          server.watcher.add(cssPath);
        }

        server.watcher.on('change', async (changedPath) => {
          if (changedPath.endsWith('.css') && changedPath.startsWith(cssDir)) {
            // Force cache invalidation by clearing cached file
            const cacheDir = path.join(
              rootDir,
              '.vite',
              'cache',
              'morph-local'
            );
            if (fs.existsSync(cacheDir)) {
              const fileName = changedPath.split('/').pop();
              const baseName = fileName.replace('.css', '');
              const files = fs
                .readdirSync(cacheDir)
                .filter((f) => f.startsWith(`local-${baseName}-`));
              for (const f of files) {
                fs.unlinkSync(path.join(cacheDir, f));
              }
            }

            // Send HMR update to browser
            const globalCssConfig = resolvedOptions.globalCSS || {};
            const entryFile = globalCssConfig.entry || 'main.css';
            if (changedPath.endsWith(entryFile)) {
              server.hot.send({
                type: 'custom',
                event: 'morph-local-css-update',
                data: { file: entryFile },
              });
            }
          }
        });
      }

      // Watch theme files in all morph library theme directories
      for (const library of morphLibraries) {
        const themeDir = path.join(library.path, 'themes');
        if (fs.existsSync(themeDir)) {
          const themeFiles = fs
            .readdirSync(themeDir)
            .filter((f) => f.endsWith('.css'));

          for (const themeFile of themeFiles) {
            const themePath = path.join(themeDir, themeFile);
            server.watcher.add(themePath);
          }

          server.watcher.on('change', async (changedPath) => {
            if (
              changedPath.endsWith('.css') &&
              changedPath.startsWith(themeDir)
            ) {

              // Extract theme name and library
              const themeFile = changedPath.split('/').pop();
              const themeName = themeFile.replace('.css', '');
              const libraryName = library.name;


              // Send HMR event to browser
              server.hot.send({
                type: 'custom',
                event: 'morph-theme-change',
                data: { libraryName, themeName },
              });
            }
          });
        }
      }

      // Watch local theme files
      const localThemesConfig = resolvedOptions.localThemes || {};
      const localThemesDir = path.join(
        rootDir,
        localThemesConfig.directory || 'src/themes'
      );


      if (fs.existsSync(localThemesDir)) {
        const localThemeFiles = fs
          .readdirSync(localThemesDir)
          .filter((f) => f.endsWith('.css'));


        for (const themeFile of localThemeFiles) {
          const themePath = path.join(localThemesDir, themeFile);
          server.watcher.add(themePath);
        }

        // Test that watcher is working

        server.watcher.on('all', (event, path) => {
          if (
            event === 'change' &&
            path.startsWith(localThemesDir) &&
            path.endsWith('.css')
          ) {

            const themeFile = path.split('/').pop();
            const themeName = themeFile.replace('.css', '');


            // Send HMR event to browser
            server.hot.send({
              type: 'custom',
              event: 'morph-theme-change',
              data: { libraryName: 'host', themeName },
            });
          }
        });
      }
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
      if (id === 'virtual:morph-config') {
        return '\0virtual:morph-config';
      }
      if (id === 'virtual:morph-local-themes') {
        return '\0virtual:morph-local-themes';
      }
    },

    // Load .morph files and virtual module content
    async load(id) {
      if (id.endsWith('.morph')) {
        const fs = await import('fs');
        const code = fs.readFileSync(id.replace(/\?.*$/, ''), 'utf8');
        return code;
      }
      if (id === '\0virtual:morph-themes') {
        if (!discoveredThemes) {
          const themeDirs = resolveThemeDirectories(resolvedOptions, rootDir);
          discoveredThemes = await extractThemesFromDirs(themeDirs);
        }

        const defaultThemeName = resolvedOptions.themes?.defaultTheme || 'default';

        return `export default ${JSON.stringify(discoveredThemes)};\nexport const defaultTheme = ${JSON.stringify(defaultThemeName)};`;
      }
      if (id === '\0virtual:morph-css') {
        const collector = getCssCollector();
        const morphCss = Array.from(collector.components.values())
          .map((entry) => entry.css)
          .join('\n\n');
        return `export default ${JSON.stringify(morphCss)};`;
      }
      if (id === '\0virtual:morph-config') {
        const globalCSS = resolvedOptions.globalCSS || {};

        // Embed the project's general CSS as text (same approach as themes),
        // so applyGeneralStyles() can apply it with no <link>/fetch/URL involved.
        // Dev mode doesn't need this — it uses the live-reloading /@morph-css/local
        // fetch instead, for HMR.
        let generalCss = '';
        if (globalCSS.directory) {
          const { readCSSFiles } = await import('../services/css-reader.js');
          const globalCssFiles = await readCSSFiles({
            directory: path.join(rootDir, globalCSS.directory),
            include: globalCSS.include,
            exclude: globalCSS.exclude,
          });
          const combined = Array.from(globalCssFiles.values()).join('\n\n');
          if (combined) {
            generalCss =
              resolvedOptions.css?.layers?.enabled !== false
                ? `@layer app {\n${combined}\n}`
                : combined;
          }
        }

        return `export default ${JSON.stringify({ globalCSS, generalCss })};`;
      }
      if (id === '\0virtual:morph-local-themes') {
        const code = localThemesCode || '';
        if (!code) {
          return '// No local themes configured';
        }
        return code;
      }
      return null;
    },

    // Transform .morph files to JavaScript
    async transform(code, id) {

      if (!id || !id.endsWith('.morph')) {
        return null;
      }

      try {
        const result = await processMorphFile(code, id, {
          ...resolvedOptions,
          cssVarsFile: resolvedOptions.css?.variablesFile,
          rootDir,
          test: process.env.NODE_ENV === 'test',
          isDevServer,
        });

        // Register this component's scoped CSS with the collector, tagged by
        // source (library vs. local module) so bundling can wrap it in the
        // right cascade layer (`libs` vs `modules`).
        if (!result.isCSSOnly && result.processedCss && result.componentName) {
          const source = id.includes('node_modules') ? 'library' : 'module';
          getCssCollector().addComponentCss(
            result.componentName,
            result.processedCss,
            source
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
        if (context.file.endsWith('.morph')) {
          const updatedContent = await context.read();
          const hasCss = await checkFileHasCss(updatedContent);

          if (hasCss) {
            // CSS-only change, let CSS HMR handle it
            return context.modules;
          }

          // This is a template/handshake change - need proper HMR handling
          // Import the processor to get componentsCSS
          const { processMorphFile } = await import('../core/processor.js');
          const pluginOptions = {
            ...resolvedOptions,
            css: resolvedOptions.css || {},
            rootDir,
            isDevServer: true, // handleHotUpdate only fires under the dev server
          };
          const result = await processMorphFile(
            updatedContent,
            context.file,
            pluginOptions
          );

          // Create HMR updates
          const updates = [];
          const componentName = context.file
            .split(/[/\\]/)
            .pop()
            .replace('.morph', '');

          // Update the main module
          updates.push({
            type: 'js-update',
            path: context.file,
            timestamp: context.timestamp,
          });

          // Send CSS update event if CSS changed
          if (result.cssExports || result.componentsCSS) {
            const cssRule = buildCssRuleFromResult(result);

            if (cssRule && context.server.ws) {
              context.server.ws.send({
                type: 'custom',
                event: 'morph-css-update',
                data: {
                  componentName,
                  cssRule,
                  source: 'host',
                },
              });
            }

            updates.push({
              type: 'css-update',
              path: `${context.file}.css`,
              timestamp: context.timestamp,
            });
          }

          // Find all modules that import this morph file
          let hmrModules = [...(context.modules || [])];

          if (context.server && context.server.moduleGraph) {
            try {
              const module = context.server.moduleGraph.getModuleById(
                context.file
              );
              if (module) {
                for (const importer of module.importers || []) {
                  if (
                    importer.id &&
                    !hmrModules.find((m) => m.id === importer.id)
                  ) {
                    hmrModules.push(importer);
                  }
                }
              }
            } catch (e) {
              console.warn(
                `Could not find importers for ${context.file}: ${e.message}`
              );
            }
          }

          // Add importer updates to trigger re-render
          const importerUpdates = hmrModules
            .filter((m) => m.id !== context.file)
            .map((m) => ({
              type: 'js-update',
              path: m.file || m.id || context.file,
              timestamp: context.timestamp,
            }));

          updates.push(...importerUpdates);

          return {
            modules: hmrModules,
            updates,
          };
        }

        if (context.file.endsWith('.css') && resolvedOptions.globalCSS) {
          const globalCssDir = path.join(
            rootDir,
            resolvedOptions.globalCSS.directory
          );
          const isInGlobalDir = context.file.startsWith(globalCssDir);

          if (isInGlobalDir) {
            const cssContent = await context.read();
            const collector = getCssCollector();
            collector.updateGlobalCss(context.file, cssContent);

            // Tell the client to re-fetch and re-apply its general CSS.
            // runtime.js already listens for this exact event (used to just
            // invalidate 'virtual:morph-client', a module nothing actually
            // imports, so this update silently went nowhere).
            context.server.ws.send({
              type: 'custom',
              event: 'morph-local-css-update',
              data: {},
            });

            return [];
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
      rootDir = config.root || rootDir;
      isDevServer = config.command === 'serve';
      validatePluginConfig(resolvedOptions, config);
    },

    // Build lifecycle hooks for CSS collection
    async buildStart() {

      // Start collecting component CSS with chunking options
      const cssOptions = resolvedOptions.css || {};
      const chunkingOptions = cssOptions.chunking || {};
      const bundlingOptions = cssOptions.bundling || {};
      const outputDir = bundlingOptions.outputDir || cssOptions.outputDir || 'dist/components';

      const collector = startCssCollection({
        outputDir,
        chunkingEnabled: chunkingOptions.enabled,
        chunkStrategy: chunkingOptions.strategy,
        maxChunkSize: chunkingOptions.maxChunkSize,
        treeShakingEnabled: cssOptions.treeShaking?.enabled,
        bundlingEnabled: bundlingOptions.enabled,
        debugEnabled: cssOptions.debug?.enabled,
        layersEnabled: cssOptions.layers?.enabled,
        layersOrder: cssOptions.layers?.order,
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

      // Detect morph libraries and process their CSS

      try {
        const nodeModulesPath = path.join(rootDir, 'node_modules');

        const cacheDir = path.join(
          rootDir,
          '.vite',
          'cache',
          'morph-processed'
        );
        const postcssConfig = await loadPostCSSConfig(rootDir);

        if (fs.existsSync(nodeModulesPath)) {
          const packages = fs.readdirSync(nodeModulesPath);

          for (const pkg of packages) {
            if (pkg.startsWith('@')) {
              const scopedPath = path.join(nodeModulesPath, pkg);
              if (fs.existsSync(scopedPath)) {
                const scopedPackages = fs.readdirSync(scopedPath);
                for (const scopedPkg of scopedPackages) {
                  const pkgPath = path.join(
                    scopedPath,
                    scopedPkg,
                    'package.json'
                  );
                  if (fs.existsSync(pkgPath)) {
                    try {
                      const pkgJson = JSON.parse(
                        fs.readFileSync(pkgPath, 'utf-8')
                      );
                      if (pkgJson.isMorphLibrary) {
                        const fullName = `${pkg}/${scopedPkg}`;

                        morphLibraries.push({
                          name: fullName,
                          path: path.join(scopedPath, scopedPkg),
                          cssEntry: 'assets/main.css',
                        });

                        // Process CSS immediately for dev mode
                        const library =
                          morphLibraries[morphLibraries.length - 1];
                        const result = await processLibraryMainCSS(
                          library,
                          cacheDir,
                          postcssConfig
                        );
                        libraryCssUrls.add(library.name, result.cssUrl);
                      }
                    } catch (e) {
                      // Skip invalid package.json
                    }
                  }
                }
              }
            } else {
              const pkgPath = path.join(nodeModulesPath, pkg, 'package.json');
              if (fs.existsSync(pkgPath)) {
                try {
                  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                  if (pkgJson.isMorphLibrary) {

                    morphLibraries.push({
                      name: pkg,
                      path: path.join(nodeModulesPath, pkg),
                      cssEntry: 'assets/main.css',
                    });

                    // Process CSS immediately for dev mode
                    const library = morphLibraries[morphLibraries.length - 1];
                    const result = await processLibraryMainCSS(
                      library,
                      cacheDir,
                      postcssConfig
                    );
                    libraryCssUrls.set(library.name, result.cssUrl);
                    libraryCssUrls.set(library.name, result.cssUrl);
                  }
                } catch (e) {
                  // Skip invalid package.json
                }
              }
            }
          }
        }

        for (const lib of morphLibraries) {
        }

        // Scan local themes directory
        const localThemesConfig = resolvedOptions.localThemes || {};
        const localThemesDir = path.join(
          rootDir,
          localThemesConfig.directory || 'src/themes'
        );

        if (fs.existsSync(localThemesDir)) {

          const localThemes = await extractThemesFromDir(localThemesDir);

          const localThemeNames = Object.keys(localThemes);

          if (localThemeNames.length > 0) {
            // Register local themes in global registry
            const localThemesRegistration = `
// Register local themes
if (typeof window !== 'undefined') {
  window.__MORPH_THEMES__ = window.__MORPH_THEMES__ || {};
  window.__MORPH_THEMES__['host'] = ${JSON.stringify(localThemes)};
  
  window.__MORPH_THEME_REGISTRY__ = window.__MORPH_THEME_REGISTRY__ || [];
  const alreadyHasHost = window.__MORPH_THEME_REGISTRY__.some(
    entry => entry.libraryName === 'host'
  );
  if (!alreadyHasHost) {
    window.__MORPH_THEME_REGISTRY__.push({
      libraryName: 'host',
      themes: ${JSON.stringify(localThemeNames)},
      defaultTheme: '${resolvedOptions.themes?.defaultTheme || ''}',
    });
  }
  
}
`;
            // Store for virtual module
            localThemesCode = localThemesRegistration;
          }
        }
      } catch (error) {
        console.error(
          '[vite-plugin-morph] ❌ Error detecting morph libraries:',
          error.message,
          error.stack
        );
      }
    },

    async buildEnd() {
      // Finalize CSS collection and generate bundle
      await finalizeCssCollection();
    },

    // Copy processed CSS to dist/assets for production builds
    generateBundle(options, bundle) {
      const cacheDir = path.join(rootDir, '.vite', 'cache', 'morph-processed');

      for (const [libraryName, cssUrl] of libraryCssUrls.entries()) {
        const fileName = cssUrl.split('/').pop();
        const cachePath = path.join(cacheDir, fileName);

        if (fs.existsSync(cachePath)) {
          const css = fs.readFileSync(cachePath, 'utf-8');
          const assetName = `morph-${libraryName.replace(/[^a-z0-9]/gi, '-')}.css`;

          bundle[assetName] = {
            type: 'asset',
            fileName: `assets/${assetName}`,
            source: css,
          };

        }
      }
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
  const { processMorphFile } = await import('../core/processor.js');
  return processMorphFile(code, id, options);
}

/**
 * Validate plugin configuration
 * @param {import('../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @param {import('vite').ResolvedConfig} config - Vite config
 */
function validatePluginConfig(options, config) {
  validateConfig(options, config);
}

/**
 * Create morph error with location information
 * @param {Error} error - Original error
 * @param {string} filePath - File path
 * @returns {import('../types/index.d.ts').MorphPluginError} Enhanced error
 */
async function createMorphError(error, filePath) {
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
    const result = await processMorphFileForHmr(content, filePath, options);

    if (result.cssExports) {
      return {
        css: result.cssExports,
        filePath,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.warn('Failed to generate CSS update:', error.message);
  }
  return null;
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
