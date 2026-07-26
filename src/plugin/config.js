/**
 * Plugin Configuration System
 * Handles configuration for morph composition and theme system
 */

import { resolve } from 'path';
import { createMorphError, ErrorCodes } from '../core/errors.js';

/**
 * Default configuration for morph composition and theme system
 */
const defaultConfig = {
  // How scoped CSS class names are generated: 'development' (stable, name-based)
  // or 'production' (content-based, optimal for cache busting)
  hashMode: 'development',

  // Theme configuration
  themes: {
    enabled: true,
    directories: ['themes'],
    defaultTheme: 'default',
    watch: true,
    outputDir: '.morph/themes',
  },

  // Composition configuration
  composition: {
    enabled: true,
    cache: true,
    maxDepth: 10,
    allowCircular: false,
  },

  // HMR configuration
  hmr: {
    enabled: true,
    port: 35729,
    overlay: true,
  },

  // Development configuration
  development: {
    verbose: false,
    sourcemaps: true,
    minify: false,
  },

  // CSS configuration
  css: {
    // Master switch for CSS processing (scoping, layers, tree-shaking, bundling)
    enabled: true,
    postcss: {
      autoprefixer: true,
      minify: false,
      sourceMaps: true,
    },
    modules: {
      enabled: true,
      // Pattern used to generate scoped class names
      generateScopedName: '[name]_[local]_[hash:base64:5]',
    },
    layers: {
      enabled: true,
      order: ['vendors', 'libs', 'modules', 'app', 'context'],
    },
    treeShaking: {
      enabled: true,
    },
    bundling: {
      enabled: true,
      outputDir: 'dist/components',
    },
    debug: {
      enabled: false,
      verbose: false,
      showSourceMaps: false,
    },
    chunking: {
      enabled: false,
      strategy: 'size', // 'size', 'category', 'manual'
      maxChunkSize: 50 * 1024, // 50KB
    },
    outputDir: 'dist/components',
  },

  // Legacy configuration validation
  globalCSS: {
    directory: 'src/styles',
    entry: 'main.css', // Entry file for local CSS
    include: ['**/*.css'],
    exclude: [],
  },

  // Local themes configuration
  localThemes: {
    directory: 'src/themes', // Where local theme files are located
    include: ['**/*.css'], // Pattern for theme files
    exclude: [], // Files to exclude
  },

  production: {
    removeHandshake: true,
    minifyCSS: true,
  },

  errorHandling: {
    failOnError: true,
    showLocation: true,
    maxErrors: 10,
  },
};

/**
 * Load and validate plugin configuration
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} Validated configuration
 */
export function loadConfig(userConfig = {}) {
  const config = mergeConfig(defaultConfig, userConfig);

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Merge user configuration with defaults
 * @param {Object} defaults - Default configuration
 * @param {Object} user - User configuration
 * @returns {Object} Merged configuration
 */
function mergeConfig(defaults, user) {
  const merged = { ...defaults };

  for (const [key, value] of Object.entries(user)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      merged[key] = mergeConfig(merged[key] || {}, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Validate configuration values
 * @param {Object} config - Configuration to validate
 */
export function validateConfig(config) {
  const errors = [];

  // Validate theme configuration
  if (!Array.isArray(config.themes.directories)) {
    errors.push('themes.directories must be an array');
  }

  if (typeof config.themes.defaultTheme !== 'string') {
    errors.push('themes.defaultTheme must be a string');
  }

  // Validate composition configuration
  if (
    typeof config.composition.maxDepth !== 'number' ||
    config.composition.maxDepth <= 0
  ) {
    errors.push('composition.maxDepth must be a positive number');
  }

  // Validate HMR configuration
  if (typeof config.hmr.port !== 'number' || config.hmr.port <= 0) {
    errors.push('hmr.port must be a positive number');
  }

  // Validate legacy globalCSS configuration
  if (config.globalCSS) {
    if (!config.globalCSS.directory) {
      errors.push(
        'globalCSS.directory is required when globalCSS is specified'
      );
    }

    if (config.globalCSS.include && !Array.isArray(config.globalCSS.include)) {
      errors.push('globalCSS.include must be an array');
    }

    if (config.globalCSS.exclude && !Array.isArray(config.globalCSS.exclude)) {
      errors.push('globalCSS.exclude must be an array');
    }
  }

  // Validate legacy production configuration
  if (config.production) {
    if (typeof config.production.removeHandshake !== 'boolean') {
      errors.push('production.removeHandshake must be a boolean');
    }

    if (typeof config.production.minifyCSS !== 'boolean') {
      errors.push('production.minifyCSS must be a boolean');
    }
  }

  // Validate CSS configuration
  if (config.css) {
    if (
      config.css.modules?.generateScopedName !== undefined &&
      typeof config.css.modules.generateScopedName !== 'string'
    ) {
      errors.push('css.modules.generateScopedName must be a string');
    }

    if (
      config.css.layers?.order !== undefined &&
      !Array.isArray(config.css.layers.order)
    ) {
      errors.push('css.layers.order must be an array');
    }
  }

  // Validate error handling configuration
  if (config.errorHandling) {
    if (typeof config.errorHandling.failOnError !== 'boolean') {
      errors.push('errorHandling.failOnError must be a boolean');
    }

    if (typeof config.errorHandling.showLocation !== 'boolean') {
      errors.push('errorHandling.showLocation must be a boolean');
    }

    if (
      typeof config.errorHandling.maxErrors !== 'number' ||
      config.errorHandling.maxErrors < 1
    ) {
      errors.push('errorHandling.maxErrors must be a positive number');
    }
  }

  // Report errors
  if (errors.length > 0) {
    const error = createMorphError(
      `Configuration validation failed:\n${errors.join('\n')}`,
      'vite.config.js',
      null,
      ErrorCodes.CONFIG_ERROR
    );

    if (config.errorHandling?.failOnError !== false) {
      throw error;
    }
  }
}

/**
 * Get configuration for specific environment
 * @param {Object} config - Base configuration
 * @param {string} env - Environment ('development', 'production')
 * @returns {Object} Environment-specific configuration
 */
export function getEnvConfig(config, env = 'development') {
  const envConfig = { ...config };

  if (env === 'production') {
    envConfig.development.verbose = false;
    envConfig.development.sourcemaps = false;
    envConfig.development.minify = true;
    envConfig.hmr.enabled = false;
  }

  return envConfig;
}

/**
 * Resolve theme directory paths
 * @param {Object} config - Configuration
 * @param {string} rootDir - Root directory
 * @returns {Array} Resolved theme directory paths
 */
export function resolveThemeDirectories(config, rootDir = process.cwd()) {
  return config.themes.directories.map((dir) => resolve(rootDir, dir));
}

/**
 * Get theme output directory
 * @param {Object} config - Configuration
 * @param {string} rootDir - Root directory
 * @returns {string} Resolved output directory
 */
export function getThemeOutputDir(config, rootDir = process.cwd()) {
  return resolve(rootDir, config.themes.outputDir);
}

export default {
  loadConfig,
  validateConfig,
  getEnvConfig,
  resolveThemeDirectories,
  getThemeOutputDir,
  defaultConfig,
};
