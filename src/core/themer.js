/**
 * Theme System
 * @fileoverview Handles CSS theme discovery, generation, and processing
 * @author Peter Naydenov
 * @version 0.1.0
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { createMorphError } from './errors.js';
import { debug, info, warn, error } from '../utils/logger.js';
import { isProductionMode } from '../utils/shared.js';

/**
 * Theme file naming pattern
 * @type {RegExp}
 */
const THEME_FILE_PATTERN = /^_css\.(.+)\.morph$/;

/**
 * Default theme file pattern
 * @type {RegExp}
 */
const DEFAULT_THEME_PATTERN = /^_css\.(.+)\.default\.morph$/;

/**
 * Parse theme name from filename
 * @param {string} filename - Theme filename
 * @returns {Object|null} Parsed theme info
 */
function parseThemeName(filename) {
  const match = filename.match(THEME_FILE_PATTERN);
  if (!match) return null;

  const themeName = match[1];
  const isDefault = filename.match(DEFAULT_THEME_PATTERN);

  return {
    name: themeName,
    isDefault: !!isDefault,
    filename,
    filePath: null, // Will be set when discovered
  };
}

/**
 * Discover theme files in directory
 * @param {string} dirPath - Directory to search
 * @returns {Array<Object>} Array of theme metadata
 */
function discoverThemes(dirPath) {
  try {
    const files = readdirSync(dirPath);
    const themes = [];
    const defaultThemes = new Set();

    for (const file of files) {
      const themeInfo = parseThemeName(file);
      if (themeInfo) {
        themeInfo.filePath = resolve(dirPath, file);
        themes.push(themeInfo);

        if (themeInfo.isDefault) {
          defaultThemes.add(themeInfo.name);
        }
      }
    }

    // Validate that only one default theme exists per theme family
    const themeNames = [...new Set(themes.map((t) => t.name))];
    const conflicts = [];

    for (const themeName of themeNames) {
      const defaultsForTheme = themes.filter(
        (t) => t.name === themeName && t.isDefault
      );
      if (defaultsForTheme.length > 1) {
        conflicts.push(
          `Multiple default themes found for "${themeName}": ${defaultsForTheme.map((t) => t.filename).join(', ')}`
        );
      }
    }

    if (conflicts.length > 0) {
      throw createMorphError(
        new Error(`Theme validation failed: ${conflicts.join('; ')}`),
        dirPath
      );
    }

    debug(
      `Discovered ${themes.length} themes: ${themes.map((t) => `${t.name}${t.isDefault ? ' (default)' : ''}`).join(', ')}`
    );
    return themes;
  } catch (err) {
    error(`Failed to discover themes in ${dirPath}: ${err.message}`);
    throw createMorphError(err, dirPath);
  }
}

/**
 * Extract CSS content from theme morph file
 * @param {string} content - Raw theme file content
 * @returns {string} Extracted CSS content
 */
function extractCSSFromTheme(content) {
  // Simple extraction for now - should be enhanced with proper HTML parsing
  // Look for style tags and extract their content
  const styleMatches = [...content.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];

  if (styleMatches.length === 0) {
    warn('No <style> tags found in theme file');
    return '';
  }

  // Extract content from all style tags and join them
  const cssContent = styleMatches
    .map((match) => match[1] || '')
    .join('\n\n')
    .trim();

  return cssContent;
}

/**
 * Process CSS imports for theme inheritance
 * @param {string} cssContent - Raw CSS content
 * @param {string} themeDir - Theme directory path
 * @returns {string} Processed CSS with resolved imports
 */
function processCSSImports(cssContent, themeDir) {
  // Find @import statements
  const importRegex = /@import\s+url\(['"]([^'"]+)['"]\s*;?/g;
  const imports = [];
  let processedCSS = cssContent;

  let match;
  while ((match = importRegex.exec(cssContent)) !== null) {
    const importPath = match[1];
    imports.push(importPath);

    // Resolve relative paths
    let resolvedPath;
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      resolvedPath = resolve(themeDir, importPath);
    } else {
      resolvedPath = importPath;
    }

    // Replace import with resolved path
    processedCSS = processedCSS.replace(
      match[0],
      `@import url('${resolvedPath}');`
    );
  }

  if (imports.length > 0) {
    debug(`Processed ${imports.length} CSS imports: ${imports.join(', ')}`);
  }

  return processedCSS;
}

/**
 * Generate optimized CSS for production
 * @param {string} cssContent - CSS content to optimize
 * @param {boolean} isProduction - Whether to apply production optimizations
 * @returns {string} Optimized CSS content
 */
function optimizeCSS(cssContent, isProduction) {
  if (!isProduction) {
    return cssContent;
  }

  // Basic optimizations for production
  let optimized = cssContent;

  // Remove comments
  optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove extra whitespace
  optimized = optimized.replace(/\s+/g, ' ').replace(/\n\s+/g, '\n');

  // Minify (basic approach - should use proper CSS minifier in production)
  if (isProduction) {
    optimized = optimized
      .replace(/;\s*/g, ';')
      .replace(/\s*\{\s*/g, '{')
      .replace(/\s*\}\s*/g, '}');
  }

  return optimized;
}

