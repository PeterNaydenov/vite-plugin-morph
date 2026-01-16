/**
 * CSS Scoping Utilities
 * Generates scoped class names for CSS modules with content-based hashing
 * @fileoverview CSS class name scoping and transformation utilities
 * @author Peter Naydenov
 * @version 0.0.11
 */

import postcss from 'postcss';

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
      hashFunction: options.hashFunction || this.contentHash,
      ...options,
    };
  }

  /**
   * Generate a content-based hash for CSS rules
   * Hash changes when CSS content changes
   * @param {string} content - CSS content (selector + properties)
   * @returns {string} Hash string (5 chars, base36)
   */
  contentHash(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 5);
  }

  /**
   * Parse CSS and extract class rules with their full content
   * @param {string} css - CSS content
   * @returns {Object[]} Array of class rule objects
   */
  parseClassRules(css) {
    const rules = [];

    try {
      const root = postcss.parse(css);

      root.walkRules((rule) => {
        // Only process class selectors (starting with .)
        if (rule.selector.startsWith('.')) {
          // Extract class names from the selector
          const classNames = this.extractClassNamesFromSelector(rule.selector);

          // Get the full rule content (properties)
          const ruleContent = rule.toString();

          for (const className of classNames) {
            rules.push({
              className,
              // Hash based on the full rule content for determinism
              content: ruleContent,
              scoped: false,
            });
          }
        }
      });
    } catch (e) {
      // If parsing fails, fall back to simple extraction
      const classNames = this.extractClassNames(css);
      for (const className of classNames) {
        rules.push({
          className,
          content: `.${className}`,
          scoped: false,
        });
      }
    }

    return rules;
  }

  /**
   * Extract class names from a selector string
   * @param {string} selector - CSS selector
   * @returns {string[]} Array of class names
   */
  extractClassNamesFromSelector(selector) {
    const classNames = new Set();
    // Match .className patterns, handling comma-separated selectors
    const regex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;

    while ((match = regex.exec(selector)) !== null) {
      classNames.add(match[1]);
    }

    return Array.from(classNames);
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
    // Parse CSS rules and generate content-based hashes
    const classRules = this.parseClassRules(css);

    // Generate scoped class mappings with content-based hashes
    const scopedClasses = {};
    const classContents = {};

    for (const rule of classRules) {
      // Generate hash based on the full CSS rule content
      const hash = this.options.hashFunction(rule.content);
      const scopedName = `${componentName}_${rule.className}_${hash}`;

      scopedClasses[rule.className] = scopedName;
      classContents[rule.className] = {
        scoped: scopedName,
        content: rule.content,
      };
    }

    // Transform CSS selectors
    const scopedCss = this.transformSelectors(css, scopedClasses);

    return {
      originalCss: css,
      scopedCss,
      scopedClasses,
      classContents,
      classNames: Object.keys(scopedClasses),
    };
  }
}

// Default instance
let defaultScoper = null;

/**
 * Get default CSS scoper instance
 */
export function getCssScoper(options = {}) {
  if (!defaultScoper || Object.keys(options).length > 0) {
    defaultScoper = new CSSScoper(options);
  }
  return defaultScoper;
}

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

/**
 * Transform HTML class attributes to use scoped class names
 * @param {string} html - HTML template content
 * @param {Object} scopedClasses - Mapping of original to scoped class names
 * @returns {string} Transformed HTML
 */
export function transformHtmlClasses(html, scopedClasses) {
  // Match class="className" or class='className' with optional spaces
  // Handles multiple classes separated by whitespace
  const classAttrRegex = /class\s*=\s*(["'])(.*?)\1/g;

  return html.replace(classAttrRegex, (match, quote, classValue) => {
    // Split classes by whitespace
    const classes = classValue.trim().split(/\s+/);

    // Map each class to its scoped version if it exists locally
    const scopedClassesList = classes.map((cls) => {
      return scopedClasses[cls] || cls; // Keep original if not locally defined
    });

    // Rebuild class attribute with original quote style
    return `class=${quote}${scopedClassesList.join(' ')}${quote}`;
  });
}
