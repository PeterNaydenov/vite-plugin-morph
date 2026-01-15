/**
 * Library CSS Processor Service
 * Handles detection of morph libraries and processing of main.css files
 * @fileoverview Service for detecting morph libraries and processing main.css with PostCSS
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { createHash } from 'crypto';
import { debug, info, warn } from '../utils/logger.js';

/**
 * Detect morph libraries that have isMorphLibrary marker
 * @param {string} projectRoot - Path to host project
 * @param {Set<string>} importedPackages - Packages imported by host
 * @returns {Promise<Array<Library>>} Detected morph libraries
 */
export async function detectMorphLibraries(projectRoot, importedPackages) {
  const detectedLibraries = [];

  debug(
    'Detecting morph libraries, imported packages:',
    Array.from(importedPackages)
  );

  for (const packageName of importedPackages) {
    try {
      // Resolve package path
      const packagePath = resolve(projectRoot, 'node_modules', packageName);

      // Check if package directory exists
      if (!existsSync(packagePath)) {
        debug(
          `Skipping ${packageName}: Package path not found: ${packagePath}`
        );
        continue;
      }

      // Read package.json
      const packageJsonPath = join(packagePath, 'package.json');
      if (!existsSync(packageJsonPath)) {
        debug(`Skipping ${packageName}: No package.json found`);
        continue;
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check for isMorphLibrary marker
      if (!packageJson.isMorphLibrary) {
        debug(`Skipping ${packageName}: No isMorphLibrary marker`);
        continue;
      }

      // Check if assets/main.css exists
      const mainCssPath = join(packagePath, 'assets', 'main.css');
      if (!existsSync(mainCssPath)) {
        debug(`Skipping ${packageName}: No main.css found`);
        continue;
      }

      // Add to detected libraries
      detectedLibraries.push({
        name: packageName,
        version: packageJson.version || '0.0.0',
        path: packagePath,
        cssEntry: 'assets/main.css',
      });

      debug(`Detected morph library: ${packageName} v${packageJson.version}`);
    } catch (error) {
      // Silent skip on errors
      debug(`Failed to process package ${packageName}:`, error.message);
    }
  }

  return detectedLibraries;
}

/**
 * Process library's main.css with PostCSS
 * @param {Library} library - Library object
 * @param {string} cacheDir - Cache directory path
 * @param {Object} postcssConfig - Host project's PostCSS config
 * @returns {Promise<ProcessResult>} Cache paths and URLs
 */
export async function processLibraryMainCSS(library, cacheDir, postcssConfig) {
  const mainCssPath = join(library.path, 'assets', 'main.css');

  // Read main.css
  const css = readFileSync(mainCssPath, 'utf-8');
  debug(`Processing main.css for ${library.name}, size: ${css.length} bytes`);

  // Load PostCSS and plugins
  const postcss = await import('postcss');
  const postcssImport = await import('postcss-import');

  // Build PostCSS config
  const plugins = [
    postcssImport.default({
      path: [join(library.path, 'assets'), join(library.path, 'themes')],
    }),
  ];

  // Add host project's PostCSS plugins if any
  if (postcssConfig.plugins && postcssConfig.plugins.length > 0) {
    plugins.push(...postcssConfig.plugins);
  }

  // Process CSS
  const result = await postcss.default(plugins).process(css, {
    from: mainCssPath,
    map: {
      inline: false,
      annotation: false,
    },
  });

  // Create MD5 hash
  const hash = createHash('MD5').update(result.css).digest('hex');

  // Ensure cache directory exists
  const fs = await import('fs/promises');
  await fs.mkdir(cacheDir, { recursive: true });

  // Write processed CSS
  const safeName = library.name.replace('@', '').replace(/\//g, '-');
  const cacheFileName = `${safeName}-${hash}.css`;
  const cachePath = join(cacheDir, cacheFileName);

  await fs.writeFile(cachePath, result.css, 'utf-8');

  // Write source map
  if (result.map) {
    const mapPath = join(cacheDir, cacheFileName + '.map');
    await fs.writeFile(mapPath, result.map.toString(), 'utf-8');
    debug(`Wrote source map: ${mapPath}`);
  }

  const cssUrl = `/@morph-processed/${cacheFileName}`;

  info(`Processed CSS for ${library.name}: ${cssUrl}`);

  return {
    cachePath,
    mapPath: result.map ? cachePath + '.map' : null,
    hash,
    cssUrl,
  };
}

/**
 * Process local CSS file (from globalCSS.directory) with PostCSS and HMR support
 * @param {string} cssPath - Path to the CSS file
 * @param {string} cssDir - Directory containing local CSS files
 * @param {string} cacheDir - Cache directory path
 * @param {Object} postcssConfig - Host project's PostCSS config
 * @returns {Promise<ProcessResult>} Cache paths and URLs
 */
export async function processLocalCss(
  cssPath,
  cssDir,
  cacheDir,
  postcssConfig
) {
  const css = readFileSync(cssPath, 'utf-8');
  const fileName = cssPath.split('/').pop();
  debug(`Processing local CSS: ${cssPath}, size: ${css.length} bytes`);

  // Load PostCSS and plugins
  const postcss = await import('postcss');
  const postcssImport = await import('postcss-import');

  // Build PostCSS config
  const plugins = [
    postcssImport.default({
      path: [cssDir],
    }),
  ];

  // Add host project's PostCSS plugins if any
  if (postcssConfig.plugins && postcssConfig.plugins.length > 0) {
    plugins.push(...postcssConfig.plugins);
  }

  // Process CSS
  const result = await postcss.default(plugins).process(css, {
    from: cssPath,
    map: {
      inline: false,
      annotation: false,
    },
  });

  // Use mtime-based cache key instead of hash
  const sourceMtime = statSync(cssPath).mtimeMs;
  const cacheKey = Math.floor(sourceMtime);
  const cacheFileName = `local-${fileName.replace('.css', '')}-${cacheKey}.css`;
  const cachePath = join(cacheDir, cacheFileName);

  // Ensure cache directory exists
  const fs = await import('fs/promises');
  await fs.mkdir(cacheDir, { recursive: true });

  // Write processed CSS
  await fs.writeFile(cachePath, result.css, 'utf-8');

  // Write source map
  if (result.map) {
    const mapPath = join(cacheDir, cacheFileName + '.map');
    await fs.writeFile(mapPath, result.map.toString(), 'utf-8');
    debug(`Wrote source map: ${mapPath}`);
  }

  const cssUrl = `/@morph-css/local/${fileName}`;

  debug(`Processed local CSS: ${cssUrl}`);

  return {
    cachePath,
    mapPath: result.map ? cachePath + '.map' : null,
    mtime: sourceMtime,
    cssUrl,
    fileName,
  };
}

/**
 * Check if local CSS cache is valid based on file mtime
 * @param {string} cssPath - Path to CSS file
 * @param {string} cacheDir - Cache directory
 * @returns {Object|null} Cached file info or null if invalid
 */
export function getLocalCssCache(cssPath, cacheDir) {
  if (!existsSync(cssPath)) {
    return null;
  }

  if (!existsSync(cacheDir)) {
    return null;
  }

  const sourceMtime = statSync(cssPath).mtimeMs;
  const fileName = cssPath.split('/').pop();
  const baseName = fileName.replace('.css', '');

  // Find cache file with matching mtime
  const files = readdirSync(cacheDir);
  const cacheFile = files.find((file) => {
    // Match pattern: local-{baseName}-{mtime}.css
    return file.startsWith(`local-${baseName}-`) && file.endsWith('.css');
  });

  if (!cacheFile) {
    return null;
  }

  const cachePath = join(cacheDir, cacheFile);
  const cacheMtime = parseInt(
    cacheFile.split('-').pop().replace('.css', ''),
    10
  );

  if (cacheMtime >= sourceMtime) {
    return {
      cachePath,
      mtime: cacheMtime,
      fileName,
    };
  }

  return null;
}

/**
 * Extract imported package names from Vite module graph
 * @param {import('vite').ModuleGraph} moduleGraph - Vite module graph
 * @returns {Set<string>} Set of package names
 */
export function getImportedPackages(moduleGraph) {
  const importedPackages = new Set();

  if (!moduleGraph) {
    debug('No module graph available');
    return importedPackages;
  }

  // Iterate through all modules
  for (const module of moduleGraph.modulesByUrl.values()) {
    if (!module.id) continue;

    // Extract package name from module id
    const packageName = extractPackageName(module.id);
    if (packageName) {
      importedPackages.add(packageName);
    }
  }

  debug(`Imported packages: ${Array.from(importedPackages)}`);
  return importedPackages;
}

/**
 * Extract package name from module id or import path
 * @param {string} moduleId - Module identifier
 * @returns {string|null} Package name or null
 */
function extractPackageName(moduleId) {
  // Match: @myorg/my-components or @myorg/my-components/index.mjs
  const scopedMatch = moduleId.match(/node_modules\/(@[^/]+\/[^/]+)/);
  if (scopedMatch) {
    return scopedMatch[1];
  }

  // Match: lodash or lodash/index.js
  const unscopedMatch = moduleId.match(/node_modules\/([^/]+)/);
  if (unscopedMatch) {
    return unscopedMatch[1];
  }

  return null;
}

/**
 * Check if cached CSS is valid (newer than source)
 * @param {Library} library - Library object
 * @param {string} cacheDir - Cache directory path
 * @returns {boolean} True if cache is valid
 */
export function isCacheValid(library, cacheDir) {
  const sourcePath = join(library.path, 'assets', 'main.css');
  const cacheDirExists = existsSync(cacheDir);

  if (!cacheDirExists) {
    return false;
  }

  // Get source modification time
  const sourceStat = statSync(sourcePath);
  const sourceMtime = sourceStat.mtimeMs;

  // Find any cache file for this library
  const files = readdirSync(cacheDir);
  const safeName = library.name.replace('@', '').replace(/\//g, '-');
  const cacheFile = files.find((file) => file.startsWith(safeName + '-'));

  if (!cacheFile) {
    return false;
  }

  // Get cache modification time
  const cachePath = join(cacheDir, cacheFile);
  const cacheStat = statSync(cachePath);
  const cacheMtime = cacheStat.mtimeMs;

  const isValid = cacheMtime >= sourceMtime;

  debug(`Cache valid for ${library.name}: ${isValid}`);
  return isValid;
}

/**
 * Load host project's PostCSS config
 * @param {string} projectRoot - Path to host project
 * @returns {Promise<Object>} PostCSS config object
 */
export async function loadPostCSSConfig(projectRoot) {
  const configFiles = [
    'postcss.config.js',
    'postcss.config.mjs',
    'postcss.config.cjs',
  ];

  for (const configFile of configFiles) {
    const configPath = join(projectRoot, configFile);
    if (existsSync(configPath)) {
      try {
        // Dynamic import for config files
        const configModule = await import(configPath);
        const config = configModule.default || configModule;
        debug(`Loaded PostCSS config from: ${configFile}`);

        return {
          plugins: config.plugins || [],
        };
      } catch (error) {
        warn(
          `Failed to load PostCSS config from ${configFile}:`,
          error.message
        );
      }
    }
  }

  debug('No PostCSS config found, using defaults');
  return {
    plugins: [],
  };
}

/**
 * Find cached file for a library
 * @param {string} libraryName - Library name
 * @param {string} cacheDir - Cache directory path
 * @returns {string|null} Cached filename or null
 */
export function findCachedFile(libraryName, cacheDir) {
  if (!existsSync(cacheDir)) {
    return null;
  }

  const files = readdirSync(cacheDir);
  const safeName = libraryName.replace('@', '').replace(/\//g, '-');

  const cachedFile = files.find((file) => file.startsWith(safeName + '-'));

  return cachedFile || null;
}

/**
 * Library object type
 * @typedef {Object} Library
 * @property {string} name - Package name
 * @property {string} version - Package version
 * @property {string} path - Package path
 * @property {string} cssEntry - Path to main.css relative to package
 */

/**
 * Process result object type
 * @typedef {Object} ProcessResult
 * @property {string} cachePath - Path to cached file
 * @property {string|null} mapPath - Path to source map
 * @property {string} hash - MD5 hash
 * @property {string} cssUrl - URL for accessing processed CSS
 */
