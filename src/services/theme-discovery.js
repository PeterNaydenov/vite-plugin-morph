/**
 * Theme Discovery Service
 * Discovers and loads theme files from configured directories
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { debug, info, warn } from '../utils/logger.js';

/**
 * Theme file extensions that are supported
 */
const SUPPORTED_THEME_EXTENSIONS = ['.json', '.js', '.mjs'];

/**
 * Theme discovery service
 */
export class ThemeDiscovery {
  constructor(options = {}) {
    this.themeDirectories = options.directories || [];
    this.defaultTheme = options.defaultTheme || 'default';
    this.cache = new Map();
    this.watchers = new Map();
  }

  /**
   * Discover all themes from configured directories
   * @returns {Promise<Object>} Map of theme name to theme data
   */
  async discoverThemes() {
    const themes = new Map();

    for (const directory of this.themeDirectories) {
      try {
        const directoryThemes = await this.discoverThemesInDirectory(directory);

        // Merge themes from this directory
        for (const [name, theme] of Object.entries(directoryThemes)) {
          if (themes.has(name)) {
            warn(
              `Theme '${name}' found in multiple directories, using first occurrence`
            );
          } else {
            themes.set(name, theme);
          }
        }
      } catch (error) {
        warn(
          `Failed to discover themes in directory ${directory}: ${error.message}`
        );
      }
    }

    info(
      `Discovered ${themes.size} themes from ${this.themeDirectories.length} directories`
    );
    return themes;
  }

  /**
   * Discover themes in a specific directory
   * @param {string} directory - Directory to search
   * @returns {Promise<Object>} Themes found in directory
   */
  async discoverThemesInDirectory(directory) {
    const themes = {};

    try {
      const entries = await readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const theme = await this.loadThemeFile(join(directory, entry.name));
          if (theme) {
            const themeName = this.extractThemeName(entry.name);
            themes[themeName] = theme;
          }
        } else if (entry.isDirectory()) {
          // Check for index.js or index.json in subdirectory
          const indexFile = this.findThemeIndexFile(
            join(directory, entry.name)
          );
          if (indexFile) {
            const theme = await this.loadThemeFile(indexFile);
            if (theme) {
              themes[entry.name] = theme;
            }
          }
        }
      }
    } catch (error) {
      warn(`Error reading directory ${directory}: ${error.message}`);
    }

    return themes;
  }

  /**
   * Load a theme file
   * @param {string} filePath - Path to theme file
   * @returns {Promise<Object|null>} Theme data or null if invalid
   */
  async loadThemeFile(filePath) {
    try {
      // Check cache first
      if (this.cache.has(filePath)) {
        const cached = this.cache.get(filePath);
        if (cached.mtime === (await stat(filePath)).mtime.getTime()) {
          return cached.data;
        }
      }

      const ext = extname(filePath);
      const content = await readFile(filePath, 'utf-8');

      let themeData;

      switch (ext) {
        case '.json':
          themeData = JSON.parse(content);
          break;

        case '.js':
        case '.mjs': {
          // Dynamic import for JS/MJS files
          const module = await import(`file://${filePath}`);
          themeData = module.default || module;
          break;
        }

        default:
          warn(`Unsupported theme file extension: ${ext}`);
          return null;
      }

      // Validate theme structure
      if (!this.validateTheme(themeData)) {
        warn(`Invalid theme structure in ${filePath}`);
        return null;
      }

      // Cache the theme data
      const stats = await stat(filePath);
      this.cache.set(filePath, {
        data: themeData,
        mtime: stats.mtime.getTime(),
      });

      debug(`Loaded theme from ${filePath}`);
      return themeData;
    } catch (error) {
      warn(`Failed to load theme file ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Find theme index file in directory
   * @param {string} directory - Directory to search
   * @returns {Promise<string|null>} Path to index file or null
   */
  async findThemeIndexFile(directory) {
    const indexFiles = ['index.js', 'index.mjs', 'index.json'];
    const { statSync } = await import('fs');

    for (const file of indexFiles) {
      const filePath = join(directory, file);
      try {
        // Check if file exists and is readable
        statSync(filePath);
        return filePath;
      } catch {
        // File doesn't exist, continue searching
      }
    }

    return null;
  }

  /**
   * Extract theme name from file path
   * @param {string} fileName - File name
   * @returns {string} Theme name
   */
  extractThemeName(fileName) {
    const base = basename(fileName, extname(fileName));

    // Remove 'theme.' prefix if present
    if (base.startsWith('theme.')) {
      return base.slice(6);
    }

    // Remove '.theme' suffix if present
    if (base.endsWith('.theme')) {
      return base.slice(0, -6);
    }

    return base;
  }

  /**
   * Validate theme structure
   * @param {Object} theme - Theme data to validate
   * @returns {boolean} True if valid
   */
  validateTheme(theme) {
    if (!theme || typeof theme !== 'object') {
      return false;
    }

    // Check for required properties
    if (!theme.name || typeof theme.name !== 'string') {
      return false;
    }

    // Validate CSS variables if present
    if (theme.variables && typeof theme.variables === 'object') {
      for (const [key, value] of Object.entries(theme.variables)) {
        if (typeof value !== 'string') {
          warn(`Invalid CSS variable value for ${key}: must be string`);
          return false;
        }
      }
    }

    // Validate component styles if present
    if (theme.components && typeof theme.components === 'object') {
      for (const [component, styles] of Object.entries(theme.components)) {
        if (typeof styles !== 'object' || styles === null) {
          warn(`Invalid component styles for ${component}: must be object`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get default theme or first available theme
   * @param {Map} themes - Available themes
   * @returns {Object|null} Default theme data
   */
  getDefaultTheme(themes) {
    // Try to find the configured default theme
    if (themes.has(this.defaultTheme)) {
      return themes.get(this.defaultTheme);
    }

    // Fall back to first available theme
    const firstTheme = themes.values().next().value;
    if (firstTheme) {
      warn(
        `Default theme '${this.defaultTheme}' not found, using '${firstTheme.name}'`
      );
      return firstTheme;
    }

    warn('No themes available');
    return null;
  }

  /**
   * Clear theme cache
   */
  clearCache() {
    this.cache.clear();
    debug('Theme cache cleared');
  }

  /**
   * Get theme statistics
   * @returns {Object} Statistics about discovered themes
   */
  getStats() {
    return {
      directories: this.themeDirectories.length,
      cachedFiles: this.cache.size,
      defaultTheme: this.defaultTheme,
    };
  }
}

/**
 * Create theme discovery service
 * @param {Object} options - Configuration options
 * @returns {ThemeDiscovery} Theme discovery service
 */
export function createThemeDiscovery(options = {}) {
  return new ThemeDiscovery(options);
}

export default ThemeDiscovery;