/**
 * Process a single theme file
 * @param {string} themePath - Path to theme morph file
 * @param {string} outputDir - Output directory for CSS files
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processThemeFile(themePath, outputDir, options = {}) {
  const startTime = Date.now();

  try {
    const content = readFileSync(themePath, 'utf8');
    const themeInfo = parseThemeName(basename(themePath));

    if (!themeInfo) {
      throw createMorphError(
        new Error(`Invalid theme file name: ${basename(themePath)}`),
        themePath
      );
    }

    debug(
      `Processing theme: ${themeInfo.name}${themeInfo.isDefault ? ' (default)' : ''}`
    );

    // Extract CSS content
    const cssContent = extractCSSFromTheme(content);

    if (!cssContent.trim()) {
      warn(`No CSS content found in theme file: ${themePath}`);
      return {
        css: '',
        metadata: themeInfo,
        processingTime: Date.now() - startTime,
      };
    }

    // Process CSS imports for inheritance
    const themeDir = dirname(themePath);
    const processedCSS = processCSSImports(cssContent, themeDir);

    // Optimize CSS for production
    const optimizedCSS = optimizeCSS(processedCSS, isProductionMode());

    // Generate output filename
    const outputFilename = `${themeInfo.name}${themeInfo.isDefault ? '.default' : ''}.css`;
    const outputPath = resolve(outputDir, outputFilename);

    // Write CSS file
    writeFileSync(outputPath, optimizedCSS, 'utf8');

    const processingTime = Date.now() - startTime;

    info(
      `Successfully processed theme ${themeInfo.name} -> ${outputFilename} in ${processingTime}ms`
    );

    return {
      css: optimizedCSS,
      metadata: {
        ...themeInfo,
        outputPath,
        outputFilename,
        generatedAt: new Date().toISOString(),
      },
      processingTime,
      imports: [], // TODO: Extract actual imports from processCSSImports
    };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    error(`Failed to process theme ${themePath}: ${err.message}`);
    throw createMorphError(err, themePath, { processingTime });
  }
}

/**
 * Process all theme files in directory
 * @param {string} themesDir - Directory containing theme morph files
 * @param {string} outputDir - Output directory for CSS files
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
export async function processAllThemes(themesDir, outputDir, options = {}) {
  const startTime = Date.now();

  try {
    const themes = discoverThemes(themesDir);
    const results = {};
    const errors = {};

    info(`Processing ${themes.length} themes from ${themesDir}`);

    for (const theme of themes) {
      try {
        const themePath = theme.filePath;
        results[theme.name] = await processThemeFile(
          themePath,
          outputDir,
          options
        );
      } catch (err) {
        errors[theme.name] = err.message;
        warn(`Failed to process theme ${theme.name}: ${err.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    const successCount = Object.keys(results).length;
    const errorCount = Object.keys(errors).length;

    info(
      `Theme processing complete: ${successCount}/${themes.length} successful in ${processingTime}ms`
    );

    return {
      results,
      errors,
      metadata: {
        totalThemes: themes.length,
        successfulThemes: successCount,
        failedThemes: errorCount,
        processingTime,
      },
    };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    error(`Failed to process themes in ${themesDir}: ${err.message}`);
    throw createMorphError(err, themesDir, { processingTime });
  }
}

/**
 * Get theme metadata for runtime queries
 * @param {string} themesDir - Directory containing theme CSS files
 * @param {string} themeName - Theme name to query
 * @returns {Object|null} Theme metadata
 */
export function getThemeMetadata(themesDir, themeName) {
  try {
    const outputDir = resolve(themesDir, '../dist/themes');
    const cssFilename = `${themeName}.css`;
    const cssPath = resolve(outputDir, cssFilename);

    if (!existsSync(cssPath)) {
      return null;
    }

    // Find corresponding theme info from original theme files
    const themes = discoverThemes(themesDir);
    const themeInfo = themes.find((t) => t.name === themeName);

    if (!themeInfo) {
      return null;
    }

    return {
      name: themeName,
      isDefault: themeInfo.isDefault,
      cssPath,
      cssFilename,
      generatedFrom: themeInfo.filePath,
    };
  } catch (err) {
    warn(`Failed to get theme metadata for ${themeName}: ${err.message}`);
    return null;
  }
}

/**
 * List all available themes
 * @param {string} themesDir - Directory containing theme CSS files
 * @returns {Array<string>} Array of theme names
 */
export function listAvailableThemes(themesDir) {
  try {
    const outputDir = resolve(themesDir, '../dist/themes');
    if (!existsSync(outputDir)) {
      return [];
    }

    const cssFiles = readdirSync(outputDir).filter((file) =>
      file.endsWith('.css')
    );
    const themeNames = cssFiles.map((file) =>
      file.replace('.default.css', '').replace('.css', '')
    );

    return themeNames.sort();
  } catch (err) {
    warn(`Failed to list themes from ${themesDir}: ${err.message}`);
    return [];
  }
}
