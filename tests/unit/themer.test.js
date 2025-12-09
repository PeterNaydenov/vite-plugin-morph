/**
 * Theme System Tests
 * @fileoverview Tests for theme discovery and generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processThemeFile,
  processAllThemes,
  getThemeMetadata,
  listAvailableThemes,
} from '../../src/core/themer.js';
import { createMorphError } from '../../src/core/errors.js';
import path from 'path';

// Mock dependencies
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('path', () => ({
  default: {
    resolve: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
  },
  resolve: vi.fn(),
  dirname: vi.fn(),
  basename: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../src/utils/shared.js', () => ({
  isProductionMode: vi.fn(() => false),
}));

describe('Theme System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processThemeFile', () => {
    it('should process a valid theme file', async () => {
      const {
        readFileSync,
        writeFileSync,
        existsSync: existsSyncMock,
      } = await import('fs');
      const { basename, dirname, resolve } = await import('path');

      readFileSync.mockReturnValue('<style>body { color: red; }</style>');
      writeFileSync.mockImplementation(() => { });

      basename.mockReturnValue('_css.test.morph');
      dirname.mockReturnValue('/themes');
      resolve.mockReturnValue('/themes/test.css');

      const result = await processThemeFile(
        '/themes/_css.test.morph',
        '/output'
      );

      expect(result).toBeDefined();
      expect(result.css).toContain('body { color: red; }');
      expect(result.metadata).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle theme file with no CSS content', async () => {
      const {
        readFileSync,
        writeFileSync,
        existsSync: existsSyncMock,
      } = await import('fs');
      const { basename, dirname, resolve } = await import('path');

      readFileSync.mockReturnValue('<p>No styles here</p>');
      writeFileSync.mockImplementation(() => { });

      basename.mockReturnValue('_css.empty.morph');
      dirname.mockReturnValue('/themes');
      resolve.mockReturnValue('/themes/empty.css');

      const result = await processThemeFile(
        '/themes/_css.empty.morph',
        '/output'
      );

      expect(result.css).toBe('');
    });

    it('should handle invalid theme filename', async () => {
      const { basename } = await import('path');
      basename.mockReturnValue('invalid.txt');

      await expect(
        processThemeFile('/themes/invalid.txt', '/output')
      ).rejects.toThrow('Invalid theme file name');
    });
  });

  describe('processAllThemes', () => {
    it('should process all themes in directory', async () => {
      const { readdirSync, existsSync: existsSyncMock } = await import('fs');
      const { resolve } = await import('path');

      existsSyncMock.mockReturnValue(true);
      readdirSync.mockReturnValue(['_css.light.morph', '_css.dark.morph']);
      resolve.mockImplementation((dir, file) => `${dir}/${file}`);

      // Mock processThemeFile
      vi.doMock('../../src/core/themer.js', async (importOriginal) => {
        const mod = await importOriginal();
        return {
          ...mod,
          processThemeFile: vi.fn().mockResolvedValue({
            css: 'body { color: blue; }',
            metadata: { name: 'light' },
            processingTime: 10,
          }),
        };
      });

      const result = await processAllThemes('/themes', '/output');

      expect(result.results).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle empty themes directory', async () => {
      const { readdirSync, existsSync: existsSyncMock } = await import('fs');

      existsSyncMock.mockReturnValue(true);
      readdirSync.mockReturnValue([]);

      const result = await processAllThemes('/themes', '/output');

      expect(result.results).toEqual({});
      expect(result.errors).toEqual({});
      expect(result.metadata.totalThemes).toBe(0);
    });
  });

  describe('getThemeMetadata', () => {
    it('should return metadata for existing theme', async () => {
      const {
        existsSync: existsSyncMock,
        readdirSync: readdirSyncMock,
      } = await import('fs');

      existsSyncMock.mockReturnValue(true);
      readdirSyncMock.mockReturnValue(['_css.test.morph']);

      const metadata = getThemeMetadata('/themes', 'test');

      expect(metadata).toBeDefined();
      expect(metadata.name).toBe('test');
    });

    it('should return null for non-existent theme', async () => {
      const { existsSync: existsSyncMock } = await import('fs');

      existsSyncMock.mockReturnValue(false);

      const metadata = getThemeMetadata('/themes', 'nonexistent');

      expect(metadata).toBeNull();
    });
  });

  describe('listAvailableThemes', () => {
    it('should list available themes', async () => {
      const {
        existsSync: existsSyncMock,
        readdirSync: readdirSyncMock,
      } = await import('fs');

      existsSyncMock.mockReturnValue(true);
      readdirSyncMock.mockReturnValue([
        'light.css',
        'dark.default.css',
        'custom.css',
      ]);

      const themes = listAvailableThemes('/themes');

      expect(themes).toContain('light');
      expect(themes).toContain('dark');
      expect(themes).toContain('custom');
    });

    it('should return empty array when no themes directory', async () => {
      const { existsSync: existsSyncMock } = await import('fs');

      existsSyncMock.mockReturnValue(false);

      const themes = listAvailableThemes('/themes');

      expect(themes).toEqual([]);
    });
  });
});
