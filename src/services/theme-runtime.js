/**
 * Theme Runtime API
 * Provides runtime API for theme switching and management
 */

import { debug, info, warn } from '../utils/logger.js';

/**
 * Theme Runtime API
 */
export class ThemeRuntime {
  constructor(options = {}) {
    this.currentTheme = options.defaultTheme || 'default';
    this.themes = new Map();
    this.subscribers = new Set();
    this.variables = new Map();
    this.componentStyles = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the theme runtime
   * @param {Map} themes - Available themes
   * @param {Object} options - Initialization options
   */
  async initialize(themes, options = {}) {
    try {
      this.themes = new Map(themes);
      this.currentTheme = options.initialTheme || this.currentTheme;

      // Load initial theme
      await this.loadTheme(this.currentTheme);

      this.isInitialized = true;
      info(`Theme runtime initialized with theme '${this.currentTheme}'`);

      // Notify subscribers
      this.notifySubscribers('initialized', {
        currentTheme: this.currentTheme,
        availableThemes: Array.from(this.themes.keys()),
      });
    } catch (error) {
      warn(`Failed to initialize theme runtime: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load a theme
   * @param {string} themeName - Theme name to load
   * @returns {Promise<boolean>} True if loaded successfully
   */
  async loadTheme(themeName) {
    if (!this.themes.has(themeName)) {
      warn(`Theme '${themeName}' not found`);
      return false;
    }

    try {
      const theme = this.themes.get(themeName);

      // Load CSS variables
      if (theme.variables) {
        this.loadCSSVariables(theme.variables);
      }

      // Load component styles
      if (theme.components) {
        this.loadComponentStyles(theme.components);
      }

      // Update current theme
      const previousTheme = this.currentTheme;
      this.currentTheme = themeName;

      debug(`Loaded theme '${themeName}'`);

      // Notify subscribers
      this.notifySubscribers('themeChanged', {
        previousTheme,
        currentTheme: themeName,
        theme,
      });

      return true;
    } catch (error) {
      warn(`Failed to load theme '${themeName}': ${error.message}`);
      return false;
    }
  }

  /**
   * Switch to a different theme
   * @param {string} themeName - Theme name to switch to
   * @returns {Promise<boolean>} True if switched successfully
   */
  async switchTheme(themeName) {
    if (!this.isInitialized) {
      warn('Theme runtime not initialized');
      return false;
    }

    if (themeName === this.currentTheme) {
      debug(`Already using theme '${themeName}'`);
      return true;
    }

    return await this.loadTheme(themeName);
  }

  /**
   * Load CSS variables into the DOM
   * @param {Object} variables - CSS variables object
   */
  loadCSSVariables(variables) {
    if (typeof globalThis.document === 'undefined') {
      // Server-side environment
      this.variables.clear();
      for (const [key, value] of Object.entries(variables)) {
        this.variables.set(key, value);
      }
      return;
    }

    const root = globalThis.document.documentElement;

    for (const [key, value] of Object.entries(variables)) {
      const cssVarName = key.startsWith('--') ? key : `--${key}`;
      root.style.setProperty(cssVarName, value);
      this.variables.set(cssVarName, value);
    }
  }

  /**
   * Load component styles
   * @param {Object} components - Component styles object
   */
  loadComponentStyles(components) {
    if (typeof globalThis.document === 'undefined') {
      // Server-side environment
      this.componentStyles.clear();
      for (const [component, styles] of Object.entries(components)) {
        this.componentStyles.set(component, styles);
      }
      return;
    }

    // Remove existing component styles
    this.removeComponentStyles();

    // Add new component styles
    const styleElement = globalThis.document.createElement('style');
    styleElement.id = 'morph-component-styles';
    styleElement.textContent = this.buildComponentCSS(components);

    globalThis.document.head.appendChild(styleElement);

    // Store component styles
    this.componentStyles.clear();
    for (const [component, styles] of Object.entries(components)) {
      this.componentStyles.set(component, styles);
    }
  }

  /**
   * Remove existing component styles
   */
  removeComponentStyles() {
    if (typeof globalThis.document === 'undefined') return;

    const existingStyles = globalThis.document.getElementById(
      'morph-component-styles'
    );
    if (existingStyles) {
      existingStyles.remove();
    }
  }

  /**
   * Build component CSS from component styles
   * @param {Object} components - Component styles
   * @returns {string} Component CSS
   */
  buildComponentCSS(components) {
    const cssParts = [];

    for (const [componentName, styles] of Object.entries(components)) {
      if (typeof styles === 'string') {
        cssParts.push(styles);
      } else if (typeof styles === 'object') {
        cssParts.push(this.buildStyleObject(componentName, styles));
      }
    }

    return cssParts.join('\n');
  }

  /**
   * Build style object CSS
   * @param {string} selector - CSS selector
   * @param {Object} styles - Style object
   * @returns {string} CSS rules
   */
  buildStyleObject(selector, styles) {
    const cssLines = [`${selector} {`];

    for (const [property, value] of Object.entries(styles)) {
      if (typeof value === 'object' && value !== null) {
        cssLines.push(this.buildNestedStyles(property, value, '  '));
      } else {
        cssLines.push(`  ${property}: ${value};`);
      }
    }

    cssLines.push('}');
    return cssLines.join('\n');
  }

  /**
   * Build nested styles
   * @param {string} nestedSelector - Nested selector
   * @param {Object} styles - Nested styles
   * @param {string} indent - Indentation
   * @returns {string} Nested CSS
   */
  buildNestedStyles(nestedSelector, styles, indent) {
    const cssLines = [];

    if (nestedSelector.startsWith('@')) {
      cssLines.push(`${indent}${nestedSelector} {`);
      cssLines.push(
        this.buildStyleObject('', styles).replace(/^.*\{\n|\}$/g, '')
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
   * Get current theme name
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get available themes
   * @returns {Array<string>} Array of theme names
   */
  getAvailableThemes() {
    return Array.from(this.themes.keys());
  }

  /**
   * Get theme data
   * @param {string} themeName - Theme name
   * @returns {Object|null} Theme data or null
   */
  getTheme(themeName) {
    return this.themes.get(themeName) || null;
  }

  /**
   * Get current theme data
   * @returns {Object|null} Current theme data
   */
  getCurrentThemeData() {
    return this.getTheme(this.currentTheme);
  }

  /**
   * Get CSS variable value
   * @param {string} variableName - Variable name
   * @returns {string|null} Variable value or null
   */
  getCSSVariable(variableName) {
    const cssVarName = variableName.startsWith('--')
      ? variableName
      : `--${variableName}`;

    if (typeof globalThis.document !== 'undefined') {
      // Browser environment - get from computed style
      const root = globalThis.document.documentElement;
      const styles = globalThis.getComputedStyle(root);
      return styles.getPropertyValue(cssVarName).trim();
    }

    // Server-side environment - get from stored variables
    return this.variables.get(cssVarName) || null;
  }

  /**
   * Set CSS variable value
   * @param {string} variableName - Variable name
   * @param {string} value - Variable value
   */
  setCSSVariable(variableName, value) {
    const cssVarName = variableName.startsWith('--')
      ? variableName
      : `--${variableName}`;

    if (typeof globalThis.document !== 'undefined') {
      globalThis.document.documentElement.style.setProperty(cssVarName, value);
    }

    this.variables.set(cssVarName, value);

    // Notify subscribers
    this.notifySubscribers('variableChanged', {
      variable: cssVarName,
      value,
    });
  }

  /**
   * Get component styles
   * @param {string} componentName - Component name
   * @returns {Object|null} Component styles or null
   */
  getComponentStyles(componentName) {
    return this.componentStyles.get(componentName) || null;
  }

  /**
   * Subscribe to theme events
   * @param {Function} callback - Event callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of events
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  notifySubscribers(event, data) {
    for (const callback of this.subscribers) {
      try {
        callback(event, data);
      } catch (error) {
        warn(`Error in theme subscriber callback: ${error.message}`);
      }
    }
  }

  /**
   * Add a new theme at runtime
   * @param {string} themeName - Theme name
   * @param {Object} themeData - Theme data
   * @returns {boolean} True if added successfully
   */
  addTheme(themeName, themeData) {
    if (this.themes.has(themeName)) {
      warn(`Theme '${themeName}' already exists`);
      return false;
    }

    this.themes.set(themeName, themeData);

    this.notifySubscribers('themeAdded', {
      themeName,
      themeData,
    });

    debug(`Added theme '${themeName}' at runtime`);
    return true;
  }

  /**
   * Remove a theme
   * @param {string} themeName - Theme name to remove
   * @returns {boolean} True if removed successfully
   */
  removeTheme(themeName) {
    if (!this.themes.has(themeName)) {
      warn(`Theme '${themeName}' not found`);
      return false;
    }

    if (themeName === this.currentTheme) {
      warn(`Cannot remove currently active theme '${themeName}'`);
      return false;
    }

    this.themes.delete(themeName);

    this.notifySubscribers('themeRemoved', {
      themeName,
    });

    debug(`Removed theme '${themeName}'`);
    return true;
  }

  /**
   * Get runtime statistics
   * @returns {Object} Runtime statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      currentTheme: this.currentTheme,
      availableThemes: this.getAvailableThemes().length,
      subscribers: this.subscribers.size,
      variables: this.variables.size,
      componentStyles: this.componentStyles.size,
    };
  }

  /**
   * Reset the runtime
   */
  reset() {
    this.currentTheme = 'default';
    this.themes.clear();
    this.subscribers.clear();
    this.variables.clear();
    this.componentStyles.clear();
    this.isInitialized = false;

    if (typeof document !== 'undefined') {
      this.removeComponentStyles();
    }

    debug('Theme runtime reset');
  }
}

/**
 * Global theme runtime instance
 */
let globalThemeRuntime = null;

/**
 * Get or create global theme runtime
 * @param {Object} options - Runtime options
 * @returns {ThemeRuntime} Global theme runtime instance
 */
export function getThemeRuntime(options = {}) {
  if (!globalThemeRuntime) {
    globalThemeRuntime = new ThemeRuntime(options);
  }
  return globalThemeRuntime;
}

/**
 * Create theme runtime instance
 * @param {Object} options - Runtime options
 * @returns {ThemeRuntime} Theme runtime instance
 */
export function createThemeRuntime(options = {}) {
  return new ThemeRuntime(options);
}

export default ThemeRuntime;
