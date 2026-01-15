/**
 * Client Runtime for Style and Theme Management
 * Provides utilities for injecting CSS links and managing themes
 * @fileoverview Runtime helpers for @peter.naydenov/vite-plugin-morph/client
 * @browser
 */

/* global fetch */

// Configuration populated by plugin (will be set externally)
let morphConfig = {
  css: '',
  themes: [],
  defaultTheme: 'default',
  themeUrls: {},
  globalCSS: {
    directory: 'src/styles',
    entry: 'main.css',
  },
};

// Theme registry - populated by libraries on load
let themeRegistry = []; // [{libraryName, themes: [], defaultTheme}]
let themeContent = {}; // {libraryName: {themeName: {variables, raw}}}

// Initialize theme registry from global (set by libraries)
function initializeThemeRegistry() {
  if (typeof window === 'undefined') return;

  // Always sync from window globals (they may have been updated by local themes)
  if (window.__MORPH_THEME_REGISTRY__) {
    themeRegistry = window.__MORPH_THEME_REGISTRY__;
  }

  if (window.__MORPH_THEMES__) {
    themeContent = window.__MORPH_THEMES__;
  }
}

// Initialize on module load
initializeThemeRegistry();

// Load config from plugin if available
if (typeof import.meta !== 'undefined' && import.meta.env) {
  try {
    const pluginConfig = await import('virtual:morph-config');
    if (pluginConfig && pluginConfig.default) {
      morphConfig.globalCSS =
        pluginConfig.default.globalCSS || morphConfig.globalCSS;
    }
  } catch (e) {
    // Config not available, use defaults
  }
}

// Load local themes registration code
if (typeof import.meta !== 'undefined' && import.meta.env) {
  try {
    const localThemes = await import('virtual:morph-local-themes');

    // Re-initialize theme registry after local themes are registered
    initializeThemeRegistry();
  } catch (e) {
    // Local themes not available, that's fine
  }
}

/**
 * Set configuration (called by plugin-generated code)
 * @param {Object} config - Configuration object
 */
export function setMorphConfig(config) {
  morphConfig = { ...morphConfig, ...config };
}

export function getMorphConfig() {
  return morphConfig;
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
export function detectEnvironment() {
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
    return null;
  }

  // Check if link already exists
  const existing = document.getElementById(id);
  if (existing) {
    // Update href with cache busting
    const newHref = `${href}?v=${Date.now()}`;
    existing.href = newHref;
    return existing;
  }

  // Create new link element
  const link = document.createElement('link');
  link.id = id;
  link.rel = rel;
  link.href = `${href}?v=${Date.now()}`;

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
    list() {
      return [...themes];
    },

    getCurrent() {
      return currentTheme;
    },

    getDefault() {
      return defaultTheme;
    },

    set(themeName) {
      if (!themes.includes(themeName)) {
        return false;
      }

      const themeUrl = getThemeUrl(themeName);
      createStyleLink(themeUrl, 'morph-theme');
      currentTheme = themeName;

      return true;
    },
  };
}

/**
 * Apply all CSS layers (general, components, themes) in correct order
 */
export function applyStyles() {
  const config = getConfig();

  // Use environment from config if available
  const env = config.environment || detectEnvironment();

  switch (env) {
    case 'library':
      return applyStylesLibrary();
    case 'development':
      return applyStylesDev();
    case 'build':
      return applyStylesBuild();
    default:
      return applyStylesBuild();
  }
}

/**
 * Apply CSS in development mode (embedded styles + theme links)
 * Ensures proper ordering: general → components → themes
 */
async function applyStylesDev() {
  const config = getConfig();

  // Apply morph component styles as embedded style element
  if (typeof document !== 'undefined' && config.css) {
    let existing = document.getElementById('morph-css');
    if (!existing) {
      const styleElement = document.createElement('style');
      styleElement.id = 'morph-css';
      styleElement.textContent = config.css;
      document.head.appendChild(styleElement);
    } else {
      // Remove and re-add to force CSS re-application
      document.head.removeChild(existing);
      const newStyle = document.createElement('style');
      newStyle.id = 'morph-css';
      newStyle.textContent = config.css;
      document.head.appendChild(newStyle);
    }
  }

  // Try to load local CSS from dev server
  await loadLocalCss();

  // Apply default theme via link tag
  applyDefaultTheme(config);
}

/**
 * Load local CSS from /@morph-css/local/ endpoint (HMR enabled)
 */
