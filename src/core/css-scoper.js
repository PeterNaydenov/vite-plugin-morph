/**
 * CSS Scoping Utilities
 * Generates scoped class names for CSS modules
 * @fileoverview CSS class name scoping and transformation utilities
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { debug, info, warn } from '../utils/logger.js';

/**
 * CSS Scoper for generating scoped class names
 * @class
 */
export class CSSScoper {
  /**
   * Create CSS scoper instance
   * @param {Object} [options={}] - Scoping options
   * @param {string} [options.generateScopedName='[name]_[local]_[hash:base64:5]'] - Scoped name pattern
   * @param {Function} [options.hashFunction] - Hash function for class names
   */
  constructor(options = {}) {
    this.options = {
      generateScopedName:
        options.generateScopedName || '[name]_[local]_[hash:base64:5]',
      hashFunction: options.hashFunction || this.simpleHash,
      ...options,
    };
  }

  /**
   * Generate a simple hash for class names
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substr(0, 5);
  }

  /**
   * Generate scoped class name
   * @param {string} name - Component name
   * @param {string} local - Local class name
   * @returns {string} Scoped class name
   */
  generateScopedName(name, local) {
    const hash = this.options.hashFunction(`${name}_${local}`);
    return this.options.generateScopedName
      .replace('[name]', name)
      .replace('[local]', local)
      .replace('[hash:base64:5]', hash);
  }

  /**
   * Extract class selectors from CSS
   * @param {string} css - CSS content
   * @returns {string[]} Array of class names found
   */
  extractClassNames(css) {
    const classNames = new Set();

    // Match class selectors: .class-name
    const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;

    while ((match = classRegex.exec(css)) !== null) {
      classNames.add(match[1]);
    }

    return Array.from(classNames);
  }

  /**
   * Transform CSS selectors to use scoped class names
   * @param {string} css - Original CSS
   * @param {Object} scopedClasses - Mapping of original to scoped class names
   * @returns {string} Transformed CSS
   */
  transformSelectors(css, scopedClasses) {
    let transformedCss = css;

    // Replace each class selector with scoped version
    for (const [original, scoped] of Object.entries(scopedClasses)) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\.${original}\\b`, 'g');
      transformedCss = transformedCss.replace(regex, `.${scoped}`);
    }

    return transformedCss;
  }

  /**
   * Process CSS for scoping
   * @param {string} css - Original CSS
   * @param {string} componentName - Component name for scoping
   * @returns {Object} Processing result
   */
  processCss(css, componentName) {
    // Extract class names
    const classNames = this.extractClassNames(css);

    // Generate scoped class mappings
    const scopedClasses = {};
    for (const className of classNames) {
      scopedClasses[className] = this.generateScopedName(
        componentName,
        className
      );
    }

    // Transform CSS selectors
    const scopedCss = this.transformSelectors(css, scopedClasses);

    return {
      originalCss: css,
      scopedCss,
      scopedClasses,
      classNames,
    };
  }
}

// Default instance
let defaultScoper = null;

/**
 * Get default CSS scoper instance
 */
export function getCssScoper(options = {}) {
  if (!defaultScoper) {
    defaultScoper = new CSSScoper(options);
  }
  return defaultScoper;
}

/**
 * Process CSS for scoping with default scoper
 * @param {string} css - CSS content
 * @param {string} componentName - Component name
 */
/**
 * Scope CSS content for a component
 * @param {string} css - CSS content to scope
 * @param {string} componentName - Component name for scoping
 * @returns {Object} Scoped CSS result with classes and content
 */
export function scopeCss(css, componentName) {
  const scoper = getCssScoper();
  return scoper.processCss(css, componentName);
}

/**
 * Generate scoped class name
 * @param {string} componentName - Component name
 * @param {string} className - Original class name
 * @returns {string} Scoped class name
 */
export function generateScopedClassName(componentName, className) {
  const scoper = getCssScoper();
  return scoper.generateScopedName(componentName, className);
}
