/**
 * Build Library Function
 * Main entry point for building distributable component libraries
 * @fileoverview Exported function for library build scripts
 */

import { createLibraryBuilder } from './services/library-builder.js';
import { createMorphPlugin } from './plugin/index.js';
import { info } from './utils/logger.js';

/**
 * Build a distributable component library
 * @param {Object} config - Build configuration
 * @param {string} [config.entry='src/main.js'] - Entry point file
 * @param {Object} config.library - Library configuration
 * @param {string} config.library.name - Package name
 * @param {string} [config.library.version] - Package version
 * @param {string} [config.library.description] - Package description
 * @param {string} [config.library.author] - Package author
 * @param {string} [config.library.license] - Package license
 * @param {Object} [config.library.packageJson] - Additional package.json fields
 * @param {string} [config.outputDir='dist/library'] - Output directory
 * @param {string} [config.rootDir=process.cwd()] - Project root directory
 * @param {Object} [config.morphPlugin] - Morph plugin options
 * @returns {Promise<void>}
 *
 * @example
 * ```javascript
 * import { buildLibrary } from '@peter.naydenov/vite-plugin-morph';
 *
 * await buildLibrary({
 *   entry: 'src/index.js',
 *   library: {
 *     name: '@myorg/my-components',
 *     version: '1.0.0',
 *     description: 'My component library',
 *     author: 'John Doe',
 *     license: 'MIT'
 *   }
 * });
 * ```
 */
export async function buildLibrary(config = {}) {
  const {
    entry = 'src/main.js',
    library = {},
    outputDir = 'dist/library',
    rootDir = process.cwd(),
    morphPlugin = {},
  } = config;

  // Validate required fields
  if (!library.name) {
    throw new Error('library.name is required for buildLibrary()');
  }

  info(`Building library: ${library.name}`);
  info(`Entry: ${entry}`);
  info(`Output: ${outputDir}`);

  // Create builder instance
  const builder = createLibraryBuilder({
    entry,
    outputDir,
    library,
    rootDir,
    ...morphPlugin,
  });

  // Execute build
  await builder.build();

  info(`✓ Library build complete!`);
  info(`  Package: ${outputDir}/package.json`);
  info(`  To publish: cd ${outputDir} && npm publish`);
}

export default buildLibrary;
