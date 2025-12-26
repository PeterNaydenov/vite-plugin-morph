/**
 * Client Runtime for Style and Theme Management
 * Provides utilities for injecting CSS links and managing themes
 * @fileoverview Runtime helpers for @peter.naydenov/vite-plugin-morph/client
 */

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
 * Apply all CSS layers (general, components, default theme)
 * @param {Object} [assets] - CSS asset URLs (build mode) or undefined (dev mode)
 * @param {string} [assets.main] - Main/general CSS URL
 * @param {string[]} [assets.components] - Component CSS URLs (chunks)
 * @param {string} [assets.defaultTheme] - Default theme CSS URL
 */
export function applyStyles(assets) {
  // If no assets provided, we're in dev mode - this function should be overridden
  // by the generated client module which embeds the CSS directly
  if (!assets) {
    console.warn('[Morph Client] applyStyles() called in dev mode without embedded CSS. Make sure the client module is properly generated.');
    return;
  }

  // Build mode: Load CSS from URLs
  const { main, components = [], defaultTheme } = assets;

  // 1. Apply general/main styles
  if (main) {
    createStyleLink(main, 'morph-main');
  }

  // 2. Apply component CSS (all chunks)
  components.forEach((componentCss, index) => {
    createStyleLink(componentCss, `morph-components-${index}`);
  });

  // 3. Apply default theme
  if (defaultTheme) {
    createStyleLink(defaultTheme, 'morph-theme');
  }
}

/**
 * Pre-configured theme controller for basic theme switching
 * Note: This is a basic implementation. Libraries should create their own
 * theme controller with proper theme URLs using createThemeController().
 */
export const themesControl = {
  list() {
    console.warn('[Morph Client] themesControl.list() - implement in your library');
    return [];
  },

  getCurrent() {
    console.warn('[Morph Client] themesControl.getCurrent() - implement in your library');
    return 'default';
  },

  getDefault() {
    console.warn('[Morph Client] themesControl.getDefault() - implement in your library');
    return 'default';
  },

  set(themeName) {
    console.warn(`[Morph Client] themesControl.set('${themeName}') - implement in your library`);
    return false;
  }
};
