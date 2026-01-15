/**
 * Vite plugin implementation for morph file processing
 * @fileoverview Core plugin logic and Vite integration
 * @author Peter Naydenov
 * @version 0.0.10
 */

import path, { join } from 'path';
import { createHash } from 'crypto';
import fs from 'fs';
import configModule, { resolveThemeDirectories } from './config.js';
import {
  startCssCollection,
  finalizeCssCollection,
  getCssCollector,
} from '../services/css-collection.js';
import { createThemeDiscovery } from '../services/theme-discovery.js';
import {
  detectMorphLibraries,
  getImportedPackages,
  loadPostCSSConfig,
  isCacheValid,
  findCachedFile,
  processLocalCss,
  getLocalCssCache,
} from '../services/library-css-processor.js';

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
  console.log('[vite-plugin-morph] 🔧 createMorphPlugin called');
  const resolvedOptions = resolveOptions(options);
  console.log('[vite-plugin-morph] ✅ Options resolved');
  let discoveredThemes = null;
  let rootDir = process.cwd();
  console.log('[vite-plugin-morph] 📁 rootDir:', rootDir);
  let cssDependencies = new Map(); // Track CSS dependencies
  let morphLibraries = []; // Store detected morph libraries
  let libraryCssUrls = new Map(); // Library name → processed CSS URL
  let localThemesCode = ''; // Local themes registration code

  console.log('[vite-plugin-morph] 🎯 Plugin initialized');

  return {
    name: 'vite-plugin-morph',
    enforce: 'pre', // Run before other plugins

    // Configure Vite to handle .morph files
    configureServer(server) {
      console.log('[vite-plugin-morph] 🔧 configureServer called');

      // Serve processed CSS from cache (dev mode)
      console.log('[vite-plugin-morph] 🔧 Registering CSS middleware...');
      server.middlewares.use('/@morph-processed', (req, res, next) => {
        console.log(
          '[vite-plugin-morph] 📥 CSS middleware called for:',
          req.url
        );
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

        console.log('[vite-plugin-morph] 📁 Looking for:', cachePath);

        if (fs.existsSync(cachePath)) {
          const css = fs.readFileSync(cachePath, 'utf-8');
          console.log('[vite-plugin-morph] ✅ Serving CSS:', cachePath);
          res.setHeader('Content-Type', 'text/css');
          res.end(css);
        } else {
          console.log('[vite-plugin-morph] ❌ CSS not found, calling next()');
          next();
        }
      });
      console.log('[vite-plugin-morph] ✅ CSS middleware registered');

      // Serve local CSS from globalCSS.directory with HMR support
      server.middlewares.use('/@morph-css/local', async (req, res, next) => {
        const urlPath = req.url.replace('/', ''); // e.g., "main.css"
        console.log(
          '[vite-plugin-morph] 📥 Local CSS middleware called for:',
          urlPath
        );

        // Skip theme files - they're handled by the theme middleware
        if (urlPath.startsWith('themes/')) {
          console.log(
            '[vite-plugin-morph] ⏭️ Skipping theme file, passing to next middleware'
          );
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
          console.log('[vite-plugin-morph] ❌ Local CSS not found:', cssPath);
          next();
          return;
        }

        // Check cache validity
        let cacheInfo = getLocalCssCache(cssPath, cacheDir);

        // Re-process if cache invalid
        if (!cacheInfo) {
          console.log(
            '[vite-plugin-morph] 🔄 Cache invalid, re-processing local CSS'
          );
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
          console.log(
            '[vite-plugin-morph] ✅ Using cached local CSS:',
            cacheInfo.cachePath
          );
        }

        if (fs.existsSync(cacheInfo.cachePath)) {
          const css = fs.readFileSync(cacheInfo.cachePath, 'utf-8');
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(css);
        } else {
          console.log('[vite-plugin-morph] ❌ Cached CSS not found');
          next();
        }
      });

      // Serve local theme CSS files for HMR
      server.middlewares.use('/@morph-css/local/themes', (req, res, next) => {
        const urlPath = req.url.replace('/', ''); // e.g., "light.css"
        console.log(
          '[vite-plugin-morph] 📥 Local theme CSS middleware called for:',
          urlPath
        );

        const localThemesConfig = resolvedOptions.localThemes || {};
        const themesDir = path.join(
          rootDir,
          localThemesConfig.directory || 'src/themes'
        );
        const cssPath = path.join(themesDir, urlPath);

        if (!fs.existsSync(cssPath)) {
          console.log(
            '[vite-plugin-morph] ❌ Local theme CSS not found:',
            cssPath
          );
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
          console.log('[vite-plugin-morph] 📁 Watching local CSS:', cssPath);
        }

        server.watcher.on('change', async (changedPath) => {
          if (changedPath.endsWith('.css') && changedPath.startsWith(cssDir)) {
            console.log(
              '[vite-plugin-morph] 🔄 Local CSS changed:',
              changedPath
            );
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
              console.log(
                '[vite-plugin-morph] 🗑️ Cleared cache for:',
                fileName
              );
            }

            // Send HMR update to browser
            const globalCssConfig = resolvedOptions.globalCSS || {};
            const entryFile = globalCssConfig.entry || 'main.css';
            if (changedPath.endsWith(entryFile)) {
              console.log(
                '[vite-plugin-morph] 📡 Sending HMR update for local CSS'
              );
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
            console.log(
              '[vite-plugin-morph] 📁 Watching theme:',
              `${library.name}/${themeFile}`
            );
          }

          server.watcher.on('change', async (changedPath) => {
            if (
              changedPath.endsWith('.css') &&
              changedPath.startsWith(themeDir)
            ) {
              console.log('[vite-plugin-morph] 🎨 Theme changed:', changedPath);

              // Extract theme name and library
              const themeFile = changedPath.split('/').pop();
              const themeName = themeFile.replace('.css', '');
              const libraryName = library.name;

              console.log(
                '[vite-plugin-morph] 📡 Sending HMR update for theme:',
                `${libraryName}/${themeName}`
              );

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

      console.log(
        '[vite-plugin-morph] 🔍 Local themes config:',
        localThemesConfig
      );
      console.log(
        '[vite-plugin-morph] 🔍 Local themes dir path:',
        localThemesDir
      );
      console.log(
        '[vite-plugin-morph] 🔍 Dir exists:',
        fs.existsSync(localThemesDir)
      );

      if (fs.existsSync(localThemesDir)) {
        const localThemeFiles = fs
          .readdirSync(localThemesDir)
          .filter((f) => f.endsWith('.css'));

        console.log(
          '[vite-plugin-morph] 📁 Local theme files found:',
          localThemeFiles
        );

        for (const themeFile of localThemeFiles) {
          const themePath = path.join(localThemesDir, themeFile);
          console.log('[vite-plugin-morph] 📁 Adding watcher for:', themePath);
          server.watcher.add(themePath);
        }

        // Test that watcher is working
        console.log(
          '[vite-plugin-morph] 📁 Watcher files:',
          server.watcher.getWatched()
        );

        server.watcher.on('all', (event, path) => {
          if (
            event === 'change' &&
            path.startsWith(localThemesDir) &&
            path.endsWith('.css')
          ) {
            console.log('[vite-plugin-morph] 🎨 FILE CHANGED:', path);

            const themeFile = path.split('/').pop();
            const themeName = themeFile.replace('.css', '');

            console.log(
              '[vite-plugin-morph] 📡 Sending HMR for theme:',
              themeName
            );

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
          const themeDiscovery = createThemeDiscovery({
            directories: themeDirs,
            defaultTheme: resolvedOptions.themes?.defaultTheme || 'default',
          });
          discoveredThemes = await themeDiscovery.discoverThemes();
        }

        const themesObject = {};
        for (const [name, theme] of discoveredThemes) {
          themesObject[name] = theme;
        }

        return `export default ${JSON.stringify(themesObject)};`;
      }
      if (id === '\0virtual:morph-css') {
        const collector = getCssCollector();
        const morphCss = Array.from(collector.components.values()).join('\n\n');
        return `export default ${JSON.stringify(morphCss)};`;
      }
      if (id === '\0virtual:morph-config') {
        const globalCSS = resolvedOptions.globalCSS || {};
        return `export default ${JSON.stringify({ globalCSS })};`;
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
      console.log('[vite-plugin-morph] Transform called for:', id);

      if (!id || !id.endsWith('.morph')) {
        return null;
      }

      try {
        const result = await processMorphFile(code, id, {
          ...resolvedOptions,
          cssVarsFile: resolvedOptions.css?.variablesFile,
          rootDir,
          test: process.env.NODE_ENV === 'test',
        });

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
            return context.modules;
          }
          return context.modules;
        }

        if (context.file.endsWith('.css') && resolvedOptions.globalCSS) {
          const globalCssDir = path.join(
            rootDir,
            resolvedOptions.globalCSS.directory
          );
          const isInGlobalDir = context.file.startsWith(globalCssDir);

          if (isInGlobalDir) {
            console.log(
              '[Vite Plugin Morph] Global CSS changed:',
              context.file
            );
            const cssContent = await context.read();
            const collector = getCssCollector();
            collector.updateGlobalCss(context.file, cssContent);

            const virtualModule = context.server.moduleGraph.getModuleById(
              '\0virtual:morph-client'
            );
            if (virtualModule) {
              for (const importer of virtualModule.importers) {
                context.server.moduleGraph.invalidateModule(importer);
              }
            }

            context.server.hot.send({
              type: 'update',
              updates: [
                {
                  type: 'js-update',
                  id: '\0virtual:morph-client',
                  timestamp: Date.now(),
                },
              ],
            });

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
      rootDir = config.root || rootDir;
      validatePluginConfig(resolvedOptions, config);
    },

    // Build lifecycle hooks for CSS collection
    async buildStart() {
      console.log('[vite-plugin-morph] 🚀 buildStart hook called');

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

      // Detect morph libraries and process their CSS
      console.log('[vite-plugin-morph] 🔍 Detecting morph libraries...');
      console.log('[vite-plugin-morph] 📁 rootDir:', rootDir);

      try {
        const {
          detectMorphLibraries,
          processLibraryMainCSS,
          loadPostCSSConfig,
        } = await import('../services/library-css-processor.js');

        const nodeModulesPath = path.join(rootDir, 'node_modules');
        console.log('[vite-plugin-morph] 📂 Scanning:', nodeModulesPath);

        const cacheDir = path.join(
          rootDir,
          '.vite',
          'cache',
          'morph-processed'
        );
        const postcssConfig = await loadPostCSSConfig(rootDir);

        if (fs.existsSync(nodeModulesPath)) {
          const packages = fs.readdirSync(nodeModulesPath);
          console.log(
            '[vite-plugin-morph] 📦 Found packages:',
            packages.length
          );

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
                        console.log(
                          '[vite-plugin-morph] ✅ Found morph library:',
                          fullName
                        );

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
                        console.log(
                          `[vite-plugin-morph] Processed CSS for ${library.name}: ${result.cssUrl}`
                        );
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
                    console.log(
                      '[vite-plugin-morph] ✅ Found morph library:',
                      pkg
                    );

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
                    console.log(
                      `[vite-plugin-morph] Processed CSS for ${library.name}: ${result.cssUrl}`
                    );
                    libraryCssUrls.set(library.name, result.cssUrl);
                    console.log(
                      `[vite-plugin-morph] Processed CSS for ${library.name}: ${result.cssUrl}`
                    );
                  }
                } catch (e) {
                  // Skip invalid package.json
                }
              }
            }
          }
        }

        console.log(
          '[vite-plugin-morph] 📊 Detected morph libraries:',
          morphLibraries.length
        );
        for (const lib of morphLibraries) {
          console.log('  -', lib.name, 'at', lib.path);
        }

        // Scan local themes directory
        const localThemesConfig = resolvedOptions.localThemes || {};
        const localThemesDir = path.join(
          rootDir,
          localThemesConfig.directory || 'src/themes'
        );

        if (fs.existsSync(localThemesDir)) {
          console.log('[vite-plugin-morph] 🔍 Scanning local themes...');

          const { extractThemesFromDir } =
            await import('../services/theme-variables.js');
          const localThemes = await extractThemesFromDir(localThemesDir);

          const localThemeNames = Object.keys(localThemes);
          console.log(
            '[vite-plugin-morph] ✅ Found local themes:',
            localThemeNames
          );

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
  
  console.log('[Morph Client] Registered local themes:', ${JSON.stringify(localThemeNames)});
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

          console.log(
            `[vite-plugin-morph] Included processed CSS for ${libraryName}: assets/${assetName}`
          );
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
