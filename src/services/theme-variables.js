/**
 * Theme Variable Extractor Service
 * Extracts CSS custom properties from :root blocks in theme files
 * @fileoverview Theme parsing and variable extraction utilities
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Extract CSS variables from :root block
 * @param {string} cssContent - Raw CSS content from theme file
 * @returns {{variables: Object.<string, string>, raw: string}} Extracted variables and original CSS
 * @example
 * const result = extractThemeVariables(':root { --color-primary: #007bff; }');
 * // result.variables = { 'color-primary': '#007bff' }
 * // result.raw = ':root { --color-primary: #007bff; }'
 */
export function extractThemeVariables(cssContent) {
  if (!cssContent || typeof cssContent !== 'string') {
    return { variables: {}, raw: '' };
  }

  // Match :root { ... } block with multiline support
  const match = cssContent.match(/:root\s*\{([^}]*)\}/s);

  if (!match) {
    return { variables: {}, raw: cssContent };
  }

  const declarations = match[1];
  const variables = {};

  // Match CSS custom property declarations: --property-name: value;
  const propertyRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let matchResult;

  while ((matchResult = propertyRegex.exec(declarations)) !== null) {
    const propertyName = matchResult[1];
    const propertyValue = matchResult[2].trim();

    // Store with full property name (including -- prefix in key)
    variables[`--${propertyName}`] = propertyValue;
  }

  return {
    variables,
    raw: cssContent,
  };
}

/**
 * Extract themes from a themes directory
 * @param {string} themesDir - Path to themes directory
 * @returns {Object.<string, {variables: Object.<string, string>, raw: string}>}
 *   Theme registry with theme name as key
 * @example
 * const themes = await extractThemesFromDir('./themes');
 * // themes = {
 * //   dark: { variables: { '--bg': '#000' }, raw: ':root { --bg: #000; }' },
 * //   light: { variables: { '--bg': '#fff' }, raw: ':root { --bg: #fff; }' }
 * // }
 */
export async function extractThemesFromDir(themesDir) {
  const themes = {};

  if (!existsSync(themesDir)) {
    return themes;
  }

  const files = readdirSync(themesDir);

  for (const file of files) {
    if (file.endsWith('.css')) {
      const themeName = file.replace('.css', '');
      const filePath = join(themesDir, file);

      try {
        const content = readFileSync(filePath, 'utf-8');
        themes[themeName] = extractThemeVariables(content);
      } catch (error) {
        console.warn(
          `[theme-variables] Failed to read theme file: ${filePath}`,
          error.message
        );
      }
    }
  }

  return themes;
}

/**
 * Build complete theme registry from multiple theme sources
 * @param {Array<{name: string, themes: Object}>} themeSources - Array of theme sources
 * @returns {Object} Combined theme registry
 * @example
 * const registry = buildThemeRegistry([
 *   { name: '@myorg/lib-a', themes: { dark: {...}, light: {...} } },
 *   { name: '@myorg/lib-b', themes: { custom: {...} } }
 * ]);
 * // registry = {
 * //   '@myorg/lib-a': { dark: {...}, light: {...} },
 * //   '@myorg/lib-b': { custom: {...} }
 * // }
 */
export function buildThemeRegistry(themeSources) {
  const registry = {};

  for (const source of themeSources) {
    if (source && source.name && source.themes) {
      registry[source.name] = source.themes;
    }
  }

  return registry;
}

/**
 * Get list of all available theme names across all sources (deduplicated)
 * @param {Object} themeRegistry - Theme registry from buildThemeRegistry
 * @returns {string[]} Array of unique theme names
 * @example
 * const themes = getAllThemeNames(registry);
 * // ['dark', 'light', 'custom', 'blue']
 */
export function getAllThemeNames(themeRegistry) {
  const allThemes = new Set();

  for (const libraryName of Object.keys(themeRegistry)) {
    const themes = themeRegistry[libraryName];
    for (const themeName of Object.keys(themes)) {
      allThemes.add(themeName);
    }
  }

  return Array.from(allThemes);
}

/**
 * Apply theme variables to DOM
 * @param {Object} variables - Theme variables object
 * @param {string} [prefixId] - Optional prefix for style element ID
 * @returns {HTMLStyleElement} The created style element
 * @example
 * const style = applyThemeToDom({ '--color-primary': '#007bff' }, 'my-theme');
 * // Creates <style id="morph-theme-my-theme">:root { --color-primary: #007bff; }</style>
 */
export function applyThemeToDom(variables, prefixId = '') {
  if (typeof document === 'undefined') {
    console.warn(
      '[theme-variables] Cannot apply theme: document not available'
    );
    return null;
  }

  const id = prefixId ? `morph-theme-${prefixId}` : 'morph-theme';

  // Check if style element already exists
  let style = document.getElementById(id);

  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }

  // Build :root CSS block
  const cssContent = `:root { ${Object.entries(variables)
    .map(([prop, value]) => `${prop}: ${value};`)
    .join(' ')} }`;

  style.textContent = cssContent;

  return style;
}

/**
 * Remove theme style element from DOM
 * @param {string} [prefixId] - Optional prefix for style element ID
 * @returns {boolean} True if element was removed
 * @example
 * removeThemeFromDom('my-theme'); // Removes <style id="morph-theme-my-theme">
 */
export function removeThemeFromDom(prefixId = '') {
  if (typeof document === 'undefined') {
    return false;
  }

  const id = prefixId ? `morph-theme-${prefixId}` : 'morph-theme';
  const style = document.getElementById(id);

  if (style) {
    document.head.removeChild(style);
    return true;
  }

  return false;
}

/**
 * Theme variable extraction result type
 * @typedef {Object} ThemeVariablesResult
 * @property {Object.<string, string>} variables - Extracted CSS custom properties
 * @property {string} raw - Original CSS content
 */

/**
 * Theme registry entry type
 * @typedef {Object} ThemeEntry
 * @property {Object.<string, ThemeVariablesResult>} themes - Theme name to theme data mapping
 */
