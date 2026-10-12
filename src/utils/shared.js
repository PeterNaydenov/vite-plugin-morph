/**
 * Shared utility functions for morph plugin
 * @fileoverview Common utilities used across multiple modules
 * @author Peter Naydenov
 * @version 0.0.10
 */

/**
 * Check if running in production mode (NODE_ENV or --production flag).
 * Plugin options deliberately don't factor in: `production.removeHandshake`
 * controls handshake stripping only, not CSS hashing.
 * @returns {boolean} Whether in production mode
 */
export function isProductionMode() {
  // Handle undefined process.env or process.argv
  const nodeEnv = process.env?.NODE_ENV;
  const argv = process.argv || [];

  // Check NODE_ENV (case insensitive for common variations)
  const isNodeEnvProduction =
    nodeEnv && ['production', 'PRODUCTION', 'Production'].includes(nodeEnv);

  // Check command line arguments
  const hasProductionFlag = argv.includes('--production');

  return isNodeEnvProduction || hasProductionFlag;
}

/**
 * Build style object CSS
 * @param {string} selector - CSS selector
 * @param {Object} styles - Style object
 * @returns {string} CSS rules
 */
export function buildStyleObject(selector, styles) {
  const cssLines = [`${selector} {`];

  for (const [property, value] of Object.entries(styles)) {
    if (typeof value === 'object' && value !== null) {
      cssLines.push(buildNestedStyles(property, value, '  '));
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
export function buildNestedStyles(nestedSelector, styles, indent) {
  const cssLines = [];

  if (nestedSelector.startsWith('@')) {
    cssLines.push(`${indent}${nestedSelector} {`);
    cssLines.push(
      buildStyleObject('', styles).replace(/^.*\{\n|\}$/g, '')
    );
    cssLines.push(`${indent}}`);
  } else {
    cssLines.push(`${indent}&${nestedSelector} {`);
    for (const [property, value] of Object.entries(styles)) {
      cssLines.push(`${indent}  ${property}: ${value};`);
    }
    cssLines.push(`${indent}}`);
  }

  return cssLines.join('\n');
}

/**
 * Build CSS rule string from processing result
 * @param {Object} result - Morph processing result
 * @returns {string} CSS rule string
 */
export function buildCssRuleFromResult(result) {
  if (result.componentsCSS) {
    const cssParts = [];
    for (const [className, rule] of Object.entries(result.componentsCSS)) {
      cssParts.push(rule);
    }
    return cssParts.join('\n');
  } else if (result.cssExports) {
    return result.cssExports;
  }
  return '';
}
