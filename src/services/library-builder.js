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
        this.libraryConfig = options.library || {};
        this.rootDir = options.rootDir || process.cwd();
        this.themesDir = options.themesDir || 'themes';
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

            // 2. Build with Vite in library mode
            await this.buildWithVite(themes);

            // 3. Generate package.json
            await this.generatePackageJson();

            // 4. Copy additional assets
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
     * Build library with Vite
     * @param {Map} themes - Discovered themes
     * @returns {Promise<void>}
     */
    async buildWithVite(themes) {
        const { createMorphPlugin } = await import('../plugin/index.js');
        const self = this;

        const viteConfig = {
            root: this.rootDir,
            build: {
                lib: {
                    entry: join(this.rootDir, this.entry),
                    name: this.libraryConfig.name || 'MorphLibrary',
                    fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
                    formats: ['es', 'cjs']
                },
                outDir: this.outputDir,
                emptyOutDir: true,
                rollupOptions: {
                    external: ['@peter.naydenov/morph'],
                    output: {
                        globals: {
                            '@peter.naydenov/morph': 'Morph'
                        },
                        assetFileNames: (assetInfo) => {
                            if (assetInfo.name.endsWith('.css')) {
                                if (assetInfo.name.includes('theme')) {
                                    return 'themes/[name][extname]';
                                }
                                return 'assets/[name][extname]';
                            }
                            return 'assets/[name][extname]';
                        }
                    }
                }
            },
            plugins: [
                createMorphPlugin(),
                // Library mode post-processing plugin
                {
                    name: 'vite-plugin-morph-library-mode',
                    enforce: 'post',

                    async generateBundle(options, bundle) {
                        // Collect CSS assets
                        const cssAssets = [];

                        for (const [fileName] of Object.entries(bundle)) {
                            if (fileName.endsWith('.css') && fileName.startsWith('assets/')) {
                                cssAssets.push(fileName);
                            }
                        }

                        // Copy main.css if exists
                        const mainCssPath = join(self.rootDir, self.stylesDir, 'main.css');
                        try {
                            const mainCssSource = await readFile(mainCssPath, 'utf-8');
                            bundle['assets/main.css'] = {
                                type: 'asset',
                                fileName: 'assets/main.css',
                                source: mainCssSource
                            };
                            cssAssets.unshift('assets/main.css');
                        } catch (error) {
                            debug(`No main.css found`);
                        }

                        // Generate client module
                        const clientCode = self.generateClientModule(cssAssets, themes);

                        bundle['client.mjs'] = {
                            type: 'asset',
                            fileName: 'client.mjs',
                            source: clientCode
                        };

                        // Copy runtime.js
                        const runtimePath = join(self.rootDir, 'src/client/runtime.js');
                        try {
                            const runtimeSource = await readFile(runtimePath, 'utf-8');
                            bundle['runtime.js'] = {
                                type: 'asset',
                                fileName: 'runtime.js',
                                source: runtimeSource
                            };
                        } catch (error) {
                            warn(`Failed to copy runtime.js`);
                        }
                    }
                }
            ]
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
            description: this.libraryConfig.description || 'Component library built with vite-plugin-morph',
            main: './index.js',
            module: './index.mjs',
            exports: {
                '.': {
                    import: './index.mjs',
                    require: './index.js'
                },
                './client': './client.mjs',
                './themes/*': './themes/*',
                './assets/*': './assets/*'
            },
            files: [
                'index.js',
                'index.mjs',
                'client.mjs',
                'runtime.js',
                'assets/',
                'themes/'
            ],
            peerDependencies: {
                '@peter.naydenov/morph': '^3.3.0'
            },
            ...this.libraryConfig.packageJson
        };

        const packageJsonPath = join(this.outputDir, 'package.json');
        await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
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
    }

    /**
     * Generate client module for library
     * @param {Array} cssAssets - CSS asset paths
     * @param {Map} themes - Available themes
     * @returns {string} Client module code
     */
    generateClientModule(cssAssets, themes) {
        const themeNames = Array.from(themes.keys());
        const defaultTheme = this.libraryConfig.defaultTheme || themeNames[0] || 'default';

        const cssImports = cssAssets.map((asset, i) =>
            `import css${i} from './${asset}?url';`
        ).join('\n');

        const themeImports = themeNames.map(name =>
            `import theme_${name} from './themes/${name}.css?url';`
        ).join('\n');

        // Generate theme URL mapping
        const themeUrls = {};
        themeNames.forEach((name, index) => {
            themeUrls[name] = `theme_${name}`;
        });

        return `
${cssImports}
${themeImports}
import { setMorphConfig } from './runtime.js';

// Library mode configuration for unified runtime
const config = {
  environment: 'library',
  css: '', // CSS is loaded via URLs in library mode
  themes: ${JSON.stringify(themeNames)},
  defaultTheme: '${defaultTheme}',
  themeUrls: ${JSON.stringify(themeUrls)}
};

setMorphConfig(config);

// Export config for debugging
export { config as __morphConfig__ };

// Re-export unified runtime functions
export { applyStyles, themesControl } from './runtime.js';
`;
    }
}

export function createLibraryBuilder(options = {}) {
    return new LibraryBuilder(options);
}

export default LibraryBuilder;
