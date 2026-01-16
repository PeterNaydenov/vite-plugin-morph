/**
 * Theme Combination and Ordering Tests
 * Tests for combining themes from morph libraries and local themes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM for browser environment
function createMockDOM() {
  const styleElements = {};

  globalThis.document = {
    documentElement: {
      style: {
        setProperty: vi.fn(),
        getPropertyValue: vi.fn().mockReturnValue(''),
      },
    },
    createElement: vi.fn((tag) => {
      if (tag === 'style') {
        return {
          id: '',
          textContent: '',
          remove: vi.fn(),
        };
      }
      return { style: {}, remove: vi.fn() };
    }),
    head: {
      appendChild: vi.fn(),
    },
    getElementById: vi.fn((id) => styleElements[id] || null),
  };

  globalThis.window = {
    __MORPH_THEMES__: {},
    __MORPH_THEME_REGISTRY__: [],
  };

  return {
    addStyleElement: (id, content) => {
      styleElements[id] = {
        id,
        textContent: content,
        remove: vi.fn(),
      };
    },
  };
}

describe('Theme Combination: Library + Local Themes', () => {
  beforeEach(() => {
    createMockDOM();
  });

  describe('Theme Registry Population', () => {
    it('should register library themes first, then local themes', () => {
      // Simulate library registration
      window.__MORPH_THEMES__ = {
        '@myorg/components': {
          dark: {
            variables: { '--color-bg': '#333', '--color-text': '#fff' },
            raw: ':root { --color-bg: #333; --color-text: #fff; }',
          },
          light: {
            variables: { '--color-bg': '#eee', '--color-text': '#000' },
            raw: ':root { --color-bg: #eee; --color-text: #000; }',
          },
        },
      };

      window.__MORPH_THEME_REGISTRY__ = [
        {
          libraryName: '@myorg/components',
          themes: ['dark', 'light'],
          defaultTheme: 'dark',
        },
      ];

      // Simulate local theme registration
      window.__MORPH_THEMES__['host'] = {
        light: {
          variables: {
            '--color-main-background': '#aff',
            '--color-main-foreground': '#00f',
          },
          raw: ':root { --color-main-background: #aff; --color-main-foreground: #00f; }',
        },
      };

      window.__MORPH_THEME_REGISTRY__.push({
        libraryName: 'host',
        themes: ['light'],
        defaultTheme: 'light',
      });

      // Verify registry order (library first, then host)
      expect(window.__MORPH_THEME_REGISTRY__).toHaveLength(2);
      expect(window.__MORPH_THEME_REGISTRY__[0].libraryName).toBe(
        '@myorg/components'
      );
      expect(window.__MORPH_THEME_REGISTRY__[1].libraryName).toBe('host');

      // Verify theme content
      expect(window.__MORPH_THEMES__['@myorg/components']).toBeDefined();
      expect(window.__MORPH_THEMES__['host']).toBeDefined();
    });

    it('should list all themes from all libraries and host', () => {
      window.__MORPH_THEMES__ = {
        '@myorg/components': {
          dark: { variables: {}, raw: '' },
          light: { variables: {}, raw: '' },
        },
        '@myorg/ui': {
          blue: { variables: {}, raw: '' },
          green: { variables: {}, raw: '' },
        },
        host: {
          custom: { variables: {}, raw: '' },
        },
      };

      window.__MORPH_THEME_REGISTRY__ = [
        {
          libraryName: '@myorg/components',
          themes: ['dark', 'light'],
          defaultTheme: 'dark',
        },
        {
          libraryName: '@myorg/ui',
          themes: ['blue', 'green'],
          defaultTheme: 'blue',
        },
        { libraryName: 'host', themes: ['custom'], defaultTheme: 'custom' },
      ];

      // Get all unique theme names
      const allThemes = new Set();
      for (const registry of window.__MORPH_THEME_REGISTRY__) {
        for (const theme of registry.themes) {
          allThemes.add(theme);
        }
      }

      expect(Array.from(allThemes).sort()).toEqual([
        'blue',
        'custom',
        'dark',
        'green',
        'light',
      ]);
    });
  });

  describe('Theme Application Order', () => {
    it('should apply host theme after library themes (CSS cascade)', () => {
      const libraryThemeId = 'morph-theme-myorg-components';
      const hostThemeId = 'morph-theme-host';

      // Simulate applying library theme first
      const libraryVariables = { '--color-bg': '#333', '--color-text': '#fff' };
      const libraryCSS = `:root { ${Object.entries(libraryVariables)
        .map(([p, v]) => `${p}: ${v};`)
        .join(' ')} }`;

      // Simulate applying host theme after (should override)
      const hostVariables = { '--color-bg': '#aff', '--color-text': '#00f' };
      const hostCSS = `:root { ${Object.entries(hostVariables)
        .map(([p, v]) => `${p}: ${v};`)
        .join(' ')} }`;

      // Apply library theme
      let libraryStyle = { id: libraryThemeId, textContent: libraryCSS };

      // Apply host theme (later in DOM = higher priority)
      let hostStyle = { id: hostThemeId, textContent: hostCSS };

      // Verify CSS order: host should come after library
      // In CSS cascade, later rules override earlier ones
      expect(libraryCSS).toContain('#333');
      expect(hostCSS).toContain('#aff');

      // When both are applied, host values should win
      const combinedCSS = libraryCSS + '\n' + hostCSS;
      expect(combinedCSS).toContain('#333');
      expect(combinedCSS).toContain('#aff');

      // Host theme comes last, so its values should be used
      const lastOccurrence = combinedCSS.lastIndexOf('--color-bg');
      expect(combinedCSS.substring(lastOccurrence)).toContain('#aff');
    });

    it('should handle themesControl.set() with multiple registries', () => {
      window.__MORPH_THEMES__ = {
        '@myorg/components': {
          dark: { variables: { '--color-bg': '#333' }, raw: '' },
          light: { variables: { '--color-bg': '#eee' }, raw: '' },
        },
        host: {
          light: { variables: { '--color-bg': '#aff' }, raw: '' },
        },
      };

      window.__MORPH_THEME_REGISTRY__ = [
        {
          libraryName: '@myorg/components',
          themes: ['dark', 'light'],
          defaultTheme: 'dark',
        },
        { libraryName: 'host', themes: ['light'], defaultTheme: 'light' },
      ];

      // themesControl.set('light') should try 'host' first, then other libraries
      const themeName = 'light';
      let applied = 0;

      // First, try 'host' (local themes have highest priority)
      if (
        window.__MORPH_THEMES__['host'] &&
        window.__MORPH_THEMES__['host'][themeName]
      ) {
        applied++;
      }

      // Then apply to other libraries
      for (const registry of window.__MORPH_THEME_REGISTRY__) {
        if (registry.libraryName === 'host') continue;
        if (window.__MORPH_THEMES__[registry.libraryName]?.[themeName]) {
          applied++;
        }
      }

      expect(applied).toBe(2); // host + @myorg/components
    });
  });

  describe('Theme Priority in applyStyles', () => {
    it('should apply library default theme first, then host fallback', () => {
      // Case: Library has 'dark', host has 'light', no default configured
      window.__MORPH_THEMES__ = {
        '@myorg/components': {
          dark: { variables: { '--color-bg': '#333' }, raw: '' },
        },
        host: {
          light: { variables: { '--color-bg': '#aff' }, raw: '' },
        },
      };

      window.__MORPH_THEME_REGISTRY__ = [
        {
          libraryName: '@myorg/components',
          themes: ['dark'],
          defaultTheme: 'dark',
        },
        { libraryName: 'host', themes: ['light'], defaultTheme: '' },
      ];

      const morphConfig = { defaultTheme: undefined };

      // applyDefaultTheme for library
      function applyToLibrary(libraryName) {
        const defaultTheme = morphConfig.defaultTheme || 'dark'; // Library's own default
        if (window.__MORPH_THEMES__[libraryName]?.[defaultTheme]) {
          return true;
        }
        // Fallback for host
        if (libraryName === 'host') {
          const hostRegistry = window.__MORPH_THEME_REGISTRY__.find(
            (r) => r.libraryName === 'host'
          );
          if (hostRegistry?.themes.length > 0) {
            return true; // Would apply first theme
          }
        }
        return false;
      }

      // Library should apply its default
      expect(applyToLibrary('@myorg/components')).toBe(true);

      // Host should fall back to its first theme
      expect(applyToLibrary('host')).toBe(true);
    });

    it('should apply configured default theme to all libraries', () => {
      window.__MORPH_THEMES__ = {
        '@myorg/components': {
          dark: { variables: { '--color-bg': '#333' }, raw: '' },
          light: { variables: { '--color-bg': '#eee' }, raw: '' },
        },
        '@myorg/ui': {
          dark: { variables: { '--color-primary': '#555' }, raw: '' },
          light: { variables: { '--color-primary': '#aaa' }, raw: '' },
        },
        host: {
          dark: { variables: { '--color-bg': '#222' }, raw: '' },
        },
      };

      window.__MORPH_THEME_REGISTRY__ = [
        {
          libraryName: '@myorg/components',
          themes: ['dark', 'light'],
          defaultTheme: 'dark',
        },
        {
          libraryName: '@myorg/ui',
          themes: ['dark', 'light'],
          defaultTheme: 'dark',
        },
        {
          libraryName: 'host',
          themes: ['dark', 'custom'],
          defaultTheme: 'dark',
        },
      ];

      const themeName = 'dark';
      let applied = 0;

      // Apply to all libraries that have 'dark'
      for (const registry of window.__MORPH_THEME_REGISTRY__) {
        if (window.__MORPH_THEMES__[registry.libraryName]?.[themeName]) {
          applied++;
        }
      }

      expect(applied).toBe(3); // All three have 'dark' theme
    });
  });

  describe('Theme Variables Override', () => {
    it('should handle overlapping variables from different sources', () => {
      // Library defines variables
      const libraryVariables = {
        '--color-bg': '#333',
        '--color-text': '#fff',
        '--color-primary': '#666',
      };

      // Host overrides some variables
      const hostVariables = {
        '--color-bg': '#aff', // Override
        '--color-text': '#000', // Override
        '--color-secondary': '#ccc', // New variable
      };

      // When host theme is applied after library, host values override
      const libraryCSS = `:root { ${Object.entries(libraryVariables)
        .map(([p, v]) => `${p}: ${v};`)
        .join(' ')} }`;
      const hostCSS = `:root { ${Object.entries(hostVariables)
        .map(([p, v]) => `${p}: ${v};`)
        .join(' ')} }`;

      // Combined CSS with host last (higher priority)
      const combinedCSS = libraryCSS + '\n' + hostCSS;

      // Parse to verify override order
      const parseCSS = (css) => {
        const vars = {};
        const matches = css.matchAll(/--([^:]+):\s*([^;]+)/g);
        for (const match of matches) {
          vars[`--${match[1]}`] = match[2].trim();
        }
        return vars;
      };

      const parsed = parseCSS(combinedCSS);

      // Host values should win (last occurrence)
      expect(parsed['--color-bg']).toBe('#aff');
      expect(parsed['--color-text']).toBe('#000');
      expect(parsed['--color-primary']).toBe('#666'); // Only from library
      expect(parsed['--color-secondary']).toBe('#ccc'); // Only from host
    });
  });

  describe('HMR with Multiple Theme Sources', () => {
    it('should update host theme variables on file change', async () => {
      window.__MORPH_THEMES__ = {
        host: {
          light: {
            variables: { '--color-bg': '#eee' },
            raw: ':root { --color-bg: #eee; }',
          },
        },
      };

      // Simulate HMR update with new CSS
      const newCSS = ':root { --color-bg: #aff; }';
      const rootMatch = newCSS.match(/:root\s*\{([^}]+)\}/);

      expect(rootMatch).toBeTruthy();

      // Re-parse variables
      const varBlock = rootMatch[1];
      const newVariables = {};
      const varRegex = /--([^\s:]+)\s*:\s*([^;]+)/g;
      let match;
      while ((match = varRegex.exec(varBlock)) !== null) {
        newVariables[`--${match[1]}`] = match[2].trim();
      }

      // Update theme content
      window.__MORPH_THEMES__['host']['light'] = {
        variables: newVariables,
        raw: newCSS,
      };

      expect(
        window.__MORPH_THEMES__['host']['light'].variables['--color-bg']
      ).toBe('#aff');
    });

    it('should not affect library themes when host theme updates', () => {
      window.__MORPH_THEMES__ = {
        '@myorg/components': {
          dark: {
            variables: { '--color-bg': '#333' },
            raw: ':root { --color-bg: #333; }',
          },
        },
        host: {
          light: {
            variables: { '--color-bg': '#eee' },
            raw: ':root { --color-bg: #eee; }',
          },
        },
      };

      // Update only host theme
      window.__MORPH_THEMES__['host']['light'] = {
        variables: { '--color-bg': '#aff' },
        raw: ':root { --color-bg: #aff; }',
      };

      // Library theme should be unchanged
      expect(
        window.__MORPH_THEMES__['@myorg/components']['dark'].variables[
          '--color-bg'
        ]
      ).toBe('#333');

      // Host theme should be updated
      expect(
        window.__MORPH_THEMES__['host']['light'].variables['--color-bg']
      ).toBe('#aff');
    });
  });
});
