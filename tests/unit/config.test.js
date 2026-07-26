/**
 * Plugin Configuration Tests
 * @fileoverview Unit tests for the default config schema and validation
 */

import { describe, it, expect } from 'vitest';
import configModule, { loadConfig, validateConfig } from '../../src/plugin/config.js';

describe('Plugin configuration', () => {
  describe('defaultConfig', () => {
    it('should have a top-level hashMode default', () => {
      expect(configModule.defaultConfig.hashMode).toBe('development');
    });

    it('should have css.enabled as a master switch, defaulting to true', () => {
      expect(configModule.defaultConfig.css.enabled).toBe(true);
    });

    it('should have css.postcss boolean flags', () => {
      expect(configModule.defaultConfig.css.postcss).toEqual({
        autoprefixer: true,
        minify: false,
        sourceMaps: true,
      });
    });

    it('should have css.modules with a string generateScopedName pattern', () => {
      expect(configModule.defaultConfig.css.modules.enabled).toBe(true);
      expect(typeof configModule.defaultConfig.css.modules.generateScopedName).toBe(
        'string'
      );
      expect(configModule.defaultConfig.css.modules.generateScopedName).toBe(
        '[name]_[local]_[hash:base64:5]'
      );
    });

    it('should have the five-layer css.layers.order default', () => {
      expect(configModule.defaultConfig.css.layers).toEqual({
        enabled: true,
        order: ['vendors', 'libs', 'modules', 'app', 'context'],
      });
    });

    it('should have css.treeShaking enabled by default', () => {
      expect(configModule.defaultConfig.css.treeShaking).toEqual({ enabled: true });
    });

    it('should have css.bundling enabled by default with an outputDir', () => {
      expect(configModule.defaultConfig.css.bundling).toEqual({
        enabled: true,
        outputDir: 'dist/components',
      });
    });

    it('should have css.debug disabled by default', () => {
      expect(configModule.defaultConfig.css.debug).toEqual({
        enabled: false,
        verbose: false,
        showSourceMaps: false,
      });
    });

    it('should not have the dead developmentLegacy block', () => {
      expect(configModule.defaultConfig.developmentLegacy).toBeUndefined();
    });
  });

  describe('loadConfig', () => {
    it('should accept an empty user config and merge with defaults', () => {
      const config = loadConfig({});

      expect(config.hashMode).toBe('development');
      expect(config.css.layers.order).toEqual([
        'vendors',
        'libs',
        'modules',
        'app',
        'context',
      ]);
    });

    it('should let user config override individual css sub-keys', () => {
      const config = loadConfig({
        css: { modules: { generateScopedName: '[hash:base64:8]' } },
      });

      expect(config.css.modules.generateScopedName).toBe('[hash:base64:8]');
      // Other css defaults should be preserved
      expect(config.css.layers.order).toEqual([
        'vendors',
        'libs',
        'modules',
        'app',
        'context',
      ]);
    });

    it('should not throw for the new css.* keys', () => {
      expect(() =>
        loadConfig({
          css: {
            enabled: false,
            postcss: { autoprefixer: false },
            layers: { order: ['vendors', 'modules', 'app'] },
          },
        })
      ).not.toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should reject a non-string css.modules.generateScopedName', () => {
      expect(() =>
        validateConfig({
          ...configModule.defaultConfig,
          css: {
            ...configModule.defaultConfig.css,
            modules: { generateScopedName: 123 },
          },
        })
      ).toThrow();
    });

    it('should reject a non-array css.layers.order', () => {
      expect(() =>
        validateConfig({
          ...configModule.defaultConfig,
          css: {
            ...configModule.defaultConfig.css,
            layers: { order: 'not-an-array' },
          },
        })
      ).toThrow();
    });

    it('should accept a valid default config without throwing', () => {
      expect(() => validateConfig(configModule.defaultConfig)).not.toThrow();
    });
  });
});
