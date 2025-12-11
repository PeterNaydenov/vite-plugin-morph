/**
 * CSS Processing Utilities
 * Handles PostCSS processing and CSS transformations
 * @fileoverview PostCSS integration with autoprefixer, cssnano, and source maps
 * @author Peter Naydenov
 * @version 0.0.10
 */

import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssImport from 'postcss-import';
import postcssNested from 'postcss-nested';
import { debug, info, warn, error } from '../utils/logger.js';

/**
 * CSS Processing Service with PostCSS integration
 * @class
 */
export class CSSProcessor {
  /**
   * Create CSS processor instance
   * @param {Object} [options={}] - Processing options
   * @param {boolean} [options.minify=false] - Enable CSS minification
   * @param {boolean} [options.sourceMaps=true] - Generate source maps
   * @param {boolean} [options.autoprefixer=true] - Enable autoprefixer
   */
  constructor(options = {}) {
    this.options = {
      minify: options.minify || false,
      sourceMaps: options.sourceMaps !== false, // Enable by default
      autoprefixer: options.autoprefixer !== false,
      ...options,
    };

    this.processor = this.createProcessor();
  }

  /**
   * Create PostCSS processor with configured plugins
   * @private
   * @returns {import('postcss').Processor} Configured PostCSS processor
   */
  createProcessor() {
    const plugins = [];

    // Add import handling
    plugins.push(postcssImport());

    // Add nesting support
    plugins.push(postcssNested());

    // Add autoprefixer if enabled
    if (this.options.autoprefixer) {
      plugins.push(
        autoprefixer({
          grid: true,
          flexbox: true,
        })
      );
    }

    // Add minification for production
    if (this.options.minify) {
      plugins.push(
        cssnano({
          preset: 'default',
        })
      );
    }

    return postcss(plugins);
  }

  /**
   * Process CSS content with PostCSS
   * @param {string} css - CSS content to process
   * @param {Object} [options={}] - Processing options
   * @param {string} [options.from] - Source file path
   * @param {string} [options.to] - Output file path
   * @returns {Promise<{css: string, map: Object, warnings: Array}>} Processed CSS result
   */
  async process(css, options = {}) {
    try {
      debug(`Processing CSS (${css.length} chars)`);

      const result = await this.processor.process(css, {
        from: options.from || 'input.css',
        to: options.to || 'output.css',
        map: this.options.sourceMaps
          ? { inline: false, annotation: false }
          : false,
      });

      info(`CSS processed successfully (${result.css.length} chars output)`);

      return {
        css: result.css,
        map: result.map ? JSON.parse(result.map.toString()) : null,
        warnings: result.warnings,
      };
    } catch (err) {
      error(`CSS processing failed: ${err.message}`);
      throw new Error(`CSS processing error: ${err.message}`);
    }
  }

  /**
   * Validate CSS syntax
   * @param {string} css - CSS content to validate
   * @returns {{valid: boolean, errors: string[], warnings: Array}} Validation result
   */
  validate(css) {
    try {
      // Basic syntax validation by attempting to process
      const result = postcss.parse(css);
      return {
        valid: true,
        errors: [],
        warnings: result.warnings || [],
      };
    } catch (err) {
      return {
        valid: false,
        errors: [err.message],
        warnings: [],
      };
    }
  }
}

// Default instance
let defaultProcessor = null;

/**
 * Get CSS processor instance with options
 * @param {Object} [options={}] - Processor options
 * @returns {CSSProcessor} CSS processor instance
 */
export function getCssProcessor(options = {}) {
  // Always create a new processor instance with the given options
  // This ensures options are applied correctly for each call
  return new CSSProcessor(options);
}

/**
 * Process CSS with default processor
 * @param {string} css - CSS content to process
 * @param {Object} [options={}] - Processing options
 * @returns {Promise<{css: string, map: Object, warnings: Array}>} Processed CSS result
 */
export async function processCss(css, options = {}) {
  const processor = getCssProcessor(options);
  return processor.process(css, options);
}

/**
 * Validate CSS syntax
 * @param {string} css - CSS content to validate
 * @returns {{valid: boolean, errors: string[], warnings: Array}} Validation result
 */
export function validateCss(css) {
  const processor = getCssProcessor();
  return processor.validate(css);
}
