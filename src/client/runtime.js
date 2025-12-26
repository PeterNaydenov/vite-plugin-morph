/**
 * Client Runtime for Style and Theme Management
 * Provides utilities for injecting CSS links and managing themes
 * @fileoverview Runtime helpers for @peter.naydenov/vite-plugin-morph/client
 */

// Configuration populated by plugin (will be set externally)
let morphConfig = { css: '', themes: [], defaultTheme: 'default', themeUrls: {} };

/**
 * Set configuration (called by plugin-generated code)
 * @param {Object} config - Configuration object
 */
export function setMorphConfig(config) {
  morphConfig = { ...morphConfig, ...config };
}

/**
 * Get current configuration
 * @returns {Object} Configuration object
 */
function getConfig() {
  return morphConfig;
}

/**
 * Detect the current execution environment
 * @returns {'development' | 'build' | 'library'} Environment type
 */
function detectEnvironment() {
  // Development: Vite dev server provides import.meta.hot
  if (typeof import.meta !== 'undefined' && import.meta.hot) {
    return 'development';
  }

  // Library: Global flag set by library bundler
  if (typeof window !== 'undefined' && window.__MORPH_LIBRARY_MODE__) {
    return 'library';
  }

  // Build: Default production/static mode
  return 'build';
}

/**
 * Create and inject a <link> tag for CSS
 * @param {string} href - CSS file URL
 * @param {string} id - Unique ID for the link element
 * @param {string} [rel='stylesheet'] - Link relationship
 * @returns {HTMLLinkElement} The created link element
 */
export function createStyleLink(href, id, rel = 'stylesheet') {
  if (typeof document === 'undefined') {
    console.warn('[Morph Client] Cannot create style link in non-browser environment');
    return null;
  }

  // Check if link already exists
  const existing = document.getElementById(id);
  if (existing) {
    // Update href if different
    if (existing.href !== href) {
      existing.href = href;
    }
    return existing;
  }

  // Create new link element
  const link = document.createElement('link');
  link.id = id;
  link.rel = rel;
  link.href = href;
  
  // Insert into head
  document.head.appendChild(link);
  
  return link;
}

/**
 * Remove a style link by ID
 * @param {string} id - Link element ID
 */
export function removeStyleLink(id) {
  if (typeof document === 'undefined') return;
  
  const link = document.getElementById(id);
  if (link) {
    link.remove();
  }
}

/**
 * Create a theme controller for managing theme switching
 * @param {Object} config - Theme configuration
 * @param {string[]} config.themes - Available theme names
 * @param {string} config.defaultTheme - Default theme name
 * @param {Function} config.getThemeUrl - Function to get theme CSS URL
 * @returns {Object} Theme controller API
 */
export function createThemeController(config) {
  const { themes = [], defaultTheme = 'default', getThemeUrl } = config;
  let currentTheme = defaultTheme;

  return {
    /**
     * Get list of available themes
     * @returns {string[]} Theme names
     */
    list() {
      return [...themes];
    },

    /**
     * Get current theme name
     * @returns {string} Current theme
     */
    getCurrent() {
      return currentTheme;
    },

    /**
     * Get default theme name
     * @returns {string} Default theme
     */
    getDefault() {
      return defaultTheme;
    },

    /**
     * Switch to a different theme
     * @param {string} themeName - Theme to switch to
     * @returns {boolean} Success status
     */
    set(themeName) {
      if (!themes.includes(themeName)) {
        console.warn(`[Morph Client] Theme '${themeName}' not found. Available: ${themes.join(', ')}`);
        return false;
      }

      const themeUrl = getThemeUrl(themeName);
      createStyleLink(themeUrl, 'morph-theme');
      currentTheme = themeName;
      
      return true;
    }
  };
}

/**
 * Apply all CSS layers (general, components, themes) in correct order
 */
export function applyStyles() {
  const env = detectEnvironment();

  switch (env) {
    case 'development':
      return applyStylesDev();
    case 'library':
      return applyStylesLibrary();
    case 'build':
      return applyStylesBuild();
    default:
      console.warn(`[Morph Client] Unknown environment: ${env}`);
  }
}

/**
 * Apply CSS in development mode (embedded styles)
 * Ensures proper ordering: general → components → themes
 */
function applyStylesDev() {
  const config = getConfig();

  // Apply general/global styles first
  if (typeof document !== 'undefined' && config.css) {
    // Check if already injected, if so update it
    let existing = document.getElementById('morph-collected-css');
    if (!existing) {
      const styleElement = document.createElement('style');
      styleElement.id = 'morph-collected-css';
      styleElement.textContent = config.css;
      document.head.appendChild(styleElement);
    } else {
      // Update existing style tag with new CSS
      existing.textContent = config.css;
    }
  }

  // Apply default theme last (if available)
  const defaultTheme = config.defaultTheme;
  if (defaultTheme && config.themes.includes(defaultTheme)) {
    const themeUrl = config.themeUrls[defaultTheme];
    if (themeUrl) {
      createStyleLink(themeUrl, 'morph-theme');
    }
  }
}

/**
 * Apply CSS in library mode (URL-based loading)
 */
function applyStylesLibrary() {
  const config = getConfig();
  // In library mode, we assume CSS is pre-loaded by the library bundler
  // This is a no-op since the library should have already applied styles
  console.log('[Morph Client] Library mode: CSS should be pre-loaded by library');
}

/**
 * Apply CSS in build mode (URL-based loading)
 */
function applyStylesBuild() {
  // In build mode, CSS URLs would be provided via config
  // This is handled by the build process embedding actual URLs
  console.log('[Morph Client] Build mode: CSS URLs should be embedded by build process');
}

/**
 * Unified theme controller for runtime theme switching
 * Uses DOM link manipulation for theme switching
 */
export const themesControl = {
  /**
   * Get list of available themes
   * @returns {string[]} Array of theme names
   */
  list() {
    const config = getConfig();
    return config.themes || [];
  },

  /**
   * Get current active theme by inspecting DOM
   * @returns {string} Current theme name
   */
  getCurrent() {
    if (typeof document === 'undefined') return getConfig().defaultTheme || 'default';

    const themeLink = document.getElementById('morph-theme');
    if (!themeLink) return getConfig().defaultTheme || 'default';

    // Extract theme name from URL
    const href = themeLink.href;
    const match = href.match(/\/themes\/([^/?]+)\.css/);
    return match ? match[1] : getConfig().defaultTheme || 'default';
  },

  /**
   * Get default theme name
   * @returns {string} Default theme name
   */
  getDefault() {
    const config = getConfig();
    return config.defaultTheme || 'default';
  },

  /**
   * Switch to specified theme via DOM link manipulation
   * @param {string} themeName - Name of theme to switch to
   * @returns {boolean} Success status
   */
  set(themeName) {
    if (typeof document === 'undefined') {
      console.warn('[Morph Client] Cannot switch themes in non-browser environment');
      return false;
    }

    const config = getConfig();

    // Check if theme is available
    if (!config.themes.includes(themeName)) {
      console.warn(`[Morph Client] Theme '${themeName}' not found. Available: ${config.themes.join(', ')}`);
      return false;
    }

    try {
      const themeUrl = config.themeUrls[themeName];
      if (!themeUrl) {
        console.warn(`[Morph Client] No URL found for theme '${themeName}'`);
        return false;
      }

      // Create or update theme link
      createStyleLink(themeUrl, 'morph-theme');

      return true;
    } catch (error) {
      console.warn(`[Morph Client] Failed to switch to theme '${themeName}':`, error.message);
      return false;
    }
  }
};
