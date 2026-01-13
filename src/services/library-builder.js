/**
 * Library Builder Service
 * Orchestrates the creation of distributable component library packages
 * @fileoverview Main service for building library mode output
 */

import { build } from 'vite';
import { writeFile, mkdir, readFile, copyFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { glob } from 'glob';
import { info, warn, debug } from '../utils/logger.js';
import { createThemeDiscovery } from './theme-discovery.js';
import { getCssCollector } from './css-collection.js';

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
  }

  /**
   * Build the library package
   * @returns {Promise<void>}
   */
  async build() {
    info('Starting library build...');

    try {
      // 1. Discover themes first
      const themes = await this.discoverThemes();
      debug(`Discovered ${themes.size} themes`);

      // 2. Scan and prepare morph components
      const morphFiles = await this.scanMorphFiles();
      debug(`Found ${morphFiles.length} morph files`);

      // 3. Generate main entry file
      await this.generateEntryFile(morphFiles);

      // 4. Build with Vite in library mode
      await this.buildWithVite(themes);

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
   * Discover available themes
   * @returns {Promise<Map>} Discovered themes
   */
  async discoverThemes() {
    const themeDiscovery = createThemeDiscovery({
      directories: [join(this.rootDir, this.themesDir)],
      defaultTheme: this.libraryConfig.defaultTheme || 'default',
    });

    return await themeDiscovery.discoverThemes();
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
  async buildWithVite(themes) {
    const { createMorphPlugin } = await import('../plugin/index.js');
    const self = this;

    const viteConfig = {
      root: this.rootDir,
      configFile: false, // Don't load external vite.config.js
      css: {
        postcss: {
          plugins: {
            'postcss-import': {},
            'postcss-nested': {},
            autoprefixer: { grid: true },
            // Disable cssnano to preserve CSS variables and structure
          },
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
            let componentCss = '';

            // Extract CSS from generated JS chunks that contain morph components
            for (const [fileName, chunk] of Object.entries(bundle)) {
              if (chunk.type === 'chunk' && chunk.code) {
                // Look for CSS export from morph processing
                const cssMatch = chunk.code.match(/const css = ([^;]+);/);
                if (cssMatch) {
                  try {
                    const css = JSON.parse(cssMatch[1]);
                    componentCss += css + '\n';
                  } catch (e) {
                    debug(`Failed to parse css from ${fileName}`);
                  }
                }
              }
            }

            // Create component CSS asset
            if (componentCss.trim()) {
              bundle['assets/components.css'] = {
                type: 'asset',
                fileName: 'assets/components.css',
                source: componentCss.trim(),
              };
              cssAssets.push('assets/components.css');
            }

            // Copy all CSS files from styles directory
            const stylesDir = join(self.rootDir, self.stylesDir);
            const cssFiles = await glob('**/*.css', {
              cwd: stylesDir,
              absolute: false,
            });

            for (const cssFile of cssFiles) {
              const cssPath = join(stylesDir, cssFile);
              const cssSource = await readFile(cssPath, 'utf-8');
              const assetName = `assets/${cssFile}`;
              bundle[assetName] = {
                type: 'asset',
                fileName: assetName,
                source: cssSource,
              };
              cssAssets.push(assetName);
            }

            debug(`Copied ${cssFiles.length} CSS files from ${self.stylesDir}`);

            // Generate client module
            const clientCode = self.generateClientModule(cssAssets, themes);

            bundle['client.mjs'] = {
              type: 'asset',
              fileName: 'client.mjs',
              source: clientCode,
            };

            // Copy runtime.js
            const runtimePath = join(self.rootDir, 'src/client/runtime.js');
            try {
              const runtimeSource = await readFile(runtimePath, 'utf-8');
              bundle['runtime.js'] = {
                type: 'asset',
                fileName: 'runtime.js',
                source: runtimeSource,
              };
            } catch (error) {
              warn(`Failed to copy runtime.js`);
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
   * @param {Map} themes - Available themes
   * @returns {string} Client module code
   */
  generateClientModule(cssAssets, themes) {
    const themeNames = Array.from(themes.keys());
    const defaultTheme =
      this.libraryConfig.defaultTheme || themeNames[0] || 'default';

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

    return `
${cssImports}
${themeImports}
import { setMorphConfig, applyStyles, themesControl } from './runtime.js';

// Library mode configuration for unified runtime
const config = {
  environment: 'library',
  css: '', // CSS is loaded via URLs in library mode
  themes: ${JSON.stringify(themeNames)},
  defaultTheme: '${defaultTheme}',
  themeUrls: ${JSON.stringify(themeUrls)},
  cssUrls: ${JSON.stringify(cssUrls)}
};

// Initialize the unified runtime
setMorphConfig(config);

// Auto-apply styles on module load
applyStyles();

// Export unified runtime API
export { applyStyles, themesControl };
export const __morphConfig__ = config;
`;
  }
}

export function createLibraryBuilder(options = {}) {
  return new LibraryBuilder(options);
}

export default LibraryBuilder;
