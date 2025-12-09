/**
 * CSS Generation Service
 * Generates CSS from theme data and component styles
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { debug, info, warn } from '../utils/logger.js';

/**
 * CSS Generation Service
 */
export class CSSGenerationService {
  constructor(options = {}) {
    this.outputDir = options.outputDir || '.morph/themes';
    this.defaultTheme = options.defaultTheme || 'default';
    this.minify = options.minify || false;
    this.sourceMaps = options.sourceMaps || false;
    this.cache = new Map();
  }

  /**
   * Generate CSS for a theme
   * @param {Object} themeData - Theme data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated CSS info
   */
  async generateThemeCSS(themeData, options = {}) {
    const themeName = options.themeName || themeData.name || this.defaultTheme;
    const outputDir = options.outputDir || this.outputDir;

    try {
      // Generate CSS content
      const cssContent = this.buildThemeCSS(themeData, options);

      // Create output directory if it doesn't exist
      await mkdir(outputDir, { recursive: true });

      // Write CSS file
      const cssFile = join(outputDir, `${themeName}.css`);
      await writeFile(cssFile, cssContent, 'utf-8');

      // Generate source map if enabled
      let sourceMapFile = null;
      if (this.sourceMaps) {
        sourceMapFile = await this.generateSourceMap(
          cssContent,
          cssFile,
          themeData
        );
      }

      const result = {
        themeName,
        cssFile,
        cssContent,
        sourceMapFile,
        variables: themeData.variables || {},
        components: themeData.components || {},
        generatedAt: new Date().toISOString(),
      };

      // Cache the result
      this.cache.set(themeName, result);

      info(`Generated CSS for theme '${themeName}' at ${cssFile}`);
      return result;
    } catch (error) {
      warn(`Failed to generate CSS for theme '${themeName}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Build CSS content from theme data
   * @param {Object} themeData - Theme data
   * @param {Object} options - Build options
   * @returns {string} Generated CSS
   */
  buildThemeCSS(themeData, options = {}) {
    const cssParts = [];

    // Add CSS header comment
    cssParts.push(`/* Theme: ${themeData.name} */`);
    cssParts.push(`/* Generated: ${new Date().toISOString()} */`);
    cssParts.push('');

    // Add CSS variables
    if (themeData.variables) {
      cssParts.push(this.buildCSSVariables(themeData.variables));
    }

    // Add component styles
    if (themeData.components) {
      cssParts.push(this.buildComponentStyles(themeData.components));
    }

    // Add global styles
    if (themeData.global) {
      cssParts.push(this.buildGlobalStyles(themeData.global));
    }

    // Add utility classes
    if (themeData.utilities) {
      cssParts.push(this.buildUtilityClasses(themeData.utilities));
    }

    let css = cssParts.join('\n');

    // Minify if enabled
    if (this.minify) {
      css = this.minifyCSS(css);
    }

    return css;
  }

  /**
   * Build CSS variables section
   * @param {Object} variables - CSS variables object
   * @returns {string} CSS variables
   */
  buildCSSVariables(variables) {
    const cssLines = [':root {'];

    for (const [key, value] of Object.entries(variables)) {
      const cssVarName = key.startsWith('--') ? key : `--${key}`;
      cssLines.push(`  ${cssVarName}: ${value};`);
    }

    cssLines.push('}');
    cssLines.push('');

    return cssLines.join('\n');
  }

  /**
   * Build component styles section
   * @param {Object} components - Component styles object
   * @returns {string} Component styles
   */
  buildComponentStyles(components) {
    const cssLines = ['/* Component Styles */'];

    for (const [componentName, styles] of Object.entries(components)) {
      cssLines.push(`/* ${componentName} */`);

      if (typeof styles === 'string') {
        // Direct CSS string
        cssLines.push(styles);
      } else if (typeof styles === 'object') {
        // Style object
        cssLines.push(this.buildStyleObject(componentName, styles));
      }

      cssLines.push('');
    }

    return cssLines.join('\n');
  }

  /**
   * Build styles from style object
   * @param {string} selector - CSS selector
   * @param {Object} styles - Style object
   * @returns {string} CSS rules
   */
  buildStyleObject(selector, styles) {
    const cssLines = [`${selector} {`];

    for (const [property, value] of Object.entries(styles)) {
      if (typeof value === 'object' && value !== null) {
        // Nested object (media queries, pseudo-classes)
        cssLines.push(this.buildNestedStyles(property, value, '  '));
      } else {
        cssLines.push(`  ${property}: ${value};`);
      }
    }

    cssLines.push('}');
    return cssLines.join('\n');
  }

  /**
   * Build nested styles (media queries, pseudo-classes)
   * @param {string} nestedSelector - Nested selector
   * @param {Object} styles - Nested styles
   * @param {string} indent - Indentation
   * @returns {string} Nested CSS
   */
  buildNestedStyles(nestedSelector, styles, indent) {
    const cssLines = [];

    if (nestedSelector.startsWith('@')) {
      // Media query
      cssLines.push(`${indent}${nestedSelector} {`);
      cssLines.push(
        this.buildStyleObject('', styles).replace(/^.*\{\n|\}$/g, '')
      );
      cssLines.push(`${indent}}`);
    } else {
      // Pseudo-class or nested selector
      cssLines.push(`${indent}&${nestedSelector} {`);
      for (const [property, value] of Object.entries(styles)) {
        cssLines.push(`${indent}  ${property}: ${value};`);
      }
      cssLines.push(`${indent}}`);
    }

    return cssLines.join('\n');
  }

  /**
   * Build global styles section
   * @param {Object} global - Global styles
   * @returns {string} Global styles
   */
  buildGlobalStyles(global) {
    const cssLines = ['/* Global Styles */'];

    for (const [selector, styles] of Object.entries(global)) {
      if (typeof styles === 'string') {
        cssLines.push(`${selector} { ${styles} }`);
      } else {
        cssLines.push(this.buildStyleObject(selector, styles));
      }
    }

    cssLines.push('');
    return cssLines.join('\n');
  }

  /**
   * Build utility classes section
   * @param {Object} utilities - Utility classes
   * @returns {string} Utility classes
   */
  buildUtilityClasses(utilities) {
    const cssLines = ['/* Utility Classes */'];

    for (const [className, styles] of Object.entries(utilities)) {
      const selector = className.startsWith('.') ? className : `.${className}`;

      if (typeof styles === 'string') {
        cssLines.push(`${selector} { ${styles} }`);
      } else {
        cssLines.push(this.buildStyleObject(selector, styles));
      }
    }

    cssLines.push('');
    return cssLines.join('\n');
  }

  /**
   * Minify CSS content
   * @param {string} css - CSS content
   * @returns {string} Minified CSS
   */
  minifyCSS(css) {
    return (
      css
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove whitespace
        .replace(/\s+/g, ' ')
        // Remove semicolons before closing braces
        .replace(/;}/g, '}')
        // Remove unnecessary spaces
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*;\s*/g, ';')
        .replace(/\s*:\s*/g, ':')
        .trim()
    );
  }

  /**
   * Generate source map for CSS
   * @param {string} css - CSS content
   * @param {string} cssFile - CSS file path
   * @param {Object} themeData - Original theme data
   * @returns {Promise<string>} Source map file path
   */
  async generateSourceMap(css, cssFile, themeData) {
    const sourceMapFile = `${cssFile}.map`;
    const sourceMap = {
      version: 3,
      file: cssFile.split('/').pop(),
      sourceRoot: '',
      sources: ['theme.json'],
      names: [],
      mappings: this.generateMappings(css),
    };

    await writeFile(sourceMapFile, JSON.stringify(sourceMap, null, 2), 'utf-8');
    return sourceMapFile;
  }

  /**
   * Generate source map mappings (simplified)
   * @param {string} css - CSS content
   * @returns {string} Source map mappings
   */
  generateMappings(css) {
    // Simplified mapping generation
    // In a real implementation, this would be more sophisticated
    const lines = css.split('\n');
    const mappings = lines
      .map((_, index) => `${index === 0 ? '' : ';'}AAAA`)
      .join('');

    return mappings;
  }

  /**
   * Generate CSS for multiple themes
   * @param {Map} themes - Map of themes
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Array of generation results
   */
  async generateMultipleThemes(themes, options = {}) {
    const results = [];

    for (const [themeName, themeData] of themes) {
      try {
        const result = await this.generateThemeCSS(themeData, {
          ...options,
          themeName,
        });
        results.push(result);
      } catch (error) {
        warn(
          `Failed to generate CSS for theme '${themeName}': ${error.message}`
        );
      }
    }

    info(`Generated CSS for ${results.length} themes`);
    return results;
  }

  /**
   * Clear CSS generation cache
   */
  clearCache() {
    this.cache.clear();
    debug('CSS generation cache cleared');
  }

  /**
   * Get cached CSS for a theme
   * @param {string} themeName - Theme name
   * @returns {Object|null} Cached CSS data or null
   */
  getCachedCSS(themeName) {
    return this.cache.get(themeName) || null;
  }

  /**
   * Get generation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      outputDir: this.outputDir,
      cachedThemes: this.cache.size,
      minifyEnabled: this.minify,
      sourceMapsEnabled: this.sourceMaps,
    };
  }
}

/**
 * Create CSS generation service
 * @param {Object} options - Configuration options
 * @returns {CSSGenerationService} CSS generation service
 */
export function createCSSGenerationService(options = {}) {
  return new CSSGenerationService(options);
}

export default CSSGenerationService;
