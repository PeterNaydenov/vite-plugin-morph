/**
 * CSS File Reader Service
 * Handles reading and processing global CSS files for applyStyles() injection
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join, extname } from 'path';
import { glob } from 'glob';
import { debug, info, warn, error } from '../utils/logger.js';

/**
 * Read CSS files based on configuration
 * @param {Object} options - Reading options
 * @param {string} options.directory - Base directory to read from
 * @param {string[]} options.include - Glob patterns to include
 * @param {string[]} options.exclude - Glob patterns to exclude
 * @returns {Promise<Object>} Map of file paths to CSS content
 */
export async function readCSSFiles(options) {
  const { directory, include = ['**/*.css'], exclude = [] } = options;

  if (!existsSync(directory)) {
    warn(`Global CSS directory does not exist: ${directory}`);
    return new Map();
  }

  const cssFiles = new Map();

  try {
    // Process each include pattern
    for (const pattern of include) {
      const fullPattern = join(directory, pattern);
      const files = await glob(fullPattern, {
        ignore: exclude.map(ex => join(directory, ex)),
        absolute: true,
      });

      for (const filePath of files) {
        // Only process CSS files
        if (extname(filePath).toLowerCase() === '.css') {
          try {
            const content = readFileSync(filePath, 'utf8');
            cssFiles.set(filePath, content);
            debug(`Read global CSS file: ${filePath} (${content.length} chars)`);
          } catch (err) {
            warn(`Failed to read CSS file ${filePath}: ${err.message}`);
          }
        }
      }
    }

    info(`Read ${cssFiles.size} global CSS files from ${directory}`);
    return cssFiles;
  } catch (err) {
    error(`Failed to read CSS files from ${directory}: ${err.message}`);
    return new Map();
  }
}

/**
 * Watch CSS files for changes (used for HMR)
 * @param {Object} options - Watch options
 * @param {string} options.directory - Base directory
 * @param {string[]} options.include - Include patterns
 * @param {string[]} options.exclude - Exclude patterns
 * @param {Function} options.onChange - Callback for file changes
 * @returns {Function} Cleanup function
 */
export function watchCSSFiles(options, onChange) {
  // This would use file watchers, but for now we'll rely on Vite's HMR
  // The handleHotUpdate hook will detect CSS changes
  return () => {}; // No-op cleanup
}