async function loadLocalCss() {
  if (typeof window === 'undefined') return;

  const config = getConfig();
  const globalCssConfig = config.globalCSS || {};
  const entryFile = globalCssConfig.entry || 'main.css';
  const localCssUrl = `/@morph-css/local/${entryFile}`;

  try {
    const response = await fetch(localCssUrl);
    if (response.ok) {
      const css = await response.text();

      let existing = document.getElementById('morph-local-css');
      if (existing) {
        document.head.removeChild(existing);
      }

      const style = document.createElement('style');
      style.id = 'morph-local-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
  } catch (e) {
    // Could not load local CSS
  }
}

// HMR handler for local CSS changes
if (typeof window !== 'undefined' && import.meta.hot) {
  import.meta.hot.on('morph-local-css-update', async (data) => {
    await loadLocalCss();
  });

  // HMR handler for theme changes
  import.meta.hot.on('morph-theme-change', async (data) => {
    const { libraryName, themeName } = data;

    // For local 'host' themes, we need to re-fetch and parse the CSS
    if (libraryName === 'host') {
      try {
        const themeUrl = `/@morph-css/local/themes/${themeName}.css`;
        const response = await fetch(themeUrl);
        if (response.ok) {
          const css = await response.text();
          const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
          if (rootMatch) {
            const varBlock = rootMatch[1];
            const variables = {};
            const varRegex = /--([^\s:]+)\s*:\s*([^;]+)/g;
            let match;
            while ((match = varRegex.exec(varBlock)) !== null) {
              variables[`--${match[1]}`] = match[2].trim();
            }
            window.__MORPH_THEMES__ = window.__MORPH_THEMES__ || {};
            window.__MORPH_THEMES__['host'] =
              window.__MORPH_THEMES__['host'] || {};
            window.__MORPH_THEMES__['host'][themeName] = {
              variables,
              raw: css,
            };
            themeContent['host'] = window.__MORPH_THEMES__['host'];
          }
        }
      } catch (e) {
        // Failed to fetch local theme
      }
    }

    const currentTheme = themesControl.getCurrent();

    // For host themes, always re-apply since they might have been applied as fallback
    const shouldReapply = libraryName === 'host' || currentTheme === themeName;

    if (shouldReapply) {
      const themes = themeContent[libraryName];
      if (themes && themes[themeName]) {
        const { variables } = themes[themeName];
        const styleId = `morph-theme-${libraryName.replace('@', '').replace('/', '-')}`;
        let style = document.getElementById(styleId);
        if (!style) {
          style = document.createElement('style');
          style.id = styleId;
          document.head.appendChild(style);
        }
        const cssContent = `:root { ${Object.entries(variables)
          .map(([p, v]) => `${p}: ${v};`)
          .join(' ')} }`;
        style.textContent = cssContent;
      }
    }
  });
}

/**
 * Try to load processed CSS from the dev server's morph-processed cache
 * @param {Object} config - Morph config
 * @returns {Promise<void>}
 */
async function tryLoadProcessedCss(config) {
  if (typeof window === 'undefined') return;

  const libraryName = config.libraryName;
  if (!libraryName) {
    return;
  }

  // Construct the cache-busted URL pattern
  const safeName = libraryName.replace('@', '').replace(/\//g, '-');
  const testUrl = `/@morph-processed/${safeName}`;

  try {
    const response = await fetch(testUrl);
    if (response.ok) {
      const css = await response.text();
      // Inject CSS directly instead of using link tag
      const style = document.createElement('style');
      style.id = 'morph-processed';
      style.textContent = css;
      document.head.appendChild(style);
    }
  } catch (e) {
    // Could not load processed CSS
  }
}

/**
 * Load CSS asynchronously and wait for it to be parsed
 * @param {string} url - CSS URL
 * @returns {Promise<void>}
 */
async function loadCssAsync(url) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS: ${url}`));
    document.head.appendChild(link);
  });
}

/**
 * Apply CSS in library mode (URL-based loading for all layers)
 */
async function applyStylesLibrary() {
  const config = getConfig();

  // Check for injected processed CSS URLs from host project
  const injectedProcessedCssUrls =
    typeof window !== 'undefined' ? window.__MORPH_PROCESSED_CSS__ : null;

  // Prefer processed CSS URLs (from host project)
  if (injectedProcessedCssUrls && injectedProcessedCssUrls.length > 0) {
    for (const url of injectedProcessedCssUrls) {
      await loadCssAsync(url);
    }
  }
  // Fallback to processed CSS URLs from config
  else if (config.processedCssUrls && config.processedCssUrls.length > 0) {
    for (const url of config.processedCssUrls) {
      await loadCssAsync(url);
    }
  }
  // Try to load processed CSS from dev server
  else {
    await tryLoadProcessedCss(config);
  }

  // Only load raw CSS as final fallback (if processed CSS wasn't available)
  const processedLoaded = document.getElementById('morph-processed');
  if (!processedLoaded && config.cssUrls && Array.isArray(config.cssUrls)) {
    for (const url of config.cssUrls) {
      createStyleLink(url, `morph-css-${Date.now()}`);
    }
  } else if (processedLoaded) {
    // Processed CSS loaded, skipping raw CSS
  }

  // Apply default theme
  applyDefaultTheme(config);
}

/**
 * Apply CSS in build mode (URL-based loading for all layers)
 */
function applyStylesBuild() {
  const config = getConfig();

  // Build mode should have CSS URLs configured by build process
  // Apply general CSS if URL provided
  if (config.generalCssUrl) {
    createStyleLink(config.generalCssUrl, 'morph-general-css');
  }

  // Apply component CSS if URL provided
  if (config.componentCssUrl) {
    createStyleLink(config.componentCssUrl, 'morph-component-css');
  }

  // Apply default theme
  applyDefaultTheme(config);
}

/**
 * Apply theme variables to DOM for a specific library
 * @param {string} libraryName - Library name
 * @param {string} themeName - Theme name to apply
 * @returns {boolean} True if theme was applied, false if skipped (not available)
 */
function applyThemeToLibrary(libraryName, themeName) {
  if (typeof document === 'undefined') return false;

  const themes = themeContent[libraryName];
  if (!themes || !themes[themeName]) {
    return false;
  }

  const { variables } = themes[themeName];
  if (!variables || Object.keys(variables).length === 0) {
    return false;
  }

  // Create or update theme style element
  const styleId = `morph-theme-${libraryName.replace('@', '').replace('/', '-')}`;
  let style = document.getElementById(styleId);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  // Build :root CSS block with variables
  const cssContent = `:root { ${Object.entries(variables)
    .map(([prop, value]) => `${prop}: ${value};`)
    .join(' ')} }`;

  style.textContent = cssContent;

  return true;
}

/**
 * Apply project's default theme to a library (if available)
 * Called by each library's applyStyles()
 * @param {string} libraryName - Library name to apply theme to
 * @returns {boolean} True if theme was applied
 */
function applyProjectDefaultTheme(libraryName) {
  const defaultTheme = morphConfig.defaultTheme || 'default';

  // First try to apply the configured/default theme
  if (applyThemeToLibrary(libraryName, defaultTheme)) {
    return true;
  }

  // If that failed and we're dealing with 'host' (host project), try first local theme
  if (libraryName === 'host') {
    const hostRegistry = themeRegistry.find((r) => r.libraryName === 'host');
    if (hostRegistry && hostRegistry.themes.length > 0) {
      const firstTheme = hostRegistry.themes[0];
      return applyThemeToLibrary('host', firstTheme);
    }
  }

  return false;
}

/**
 * Apply default theme (per-library during applyStyles calls)
 * @param {Object} config - Morph config
 */
function applyDefaultTheme(config) {
  // Try to apply project's default theme to this library
  if (config.libraryName) {
    applyProjectDefaultTheme(config.libraryName);
  } else {
    // Host project (no libraryName) - apply to 'host' library
    applyProjectDefaultTheme('host');
  }
}

/**
 * Unified theme controller for runtime theme switching
 * Manages themes across all registered libraries
 */
export const themesControl = {
  /**
   * Get list of all available theme names from all libraries (deduplicated)
   * @returns {string[]} Array of unique theme names
   */
  list() {
    const allThemes = new Set();
    for (const registry of themeRegistry) {
      for (const theme of registry.themes) {
        allThemes.add(theme);
      }
    }
    return Array.from(allThemes);
  },

  /**
   * Apply theme to all libraries that have it
   * Tries 'host' (local themes) first, then library themes
   * @param {string} themeName - Theme name to apply
   * @returns {number} Number of libraries the theme was applied to
   */
  set(themeName) {
    if (typeof document === 'undefined') {
      return 0;
    }

    let applied = 0;

    // First, try to apply to 'host' (local themes have highest priority)
    if (applyThemeToLibrary('host', themeName)) {
      applied++;
    }

    // Then apply to other libraries
    for (const registry of themeRegistry) {
      if (registry.libraryName === 'host') continue; // Skip host, already tried
      if (applyThemeToLibrary(registry.libraryName, themeName)) {
        applied++;
      }
    }

    return applied;
  },

  /**
   * Get current project's default theme name
   * @returns {string} Default theme name
   */
  getCurrent() {
    return morphConfig.defaultTheme || 'default';
  },

  /**
   * Set project's default theme and apply it to all libraries
   * @param {string} themeName - Theme name to set as default
   * @returns {boolean} True if theme was set and applied
   */
  setDefault(themeName) {
    // Verify theme exists in at least one library
    const availableThemes = this.list();
    if (!availableThemes.includes(themeName)) {
      return false;
    }

    morphConfig.defaultTheme = themeName;

    // Apply to all libraries that have this theme
    const applied = this.set(themeName);
    return applied > 0;
  },

  /**
   * Get list of themes available in a specific library
   * @param {string} [libraryName] - Library name (optional, uses first if not specified)
   * @returns {string[]} Array of theme names
   */
  listForLibrary(libraryName) {
    if (!libraryName) {
      // Return first library's themes if no name specified
      if (themeRegistry.length > 0) {
        return themeRegistry[0].themes;
      }
      return [];
    }

    const registry = themeRegistry.find((r) => r.libraryName === libraryName);
    return registry ? registry.themes : [];
  },

  /**
   * Check if a theme exists in any library
   * @param {string} themeName - Theme name to check
   * @returns {boolean} True if theme exists
   */
  has(themeName) {
    return this.list().includes(themeName);
  },
};
