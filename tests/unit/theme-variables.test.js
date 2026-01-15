/**
 * Theme Variable Extractor Tests
 * @fileoverview Unit tests for theme variable extraction
 */

import { describe, it, expect } from 'vitest';
import {
  extractThemeVariables,
  extractThemesFromDir,
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
