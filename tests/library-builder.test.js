/**
 * Library Builder Tests
 * Tests for the library build functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLibraryBuilder } from '../src/services/library-builder.js';
import { rm, access } from 'fs/promises';
import { join } from 'path';

describe('Library Builder', () => {
  const testOutputDir = 'test-output/library';

  afterEach(async () => {
    // Cleanup test output
    try {
      await rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }); // after each

  describe('LibraryBuilder Class', () => {
    it('should create instance with default options', () => {
      const builder = createLibraryBuilder();

      expect(builder).toBeDefined();
      expect(builder.entry).toBe('src/main.js');
      expect(builder.outputDir).toBe('dist/library');
    });

    it('should default hashMode to development and postcssOptions to empty', () => {
      const builder = createLibraryBuilder();

      expect(builder.hashMode).toBe('development');
      expect(builder.postcssOptions).toEqual({});
    });

    it('should accept a custom hashMode and postcss options', () => {
      const builder = createLibraryBuilder({
        hashMode: 'production',
        css: { postcss: { autoprefixer: false } },
      });

      expect(builder.hashMode).toBe('production');
      expect(builder.postcssOptions).toEqual({ autoprefixer: false });
    });

    it('should create instance with custom options', () => {
      const builder = createLibraryBuilder({
        entry: 'src/index.js',
        outputDir: 'build/lib',
        library: {
          name: 'test-lib',
          version: '2.0.0',
        },
      });

      expect(builder.entry).toBe('src/index.js');
      expect(builder.outputDir).toBe('build/lib');
      expect(builder.libraryConfig.name).toBe('test-lib');
      expect(builder.libraryConfig.version).toBe('2.0.0');
    });
  });

  describe('generateClientModule', () => {
    it('should use configured default theme', () => {
      const builder = createLibraryBuilder({
        library: { defaultTheme: 'custom' },
      });

      const themes = {
        custom: { variables: {}, raw: '' },
        other: { variables: {}, raw: '' },
      };

      const code = builder.generateClientModule([], themes);

      expect(code).toContain("defaultTheme: 'custom'");
    });

    it('should fall back to projectDefaultTheme when library.defaultTheme is unset', () => {
      const builder = createLibraryBuilder({
        projectDefaultTheme: 'from-project',
      });

      const themes = {
        'from-project': { variables: {}, raw: '' },
        other: { variables: {}, raw: '' },
      };

      const code = builder.generateClientModule([], themes);

      expect(code).toContain("defaultTheme: 'from-project'");
    });
  });

  describe('discoverThemes', () => {
    it('should discover themes from themes directory', async () => {
      // Create builder with example directory
      const builder = createLibraryBuilder({
        rootDir: 'examples/library-demo',
      });

      // Verify the builder has the correct themes directory
      expect(builder.themesDir).toBe('src/themes');

      const themes = await builder.discoverThemes();

      // The themes discovery may or may not find themes depending on directory structure
      // What matters is that the method runs without error
      expect(typeof themes).toBe('object');

      // If themes directory exists, we expect themes to be found
      const fs = await import('fs');
      const themesPath = 'examples/library-demo/src/themes';
      if (fs.existsSync(themesPath)) {
        const files = fs
          .readdirSync(themesPath)
          .filter((f) => f.endsWith('.css'));
        if (files.length > 0) {
          expect(Object.keys(themes).length).toBeGreaterThan(0);
        }
      }
    });
  });
});
