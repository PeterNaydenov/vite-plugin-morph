/**
 * CSS Scoping Utilities
 * Generates scoped class names for CSS modules with hash modes
 * @fileoverview CSS class name scoping and transformation utilities
 * @author Peter Naydenov
 * @version 0.0.12
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
   * @param {string} [options.hashMode='development'] - Hash mode: 'development' (stable) or 'production' (content-based)
   * @param {string} [options.generateScopedName='[name]_[local]_[hash:base64:5]'] - Scoped name pattern
   */
  constructor(options = {}) {
    this.options = {
      hashMode: options.hashMode || 'development',
      generateScopedName:
        options.generateScopedName || '[name]_[local]_[hash:base64:5]',
      ...options,
    };
  }

  /**
   * Generate a content-based hash for CSS rules
   * Hash changes when CSS content changes (production mode)
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
   * Generate a name-based hash for CSS rules
   * Hash based on component name + class name only (development mode)
   * Stable across CSS content changes - only generated once per component
   * @param {string} name - Component name
   * @param {string} className - Class name
   * @returns {string} Hash string (5 chars, base36)
   */
  nameBasedHash(name, className) {
    // Use component name + class name for stable hash
    const str = `${name}_${className}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 5);
  }

  /**
   * Generate scoped class name
   * @param {string} name - Component name
   * @param {string} className - Local class name
   * @param {string} cssContent - Full CSS rule content (for production mode)
   * @returns {string} Scoped class name
   */
  generateScopedName(name, className, cssContent = '') {
    let hash;
    if (this.options.hashMode === 'production') {
      hash = this.contentHash(cssContent);
    } else {
      // Development mode: stable hash based on names only
      hash = this.nameBasedHash(name, className);
    }
    return this.options.generateScopedName
      .replace('[name]', name)
      .replace('[local]', className)
      .replace('[hash:base64:5]', hash);
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
   * @returns {Object} Processing result with scoped classes and CSS
   */
  processCss(css, componentName) {
    // Parse CSS rules and generate hashes based on mode
    const classRules = this.parseClassRules(css);

    // Generate scoped class mappings
    const scopedClasses = {};
    const classContents = {};

    for (const rule of classRules) {
      // Generate hash based on mode
      const scopedName = this.generateScopedName(
        componentName,
        rule.className,
        rule.content
      );

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
 * Get CSS scoper instance with options
 * @param {Object} [options={}] - Scoper options
 * @returns {CSSScoper} CSS scoper instance
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
 * @param {Object} [options={}] - Options (hashMode)
 * @returns {Object} Scoped CSS result with classes and content
 */
export function scopeCss(css, componentName, options = {}) {
  const scoper = getCssScoper(options);
  return scoper.processCss(css, componentName);
}

/**
 * Generate scoped class name
 * @param {string} componentName - Component name
 * @param {string} className - Original class name
 * @param {Object} [options={}] - Options (hashMode)
 * @returns {string} Scoped class name
 */
export function generateScopedClassName(
  componentName,
  className,
  options = {}
) {
  const scoper = getCssScoper(options);
  return scoper.generateScopedName(componentName, className);
}

/**
 * Transform HTML class attributes to use scoped class names
 * @param {string} html - HTML template content
 * @param {Object} scopedClasses - Mapping of original to scoped class names
 * @returns {{html: string, componentsCSS: Object}} Transformed HTML and componentsCSS mapping
 */
export function transformHtmlClasses(html, scopedClasses) {
  // Match class="className" or class='className' with optional spaces
  // Handles multiple classes separated by whitespace
  const classAttrRegex = /class\s*=\s*(["'])(.*?)\1/g;

  const transformedHtml = html.replace(
    classAttrRegex,
    (match, quote, classValue) => {
      // Split classes by whitespace
      const classes = classValue.trim().split(/\s+/);

      // Map each class to its scoped version if it exists locally
      const scopedClassesList = classes.map((cls) => {
        return scopedClasses[cls] || cls; // Keep original if not locally defined
      });

      // Rebuild class attribute with original quote style
      return `class=${quote}${scopedClassesList.join(' ')}${quote}`;
    }
  );

  // Build componentsCSS mapping for export
  const componentsCSS = {};
  for (const [original, scoped] of Object.entries(scopedClasses)) {
    componentsCSS[original] = `.${scoped}`;
  }

  return { html: transformedHtml, componentsCSS };
}

/**
 * Create CSS rule string from class name and content
 * @param {string} className - Original class name
 * @param {string} scopedClass - Scoped class name
 * @param {string} ruleContent - Full CSS rule content
 * @returns {string} Full CSS rule with scoped selector
 */
export function createScopedRule(className, scopedClass, ruleContent) {
  // Replace original selector with scoped selector
  const regex = new RegExp(`\\.${className}\\b`, 'g');
  return ruleContent.replace(regex, `.${scopedClass}`);
}
