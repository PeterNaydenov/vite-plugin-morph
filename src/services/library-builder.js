/**
 * Library Builder Service
 * Orchestrates the creation of distributable component library packages
 * @fileoverview Main service for building library mode output
 */

import { build } from 'vite';
import { writeFile, mkdir, readFile, copyFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import { info, warn, debug } from '../utils/logger.js';
import { getCssCollector } from './css-collection.js';
import {
  extractThemesFromDir,
  extractThemeVariables,
} from './theme-variables.js';

/**
 * Library Builder Service
 */
export class LibraryBuilder {
  constructor(options = {}) {
    this.entry = options.entry || 'src/main.js';
    this.outputDir = options.outputDir || 'dist/library';
    this.libraryConfig = options.libraryConfig || options.library || {};
    this.rootDir = options.rootDir || process.cwd();
    this.themesDir = options.themesDir || 'src/themes';
    this.stylesDir = options.stylesDir || 'src/styles';
    // Fallback default theme inherited from the project's own `themes.defaultTheme`
    // plugin config, used when `library.defaultTheme` isn't explicitly set.
    this.projectDefaultTheme = options.projectDefaultTheme;
    this.discoveredThemes = {}; // Store themes for build process (name -> {variables, raw})
    this.hashMode = options.hashMode || 'development';
    this.postcssOptions = options.css?.postcss || {};
  }

  /**
   * Build the library package
   * @returns {Promise<void>}
   */
  async build() {
    info('Starting library build...');

    try {
      // 1. Discover themes first
      this.discoveredThemes = await this.discoverThemes();
      debug(`Discovered ${Object.keys(this.discoveredThemes).length} themes`);

      // 2. Scan and prepare morph components
      const morphFiles = await this.scanMorphFiles();
      debug(`Found ${morphFiles.length} morph files`);

      // 3. Generate main entry file
      await this.generateEntryFile(morphFiles);

      // 4. Build with Vite in library mode
      await this.buildWithVite();

      // 5. Generate package.json
      await this.generatePackageJson();

      // 6. Copy additional assets
      await this.copyAssets();

      info(`Library build complete: ${this.outputDir}`);
    } catch (error) {
      warn(`Library build failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover available themes (plain `.css` files in the themes directory)
   * @returns {Promise<Object.<string, {variables: Object, raw: string}>>} Discovered themes
   */
  async discoverThemes() {
    return await extractThemesFromDir(join(this.rootDir, this.themesDir));
  }

  /**
   * Scan for all .morph files in the project
   * @returns {Promise<Array>} Array of morph file paths
   */
  async scanMorphFiles() {
    const morphFiles = await glob('**/*.morph', {
      cwd: join(this.rootDir, 'src'),
      absolute: false,
    });

    return morphFiles.map((file) => `./${file}`);
  }

  /**
   * Generate the main entry file that exports all morph components
   * @param {Array} morphFiles - Array of morph file paths
   * @returns {Promise<void>}
   */
  async generateEntryFile(morphFiles) {
    // Generate import statements for each morph file
    const imports = morphFiles
      .map((file, index) => {
        const componentName = this.getComponentNameFromPath(file);
        return `import ${componentName} from '${file}';`;
      })
      .join('\n');

    // Generate export statements
    const exports = morphFiles
      .map((file) => {
        const componentName = this.getComponentNameFromPath(file);
        return `  ${componentName}`;
      })
      .join(',\n');

    // Generate the main entry file content
    const entryContent = `/**
 * Morph Library Entry Point
 * Auto-generated from morph component files
 */

${imports}

// Export all components
export {
${exports}
};

// Export as default object for convenience
export default {
${exports}
};
`;

    // Ensure src directory exists
    await mkdir(join(this.rootDir, 'src'), { recursive: true });

    // Write the entry file
    const entryPath = join(this.rootDir, this.entry);
    await writeFile(entryPath, entryContent, 'utf-8');

    info(`Generated entry file: ${entryPath}`);
  }

  /**
   * Extract component name from file path
   * @param {string} filePath - Path to morph file
   * @returns {string} Component name
   */
  getComponentNameFromPath(filePath) {
    // Convert path like './src/components/Button.morph' to 'Button'
    const baseName = filePath.split('/').pop().replace('.morph', '');
    // Convert kebab-case to PascalCase
    return baseName.replace(/(^\w|-\w)/g, (match) =>
      match.replace('-', '').toUpperCase()
    );
  }

  /**
   * Build library with Vite
   * @param {Map} themes - Discovered themes
   * @returns {Promise<void>}
   */
  async buildWithVite() {
    const { createMorphPlugin } = await import('../plugin/index.js');
    const self = this;

    // postcss-import/postcss-nested are structural (needed regardless of user
    // preference); autoprefixer respects the resolved css.postcss.autoprefixer
    // flag so a consumer that disabled it isn't overridden here. cssnano stays
    // off unconditionally to preserve CSS variables/structure for re-processing
    // by the host.
    const libraryPostcssPlugins = {
      'postcss-import': {},
      'postcss-nested': {},
    };
    if (this.postcssOptions.autoprefixer !== false) {
      libraryPostcssPlugins.autoprefixer = { grid: true };
    }

    const viteConfig = {
      root: this.rootDir,
      configFile: false, // Don't load external vite.config.js
      css: {
        postcss: {
          plugins: libraryPostcssPlugins,
        },
      },
      build: {
        lib: {
          entry: join(this.rootDir, this.entry),
          name: this.libraryConfig.name || 'MorphLibrary',
          fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
          formats: ['es', 'cjs'],
        },
        outDir: this.outputDir,
        emptyOutDir: true,
        cssMinify: false, // Preserve original CSS formatting
        rollupOptions: {
          external: ['@peter.naydenov/morph'],
          output: {
            globals: {
              '@peter.naydenov/morph': 'Morph',
            },
            assetFileNames: (assetInfo) => {
              if (assetInfo.name.endsWith('.css')) {
                if (assetInfo.name.includes('theme')) {
                  return 'themes/[name][extname]';
                }
                return 'assets/[name][extname]';
              }
              return 'assets/[name][extname]';
            },
          },
        },
      },
      plugins: [
        createMorphPlugin({
          // Configure plugin for library mode
          hashMode: this.hashMode,
          css: {
            chunking: {
              enabled: false, // Disable chunking for library builds
            },
          },
        }),
        // Library mode post-processing plugin
        {
          name: 'vite-plugin-morph-library-mode',
          enforce: 'post',

          async generateBundle(options, bundle) {
            // Collect CSS assets from morph components
            const cssAssets = [];

            // Per-component CSS (name -> scoped CSS rule) and the concatenated
            // blob for assets/components.css, read directly from the CSS
            // collection singleton that the plugin's own transform hook
            // populated while this same Vite build ran. This used to be
            // regex-extracted from `const css = ...`/`const componentsCSS = ...`
            // literals in the bundled JS chunks, but Rolldown (Vite 8's default
            // bundler) renames local variables even without minification, so
            // those patterns never matched and the registry silently stayed
            // empty in real builds.
            const collector = getCssCollector();
            const allComponentsCSS = {};
            let componentCss = '';
            for (const [componentName, entry] of collector.components) {
              allComponentsCSS[componentName] = entry.css;
              componentCss += entry.css + '\n';
            }

            // Create component CSS asset
            if (componentCss.trim()) {
              this.emitFile({
                type: 'asset',
                fileName: 'assets/components.css',
                source: componentCss.trim(),
              });
              cssAssets.push('assets/components.css');
            }

            // Copy all CSS files from styles directory, and also collect their
            // text content as this library's general CSS (embedded into the
            // generated client module for applyGeneralStyles() — see below).
            const stylesDir = join(self.rootDir, self.stylesDir);
            const cssFiles = await glob('**/*.css', {
              cwd: stylesDir,
              absolute: false,
            });

            const generalCssParts = [];

            for (const cssFile of cssFiles) {
              const cssPath = join(stylesDir, cssFile);
              const cssSource = await readFile(cssPath, 'utf-8');
              const assetName = `assets/${cssFile}`;
              this.emitFile({
                type: 'asset',
                fileName: assetName,
                source: cssSource,
              });
              cssAssets.push(assetName);
              generalCssParts.push(cssSource);
            }

            // Wrapped in @layer app for consistency with how the host's own
            // general CSS is embedded (src/plugin/index.js's virtual:morph-config).
            const generalCssBody = generalCssParts.join('\n\n');
            const generalCssContent = generalCssBody
              ? `@layer app {\n${generalCssBody}\n}`
              : '';

            debug(`Copied ${cssFiles.length} CSS files from ${self.stylesDir}`);

            // Copy runtime.js from plugin directory
            const pluginDir = dirname(fileURLToPath(import.meta.url));
            const runtimePath = join(pluginDir, '../client/runtime.js');
            try {
              const runtimeSource = await readFile(runtimePath, 'utf-8');
              this.emitFile({
                type: 'asset',
                fileName: 'runtime.js',
                source: runtimeSource,
              });
              debug(`Copied runtime.js from plugin`);
            } catch (error) {
              warn(`Failed to copy runtime.js: ${error.message}`);
            }

            // Theme content was already discovered in build() as self.discoveredThemes
            // (name -> {variables, raw}) — reused here for both themes.json and client.mjs.
            const themes = self.discoveredThemes;

            // Generate client module with theme content and componentsCSS
            const clientCode = self.generateClientModule(
              cssAssets,
              themes,
              themes,
              allComponentsCSS,
              generalCssContent
            );

            this.emitFile({
              type: 'asset',
              fileName: 'client.mjs',
              source: clientCode,
            });

            if (Object.keys(themes).length > 0) {
              this.emitFile({
                type: 'asset',
                fileName: 'themes.json',
                source: JSON.stringify(themes, null, 2),
              });
              debug(
                `Generated themes.json with ${Object.keys(themes).length} themes`
              );
            }

            // Add re-exports to main index.mjs
            const mainIndex = bundle['index.mjs'];
            if (mainIndex && mainIndex.type === 'chunk') {
              mainIndex.code += `
// Import client runtime for CSS initialization
import './client.mjs';

// Re-export runtime functions for convenience
export { applyStyles, themesControl } from './runtime.js';
`;
              debug(
                `Added client.mjs import and runtime re-exports to index.mjs`
              );
            }
          },
        },
      ],
    };

    await build(viteConfig);
  }

  /**
   * Generate package.json for the library
   * @returns {Promise<void>}
   */
  async generatePackageJson() {
    const packageJson = {
      name: this.libraryConfig.name || 'morph-library',
      version: this.libraryConfig.version || '1.0.0',
      isMorphLibrary: true, // NEW: Marker for morph library detection
      description:
        this.libraryConfig.description ||
        'Component library built with vite-plugin-morph',
      main: './index.js',
      module: './index.mjs',
      exports: {
        '.': {
          import: './index.mjs',
          require: './index.js',
        },
        './client': './client.mjs',
        './themes/*': './themes/*',
        './assets/*': './assets/*',
      },
      files: [
        'index.js',
        'index.mjs',
        'client.mjs',
        'runtime.js',
        'assets/',
        'themes/',
      ],
      peerDependencies: {
        '@peter.naydenov/morph': '^3.3.0',
      },
      ...this.libraryConfig.packageJson,
    };

    const packageJsonPath = join(this.outputDir, 'package.json');
    await writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
    info(`Generated package.json`);
  }

  /**
   * Copy additional assets
   * @returns {Promise<void>}
   */
  async copyAssets() {
    const assetsToCopy = ['README.md', 'LICENSE'];

    for (const asset of assetsToCopy) {
      try {
        await copyFile(join(this.rootDir, asset), join(this.outputDir, asset));
        debug(`Copied ${asset}`);
      } catch (error) {
        debug(`Skipped ${asset}`);
      }
    }

    // Copy themes directory if it exists
    const themesSrc = join(this.rootDir, this.themesDir);
    const themesDest = join(this.outputDir, 'themes');

    try {
      const themeFiles = await glob('**/*', {
        cwd: themesSrc,
        absolute: false,
      });

      if (themeFiles.length > 0) {
        await mkdir(themesDest, { recursive: true });

        for (const themeFile of themeFiles) {
          const srcPath = join(themesSrc, themeFile);
          const destPath = join(themesDest, themeFile);
          await mkdir(dirname(destPath), { recursive: true });
          await copyFile(srcPath, destPath);
        }

        debug(`Copied ${themeFiles.length} theme files from ${this.themesDir}`);
      } else {
        debug(`No theme files found in ${this.themesDir}`);
      }
    } catch (error) {
      debug(`No themes directory to copy`);
    }
  }

  /**
   * Generate unified client module for library
   * @param {Array} cssAssets - CSS asset paths
   * @param {Map} themeNamesMap - Available theme names (Map)
   * @param {Object} extractedThemes - Extracted themes with variables { themeName: { variables, raw } }
   * @param {Object} componentsCSS - Components CSS mapping { componentName: '.scoped { ... }' }
   * @returns {string} Client module code
   */
  generateClientModule(
    cssAssets,
    themesObject,
    extractedThemes = {},
    componentsCSS = {},
    generalCss = ''
  ) {
    const themeNames = Object.keys(themesObject);
    const defaultTheme =
      this.libraryConfig.defaultTheme ||
      this.projectDefaultTheme ||
      themeNames[0] ||
      'default';
    const libraryName = this.libraryConfig.name || 'morph-library';

    const cssImports = cssAssets
      .map((asset, i) => `import css${i} from './${asset}?url';`)
      .join('\n');

    const themeImports = themeNames
      .map((name) => `import theme_${name} from './themes/${name}.css?url';`)
      .join('\n');

    // Generate theme URL mapping
    const themeUrls = {};
    themeNames.forEach((name, index) => {
      themeUrls[name] = `theme_${name}`;
    });

    // All CSS assets are loaded as general CSS
    const cssUrls = cssAssets.map((asset) => asset.replace('./', ''));

    // Generate applyStyles function using componentsCSS
    const applyStylesCode = this.generateApplyStylesFunction(
      libraryName,
      componentsCSS
    );

    // Theme registration code
    const themeRegistration = `
// Theme registration for runtime
const libraryName = '${libraryName}';
const libraryThemes = ${JSON.stringify(themeNames)};
const libraryDefaultTheme = '${defaultTheme}';

// Register themes with global registry
if (typeof window !== 'undefined') {
  // Initialize or get existing theme registry
  window.__MORPH_THEME_REGISTRY__ = window.__MORPH_THEME_REGISTRY__ || [];
  
  // Check if already registered
  const alreadyRegistered = window.__MORPH_THEME_REGISTRY__.some(
    entry => entry.libraryName === libraryName
  );
  
  if (!alreadyRegistered) {
    window.__MORPH_THEME_REGISTRY__.push({
      libraryName,
      themes: libraryThemes,
      defaultTheme: libraryDefaultTheme,
    });
  }

  // Store theme content for runtime loading
  window.__MORPH_THEMES__ = window.__MORPH_THEMES__ || {};
  if (!window.__MORPH_THEMES__[libraryName]) {
    window.__MORPH_THEMES__[libraryName] = {};
  }
  
  // Load extracted theme content into runtime registry
  window.__MORPH_THEMES__[libraryName] = ${JSON.stringify(extractedThemes)};
}
`;

    return `
${cssImports}
${themeImports}
import { setMorphConfig, themesControl, applyGeneralStyles } from './runtime.js';
${applyStylesCode}
${themeRegistration}

// Library mode configuration for unified runtime
const config = {
  environment: 'library',
  css: '', // CSS is loaded via URLs in library mode
  themes: ${JSON.stringify(themeNames)},
  defaultTheme: '${defaultTheme}',
  themeUrls: ${JSON.stringify(themeUrls)},
  cssUrls: ${JSON.stringify(cssUrls)},  // Fallback raw CSS URLs
  libraryName: '${libraryName}',  // Library name for CSS URL construction
  componentsCSS: ${JSON.stringify(componentsCSS)},  // Components CSS mapping
  generalCss: ${JSON.stringify(generalCss)},  // This library's general/global CSS, embedded as text
};

// Initialize the unified runtime
setMorphConfig(config);

// Auto-apply component styles + theme on module load. General CSS is NOT
// auto-applied — call applyGeneralStyles() explicitly if you want this
// library's general/base styles too (useful when combining several
// libraries and you only want one of their general CSS to take effect).
applyStyles();

// Export unified runtime API
export { applyStyles, themesControl, applyGeneralStyles };
export const __morphConfig__ = config;
`;
  }

  /**
   * Generate applyStyles function that uses componentsCSS
   * @param {string} libraryName - Library name for source prefix
   * @param {Object} componentsCSS - Components CSS mapping
   * @returns {string} JavaScript code for applyStyles function
   */
  generateApplyStylesFunction(libraryName, componentsCSS) {
    return `
// Components CSS mapping for this library
const libraryComponentsCSS = ${JSON.stringify(componentsCSS)};
const librarySource = '${libraryName}';

// applyStyles function for this library
function applyStyles() {
  // Register each component's CSS with source prefix in global storage
  if (typeof window !== 'undefined') {
    window.__MORPH_COMPONENTS_CSS__ = window.__MORPH_COMPONENTS_CSS__ || {};
    
    for (const [componentName, cssRule] of Object.entries(libraryComponentsCSS)) {
      const key = componentName + '/' + librarySource;
      window.__MORPH_COMPONENTS_CSS__[key] = cssRule;
    }
  }
  
  // Inject CSS into DOM via <style> tags for development
  if (typeof document !== 'undefined') {
    for (const [componentName, cssRule] of Object.entries(libraryComponentsCSS)) {
      const styleId = 'morph-css-' + componentName.replace(/[^a-zA-Z0-9]/g, '-');
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = cssRule;
    }
  }
}

// HMR handling for CSS updates (only in non-test environments)
if (typeof importMeta !== 'undefined' && importMeta.hot) {
  importMeta.hot.accept(() => {
    // Re-apply styles when module changes
    applyStyles();
  });
}
`;
  }
}

export function createLibraryBuilder(options = {}) {
  return new LibraryBuilder(options);
}

export default LibraryBuilder;
