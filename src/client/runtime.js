/**
 * Client Runtime for Style and Theme Management
 * Provides utilities for injecting CSS links and managing themes
 * @fileoverview Runtime helpers for @peter.naydenov/vite-plugin-morph/client
 * @browser
 */

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

/**
 * Set configuration (called by plugin-generated code)
 * @param {Object} config - Configuration object
 */
export function setMorphConfig(config) {
  console.log('[Morph Client] 🔧 setMorphConfig called with:', {
    environment: config.environment,
    themes: config.themes,
    libraryName: config.libraryName,
    cssLength: config.css ? config.css.length : 0,
  });
  morphConfig = { ...morphConfig, ...config };
  console.log(
    '[Morph Client] ✅ morphConfig updated, current env:',
    morphConfig.environment
  );
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
    console.warn(
      '[Morph Client] Cannot create style link in non-browser environment'
    );
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
        console.warn(
          `[Morph Client] Theme '${themeName}' not found. Available: ${themes.join(', ')}`
        );
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
  console.log(
    '[Morph Client] applyStyles called, env:',
    env,
    'config env:',
    config.environment
  );

  switch (env) {
    case 'library':
      return applyStylesLibrary();
    case 'development':
      return applyStylesDev();
    case 'build':
      return applyStylesBuild();
    default:
      console.warn(`[Morph Client] Unknown environment: ${env}, using build`);
      return applyStylesBuild();
  }
}

/**
 * Apply CSS in development mode (embedded styles + theme links)
 * Ensures proper ordering: general → components → themes
 */
