/**
 * Theme Variable Extractor Tests
 * @fileoverview Unit tests for theme variable extraction
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  extractThemeVariables,
  extractThemesFromDir,
  extractThemesFromDirs,
  getDefaultTheme,
  buildThemeRegistry,
  getAllThemeNames,
} from '../../src/services/theme-variables.js';

describe('Theme Variable Extractor', () => {
  describe('extractThemeVariables', () => {
    it('should extract :root variables from theme CSS', () => {
      const css = `:root {
        --color-primary: #007bff;
        --spacing-md: 1rem;
      }`;
      const result = extractThemeVariables(css);

      expect(result.variables).toEqual({
        '--color-primary': '#007bff',
        '--spacing-md': '1rem',
      });
      expect(result.raw).toBe(css);
    });

    it('should handle multiple variables with complex values', () => {
      const css = `:root {
        --color-primary: rgba(0, 123, 255, 0.5);
        --font-family: 'Helvetica Neue', Arial, sans-serif;
        --border-radius: calc(4px + var(--spacing-sm));
      }`;
      const result = extractThemeVariables(css);

      expect(result.variables['--color-primary']).toBe(
        'rgba(0, 123, 255, 0.5)'
      );
      expect(result.variables['--font-family']).toBe(
        "'Helvetica Neue', Arial, sans-serif"
      );
      expect(result.variables['--border-radius']).toBe(
        'calc(4px + var(--spacing-sm))'
      );
    });

    it('should handle empty :root block', () => {
      const css = `:root {}`;
      const result = extractThemeVariables(css);

      expect(result.variables).toEqual({});
      expect(result.raw).toBe(css);
    });

    it('should handle theme with no :root', () => {
      const css = `body { margin: 0; }`;
      const result = extractThemeVariables(css);

      expect(result.variables).toEqual({});
      expect(result.raw).toBe(css);
    });

    it('should handle empty string input', () => {
      const result = extractThemeVariables('');

      expect(result.variables).toEqual({});
      expect(result.raw).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(extractThemeVariables(null).variables).toEqual({});
      expect(extractThemeVariables(undefined).variables).toEqual({});
    });

    it('should extract variables with different formatting', () => {
      const css = `:root {
        --color: #fff;
        --spacing : 10px ;
        --font: Arial ;
      }`;
      const result = extractThemeVariables(css);

      expect(result.variables['--color']).toBe('#fff');
      expect(result.variables['--spacing']).toBe('10px');
      expect(result.variables['--font']).toBe('Arial');
    });

    it('should extract variables from entire :root block content', () => {
      // The regex extracts all --var: value pairs from the :root block
      // This includes nested selectors within the :root block
      const css = `:root {
        --color: #fff;
        .nested {
          --nested-color: #000;
        }
      }`;
      const result = extractThemeVariables(css);

      // The regex extracts all variables from the entire :root content
      expect(result.variables['--color']).toBe('#fff');
      expect(result.variables['--nested-color']).toBe('#000'); // Also extracted
    });

    it('should ignore non-variable properties in :root', () => {
      const css = `:root {
        --valid-var: 10px;
        display: block;
        --another-var: red;
      }`;
      const result = extractThemeVariables(css);

      expect(result.variables).toEqual({
        '--valid-var': '10px',
        '--another-var': 'red',
      });
      expect(result.variables['display']).toBeUndefined();
    });

    it('should handle values containing colons (e.g. URLs)', () => {
      const css = `:root {
        --bg-image: url('https://example.com/img.jpg');
      }`;
      const result = extractThemeVariables(css);

      expect(result.variables['--bg-image']).toBe(
        "url('https://example.com/img.jpg')"
      );
    });
  });

  describe('extractThemesFromDir / extractThemesFromDirs', () => {
    let dirA;
    let dirB;

    afterEach(() => {
      for (const dir of [dirA, dirB]) {
        if (dir) rmSync(dir, { recursive: true, force: true });
      }
      dirA = undefined;
      dirB = undefined;
    });

    it('should discover and parse plain .css theme files in a directory', async () => {
      dirA = mkdtempSync(join(tmpdir(), 'morph-themes-'));
      writeFileSync(
        join(dirA, 'dark.css'),
        ':root { --color-bg: #000; --color-text: #fff; }'
      );
      writeFileSync(join(dirA, 'not-a-theme.txt'), 'ignored');

      const themes = await extractThemesFromDir(dirA);

      expect(Object.keys(themes)).toEqual(['dark']);
      expect(themes.dark.variables).toEqual({
        '--color-bg': '#000',
        '--color-text': '#fff',
      });
    });

    it('should return an empty object for a non-existent directory', async () => {
      const themes = await extractThemesFromDir('/nonexistent/themes/dir');
      expect(themes).toEqual({});
    });

    it('should merge multiple directories, first occurrence winning', async () => {
      dirA = mkdtempSync(join(tmpdir(), 'morph-themes-a-'));
      dirB = mkdtempSync(join(tmpdir(), 'morph-themes-b-'));
      writeFileSync(join(dirA, 'dark.css'), ':root { --bg: #000; }');
      writeFileSync(join(dirB, 'dark.css'), ':root { --bg: #111; }');
      writeFileSync(join(dirB, 'light.css'), ':root { --bg: #fff; }');

      const themes = await extractThemesFromDirs([dirA, dirB]);

      expect(Object.keys(themes).sort()).toEqual(['dark', 'light']);
      expect(themes.dark.variables['--bg']).toBe('#000'); // dirA wins
      expect(themes.light.variables['--bg']).toBe('#fff');
    });
  });

  describe('getDefaultTheme', () => {
    const themes = {
      light: { variables: { '--bg': '#fff' }, raw: '' },
      dark: { variables: { '--bg': '#000' }, raw: '' },
    };

    it('should return the configured default theme when it exists', () => {
      const result = getDefaultTheme(themes, 'dark');
      expect(result).toEqual({ name: 'dark', theme: themes.dark });
    });

    it('should fall back to the first available theme when the default is missing', () => {
      const result = getDefaultTheme(themes, 'nonexistent');
      expect(result.name).toBe('light');
    });

    it('should return null when there are no themes at all', () => {
      const result = getDefaultTheme({}, 'default');
      expect(result).toBeNull();
    });
  });

  describe('buildThemeRegistry', () => {
    it('should build registry from theme sources', () => {
      const themeSources = [
        {
          name: '@myorg/lib-a',
          themes: {
            dark: {
              variables: { '--bg': '#000' },
              raw: ':root { --bg: #000; }',
            },
            light: {
              variables: { '--bg': '#fff' },
              raw: ':root { --bg: #fff; }',
            },
          },
        },
        {
          name: '@myorg/lib-b',
          themes: {
            custom: {
              variables: { '--color': 'red' },
              raw: ':root { --color: red; }',
            },
          },
        },
      ];

      const registry = buildThemeRegistry(themeSources);

      expect(registry['@myorg/lib-a']).toBeDefined();
      expect(registry['@myorg/lib-a'].dark.variables['--bg']).toBe('#000');
      expect(registry['@myorg/lib-b']).toBeDefined();
      expect(registry['@myorg/lib-b'].custom.variables['--color']).toBe('red');
    });

    it('should skip invalid sources', () => {
      const themeSources = [
        { name: '@myorg/lib-a', themes: { dark: {} } },
        { themes: { light: {} } }, // Missing name
        { name: '@myorg/lib-b' }, // Missing themes
        null, // Null source
        { name: '@myorg/lib-c', themes: { blue: {} } },
      ];

      const registry = buildThemeRegistry(themeSources);

      // Only valid entries should be included
      expect(registry['@myorg/lib-a']).toBeDefined();
      expect(registry['@myorg/lib-b']).toBeUndefined();
      expect(registry['@myorg/lib-c']).toBeDefined();
    });

    it('should handle empty array', () => {
      const registry = buildThemeRegistry([]);

      expect(registry).toEqual({});
    });
  });

  describe('getAllThemeNames', () => {
    it('should return deduplicated theme names', () => {
      const registry = {
        '@myorg/lib-a': {
          dark: { variables: {} },
          light: { variables: {} },
        },
        '@myorg/lib-b': {
          dark: { variables: {} }, // Duplicate
          custom: { variables: {} },
        },
        '@myorg/lib-c': {
          light: { variables: {} }, // Duplicate
          blue: { variables: {} },
        },
      };

      const themes = getAllThemeNames(registry);

      expect(themes).toEqual(['dark', 'light', 'custom', 'blue']);
      expect(themes.length).toBe(4);
    });

    it('should handle empty registry', () => {
      const themes = getAllThemeNames({});

      expect(themes).toEqual([]);
    });
  });
});
