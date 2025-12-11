/**
 * CSS Processing Utilities
 * Handles PostCSS processing and CSS transformations
 */

import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssImport from 'postcss-import';
import postcssNested from 'postcss-nested';
import { debug, info, warn, error } from '../utils/logger.js';

/**
 * CSS Processing Service
 */
export class CSSProcessor {
  constructor(options = {}) {
    this.options = {
      minify: options.minify || false,
      sourceMaps: options.sourceMaps || false,
      autoprefixer: options.autoprefixer !== false,
      ...options,
    };

    this.processor = this.createProcessor();
  }

  /**
   * Create PostCSS processor with configured plugins
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
   * Process CSS content
   * @param {string} css - CSS content to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed CSS result
   */
  async process(css, options = {}) {
    try {
      debug(`Processing CSS (${css.length} chars)`);

      const result = await this.processor.process(css, {
        from: options.from || 'input.css',
        to: options.to || 'output.css',
        map: this.options.sourceMaps ? { inline: false } : false,
      });

      info(`CSS processed successfully (${result.css.length} chars output)`);

      return {
        css: result.css,
        map: result.map,
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
   * @returns {Object} Validation result
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
 * Get default CSS processor instance
 */
export function getCssProcessor(options = {}) {
  if (!defaultProcessor) {
    defaultProcessor = new CSSProcessor(options);
  }
  return defaultProcessor;
}

/**
 * Process CSS with default processor
 * @param {string} css - CSS content
 * @param {Object} options - Processing options
 */
export async function processCss(css, options = {}) {
  const processor = getCssProcessor(options);
  return processor.process(css, options);
}

/**
 * Validate CSS syntax
 * @param {string} css - CSS content
 */
export function validateCss(css) {
  const processor = getCssProcessor();
  return processor.validate(css);
}