async function applyStylesDev() {
  console.log('[Morph Client] applyStylesDev called');
  const config = getConfig();
  console.log('[Morph Client] Config:', {
    cssLength: config.css ? config.css.length : 0,
    themes: config.themes,
    defaultTheme: config.defaultTheme,
  });

  // Apply morph component styles as embedded style element
  if (typeof document !== 'undefined' && config.css) {
    console.log(
      '[Morph Client] Injecting morph CSS, length:',
      config.css.length
    );
    let existing = document.getElementById('morph-css');
    if (!existing) {
      const styleElement = document.createElement('style');
      styleElement.id = 'morph-css';
      styleElement.textContent = config.css;
      document.head.appendChild(styleElement);
      console.log('[Morph Client] Morph CSS element created and added to head');
    } else {
      // Remove and re-add to force CSS re-application
      document.head.removeChild(existing);
      const newStyle = document.createElement('style');
      newStyle.id = 'morph-css';
      newStyle.textContent = config.css;
      document.head.appendChild(newStyle);
      console.log('[Morph Client] Morph CSS element replaced');
    }
  } else {
    console.log('[Morph Client] No morph CSS to inject');
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

  console.log('[Morph Client] Loading local CSS from:', localCssUrl);

  try {
    const response = await fetch(localCssUrl);
    if (response.ok) {
      const css = await response.text();
      console.log('[Morph Client] Loaded local CSS, length:', css.length);

      let existing = document.getElementById('morph-local-css');
      if (existing) {
        document.head.removeChild(existing);
      }

      const style = document.createElement('style');
      style.id = 'morph-local-css';
      style.textContent = css;
      document.head.appendChild(style);
      console.log('[Morph Client] Local CSS injected');
    } else {
      console.log('[Morph Client] Local CSS not found (404), skipping');
    }
  } catch (e) {
    console.log('[Morph Client] Could not load local CSS:', e.message);
  }
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
    console.log('[Morph Client] No libraryName in config');
    return;
  }

  // Construct the cache-busted URL pattern
  const safeName = libraryName.replace('@', '').replace(/\//g, '-');
  const testUrl = `/@morph-processed/${safeName}`;

  console.log('[Morph Client] Trying to load processed CSS from:', testUrl);

  try {
    const response = await fetch(testUrl);
    console.log(
      '[Morph Client] Fetch response:',
      response.status,
      response.statusText
    );
    if (response.ok) {
      const css = await response.text();
      console.log('[Morph Client] Loaded processed CSS, length:', css.length);
      // Inject CSS directly instead of using link tag
      const style = document.createElement('style');
      style.id = 'morph-processed';
      style.textContent = css;
      document.head.appendChild(style);
      console.log('[Morph Client] Injected processed CSS directly');
    } else {
      console.log('[Morph Client] Fetch failed, status:', response.status);
    }
  } catch (e) {
    console.log('[Morph Client] Could not load processed CSS:', e.message);
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
  console.log('[Morph Client] Library mode: Applying CSS via URL links');

  // Check for injected processed CSS URLs from host project
  const injectedProcessedCssUrls =
    typeof window !== 'undefined' ? window.__MORPH_PROCESSED_CSS__ : null;

  // Prefer processed CSS URLs (from host project)
  if (injectedProcessedCssUrls && injectedProcessedCssUrls.length > 0) {
    for (const url of injectedProcessedCssUrls) {
      await loadCssAsync(url);
    }
    console.log(
      '[Morph Client] Using injected processed CSS URLs:',
      injectedProcessedCssUrls
    );
  }
  // Fallback to processed CSS URLs from config
  else if (config.processedCssUrls && config.processedCssUrls.length > 0) {
    for (const url of config.processedCssUrls) {
      await loadCssAsync(url);
    }
    console.log(
      '[Morph Client] Using config processed CSS URLs:',
      config.processedCssUrls
    );
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
    console.log('[Morph Client] Using fallback raw CSS URLs:', config.cssUrls);
  } else if (processedLoaded) {
    console.log('[Morph Client] Processed CSS loaded, skipping raw CSS');
  }

  // Apply default theme
  applyDefaultTheme(config);
}

/**
 * Apply CSS in build mode (URL-based loading for all layers)
 */
function applyStylesBuild() {
  const config = getConfig();
  console.log('[Morph Client] Build mode: Applying CSS via URL links');

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
 * Apply default theme using link tag
 * @param {Object} config - Configuration object
 */
function applyDefaultTheme(config) {
  const defaultTheme = config.defaultTheme;
  if (
    defaultTheme &&
    config.themes.includes(defaultTheme) &&
    defaultTheme !== 'light'
  ) {
    const themeUrl = config.themeUrls[defaultTheme];
    if (themeUrl) {
      console.log(
        '[Morph Client] Applying theme:',
        defaultTheme,
        'URL:',
        themeUrl
      );
      createStyleLink(themeUrl, 'morph-theme');
    } else {
      console.warn(
        '[Morph Client] No URL found for default theme:',
        defaultTheme
      );
    }
  } else {
    console.log(
      '[Morph Client] No default theme to apply or using light (inline)'
    );
  }
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
    if (typeof document === 'undefined')
      return getConfig().defaultTheme || 'default';

    const themeLink = document.getElementById('morph-theme');
    if (!themeLink) return 'light'; // No link means light theme

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
      console.warn(
        '[Morph Client] Cannot switch themes in non-browser environment'
      );
      return false;
    }

    const config = getConfig();

    // Check if theme is available
    if (!config.themes.includes(themeName)) {
      console.warn(
        `[Morph Client] Theme '${themeName}' not found. Available: ${config.themes.join(', ')}`
      );
      return false;
    }

    try {
      if (themeName === 'light') {
        // For light theme, remove the theme link since inline styles handle it
        removeStyleLink('morph-theme');
        return true;
      }

      const themeUrl = config.themeUrls[themeName];
      if (!themeUrl) {
        console.warn(`[Morph Client] No URL found for theme '${themeName}'`);
        return false;
      }

      // Create or update theme link
      createStyleLink(themeUrl, 'morph-theme');

      return true;
    } catch (error) {
      console.warn(
        `[Morph Client] Failed to switch to theme '${themeName}':`,
        error.message
      );
      return false;
    }
  },
};
