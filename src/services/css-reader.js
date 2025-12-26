/**
 * CSS File Reader Service
 * Handles reading and processing global CSS files for applyStyles() injection
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join, extname, dirname } from 'path';
import { glob } from 'glob';
import { debug, info, warn, error } from '../utils/logger.js';

/**
 * Process CSS imports and inline them
 * @param {string} css - CSS content
 * @param {string} filePath - Path to the CSS file
 * @param {Set<string>} processedFiles - Set of already processed files to avoid circular imports
 * @returns {string} CSS with imports inlined
 */
function processCssImports(css, filePath, processedFiles = new Set()) {
  const importRegex = /@import\s+['"]([^'"]+)['"]\s*;/g;
  let processedCss = css;
  let match;

  // Prevent circular imports
  if (processedFiles.has(filePath)) {
    warn(`Circular CSS import detected: ${filePath}`);
    return '';
  }
  processedFiles.add(filePath);

  while ((match = importRegex.exec(css)) !== null) {
    const importPath = match[0];
    const importUrl = match[1];

    // Resolve the import path relative to the current file
    const fileDir = dirname(filePath);
    let resolvedPath;

    try {
      // Try to resolve the import path
      if (importUrl.startsWith('./') || importUrl.startsWith('../') || !importUrl.includes('/')) {
        resolvedPath = resolve(fileDir, importUrl);
        // Ensure it has .css extension if not specified
        if (!resolvedPath.endsWith('.css')) {
          resolvedPath += '.css';
        }
      } else {
        // Absolute paths or URLs - skip processing
        continue;
      }

      // Check if the resolved file exists
      if (existsSync(resolvedPath)) {
        // Read the imported CSS
        const importedCss = readFileSync(resolvedPath, 'utf8');
        // Recursively process imports in the imported file
        const processedImportedCss = processCssImports(importedCss, resolvedPath, processedFiles);

        // Replace the @import with the processed CSS content
        processedCss = processedCss.replace(importPath, processedImportedCss);
        debug(`Inlined CSS import: ${importUrl} -> ${resolvedPath}`);
      } else {
        warn(`CSS import not found: ${importUrl} (resolved to ${resolvedPath})`);
      }
    } catch (err) {
      warn(`Failed to process CSS import ${importUrl}: ${err.message}`);
    }
  }

  return processedCss;
}

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
            const rawContent = readFileSync(filePath, 'utf8');
            // Process @import statements and inline imported CSS
            const processedContent = processCssImports(rawContent, filePath);
            cssFiles.set(filePath, processedContent);
            debug(`Read and processed global CSS file: ${filePath} (${processedContent.length} chars, originally ${rawContent.length})`);
            if (processedContent !== rawContent) {
              info(`Processed CSS imports in ${filePath}: ${rawContent.length} -> ${processedContent.length} chars`);
            }
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