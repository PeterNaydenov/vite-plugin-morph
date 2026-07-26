import { describe, it, expect, beforeEach, vi } from 'vitest';

// src/client/runtime.js initializes module-level state (themeRegistry, componentsCSS)
// from window globals at import time, so each test gets a fresh module instance via
// vi.resetModules() + dynamic import, with globals set up beforehand.
async function loadRuntimeWithGlobals(globals = {}) {
  vi.resetModules();

  const styleElements = new Map();
  const headAppended = [];

  const documentMock = {
    getElementById: vi.fn((id) => styleElements.get(id) || null),
    createElement: vi.fn((tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        id: '',
        rel: '',
        href: '',
        textContent: '',
      };
      return el;
    }),
    head: {
      appendChild: vi.fn((el) => {
        headAppended.push(el);
        if (el.id) styleElements.set(el.id, el);
      }),
      removeChild: vi.fn(),
    },
  };

  globalThis.document = documentMock;
  globalThis.window = globalThis;
  globalThis.window.__MORPH_THEME_REGISTRY__ =
    globals.themeRegistry !== undefined ? globals.themeRegistry : undefined;
  globalThis.window.__MORPH_THEMES__ =
    globals.themes !== undefined ? globals.themes : undefined;
  globalThis.window.__MORPH_COMPONENTS_CSS__ =
    globals.componentsCSS !== undefined ? globals.componentsCSS : undefined;

  const mod = await import('../../src/client/runtime.js');
  return { mod, documentMock, headAppended, styleElements };
}

describe('client/runtime.js - themesControl', () => {
  const themeRegistry = [
    { libraryName: 'host', themes: ['light', 'dark'], defaultTheme: 'light' },
  ];
  const themes = {
    host: {
      light: { variables: { '--bg': '#fff' }, raw: '' },
      dark: { variables: { '--bg': '#000' }, raw: '' },
    },
  };

  it('getCurrent() falls back to the configured default before any set() call', async () => {
    const { mod } = await loadRuntimeWithGlobals({ themeRegistry, themes });
    // No setMorphConfig() call, so morphConfig.defaultTheme is the built-in 'default'
    expect(mod.themesControl.getCurrent()).toBe('default');
  });

  it('getCurrent() tracks the last theme actually applied via set()', async () => {
    const { mod } = await loadRuntimeWithGlobals({ themeRegistry, themes });

    const applied = mod.themesControl.set('dark');

    expect(applied).toBeGreaterThan(0);
    expect(mod.themesControl.getCurrent()).toBe('dark');
  });

  it('getDefault() returns the configured default, independent of getCurrent()', async () => {
    const { mod } = await loadRuntimeWithGlobals({ themeRegistry, themes });

    mod.setMorphConfig({ defaultTheme: 'light' });
    mod.themesControl.set('dark');

    expect(mod.themesControl.getCurrent()).toBe('dark');
    expect(mod.themesControl.getDefault()).toBe('light');
  });

  it('setDefault() designates and applies a new default theme', async () => {
    const { mod } = await loadRuntimeWithGlobals({ themeRegistry, themes });

    const ok = mod.themesControl.setDefault('dark');

    expect(ok).toBe(true);
    expect(mod.themesControl.getDefault()).toBe('dark');
    expect(mod.themesControl.getCurrent()).toBe('dark');
  });

  it('has() checks theme existence across all registered libraries', async () => {
    const { mod } = await loadRuntimeWithGlobals({ themeRegistry, themes });

    expect(mod.themesControl.has('dark')).toBe(true);
    expect(mod.themesControl.has('nonexistent')).toBe(false);
  });

  it('list() and listForLibrary() are unaffected by the getCurrent()/getDefault() fix', async () => {
    const { mod } = await loadRuntimeWithGlobals({ themeRegistry, themes });

    expect(mod.themesControl.list()).toEqual(['light', 'dark']);
    expect(mod.themesControl.listForLibrary('host')).toEqual(['light', 'dark']);
  });
});

describe('client/runtime.js - applyStyles() applies the configured default theme', () => {
  // themes[0] is 'dark' but the configured default is 'light' — mirrors a real
  // project where theme files are discovered in alphabetical order (dark.css
  // before light.css) but `themes.defaultTheme: 'light'` was configured.
  // Regression for: the fallback used to pick registry.themes[0] instead of
  // registry.defaultTheme, silently applying whichever theme sorted first.
  const themeRegistry = [
    { libraryName: 'host', themes: ['dark', 'light'], defaultTheme: 'light' },
  ];
  const themes = {
    host: {
      dark: { variables: { '--bg': '#000' }, raw: '' },
      light: { variables: { '--bg': '#fff' }, raw: '' },
    },
  };

  it('uses the registry-configured defaultTheme, not array order, when morphConfig.defaultTheme is unset', async () => {
    const { mod, styleElements } = await loadRuntimeWithGlobals({ themeRegistry, themes });
    mod.setMorphConfig({ environment: 'library' });

    await mod.applyStyles();

    expect(styleElements.get('morph-theme-host').textContent).toContain('--bg: #fff');
  });

  it('does not let the deferred default-theme step overwrite a synchronous set() call made right after applyStyles()', async () => {
    // Regression for: applyStylesDev()/applyStylesBuild() used to apply the
    // default theme AFTER an internal `await`, so it resolved on a later
    // microtask than a synchronous themesControl.set() call placed right
    // after applyStyles() — silently reverting the manual set().
    globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => '' }));

    const { mod, styleElements } = await loadRuntimeWithGlobals({ themeRegistry, themes });
    mod.setMorphConfig({ environment: 'development' });

    const pending = mod.applyStyles(); // intentionally not awaited, like real call sites
    mod.themesControl.set('dark'); // synchronous call immediately after, like main.js does

    await pending;

    expect(mod.themesControl.getCurrent()).toBe('dark');
    expect(styleElements.get('morph-theme-host').textContent).toContain('--bg: #000');
  });
});

describe('client/runtime.js - applyStyles() never creates <link> elements', () => {
  it('applyStyles() in build mode fetches CSS and injects <style> tags, never <link>', async () => {
    globalThis.fetch = vi.fn(async (url) => ({
      ok: true,
      text: async () => `/* css from ${url} */`,
    }));

    const { mod, documentMock } = await loadRuntimeWithGlobals({});
    mod.setMorphConfig({
      environment: 'build',
      generalCss: ':root { --bg: white; }',
      componentCssUrl: '/assets/components.css',
    });

    await mod.applyStyles();

    // No <link> element should ever be created by the client runtime.
    const createdTags = documentMock.createElement.mock.calls.map(([tag]) => tag);
    expect(createdTags).not.toContain('link');
    expect(createdTags.every((tag) => tag === 'style')).toBe(true);
  });

  it('the client runtime no longer exports createStyleLink/removeStyleLink/createThemeController', async () => {
    const { mod } = await loadRuntimeWithGlobals({});
    expect(mod.createStyleLink).toBeUndefined();
    expect(mod.removeStyleLink).toBeUndefined();
    expect(mod.createThemeController).toBeUndefined();
  });
});

describe('client/runtime.js - applyGeneralStyles()', () => {
  it('applies embedded general CSS text directly (no fetch) in build/library mode', async () => {
    globalThis.fetch = vi.fn(); // must never be called in this mode

    const { mod, styleElements } = await loadRuntimeWithGlobals({});
    mod.setMorphConfig({
      environment: 'build',
      generalCss: '@layer app {\n:root { --bg: white; }\n}',
    });

    await mod.applyGeneralStyles();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    const styleEl = styleElements.get('morph-css-general-host');
    expect(styleEl).toBeDefined();
    expect(styleEl.textContent).toContain('--bg: white');
  });

  it('does nothing if there is no embedded general CSS to apply', async () => {
    const { mod, styleElements } = await loadRuntimeWithGlobals({});
    mod.setMorphConfig({ environment: 'build' });

    await mod.applyGeneralStyles();

    expect(styleElements.size).toBe(0);
  });

  it('falls back to the live-reloading dev fetch in development mode', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, text: async () => '.dev { color: red; }' }));

    const { mod } = await loadRuntimeWithGlobals({});
    mod.setMorphConfig({ environment: 'development', generalCss: 'should not be used' });

    await mod.applyGeneralStyles();

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/@morph-css/local/'));
  });

  it('scopes the style element per library, so multiple libraries can coexist', async () => {
    const { mod, styleElements } = await loadRuntimeWithGlobals({});

    mod.setMorphConfig({
      environment: 'library',
      libraryName: 'libA',
      generalCss: ':root { --a: 1; }',
    });
    await mod.applyGeneralStyles();

    mod.setMorphConfig({
      environment: 'library',
      libraryName: 'libB',
      generalCss: ':root { --b: 2; }',
    });
    await mod.applyGeneralStyles();

    // Both libraries' general CSS must coexist as separate style elements,
    // not overwrite each other.
    expect(styleElements.get('morph-css-general-libA').textContent).toContain('--a: 1');
    expect(styleElements.get('morph-css-general-libB').textContent).toContain('--b: 2');
    expect(styleElements.size).toBe(2);
  });
});
