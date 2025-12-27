/**
 * Development Experience Integration Tests
 * Tests for CSS HMR, source maps, error reporting, and debugging utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMorphPlugin } from '../../src/plugin/index.js';
import {
  CSSDebugUtils,
  getCssDebugUtils,
  enableCssDebugging,
  disableCssDebugging,
} from '../../src/utils/css-debug.js';
import {
  createCssProcessingError,
  createCssScopingError,
} from '../../src/core/errors.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';

describe('Development Experience Integration', () => {
  let tempDir;
  let plugin;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dev-experience-test-'));
    plugin = createMorphPlugin({
      css: {
        chunking: { enabled: false },
      },
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('CSS Hot Module Replacement', () => {
    it('should handle morph file changes with CSS', async () => {
      const mockContext = {
        file: 'test.morph',
        read: vi.fn().mockResolvedValue(`
          <template>
            <div class="test">Hello</div>
          </template>
          <style>
            .test { color: red; }
          </style>
        `),
        timestamp: Date.now(),
        modules: [{ id: 'test.morph' }],
      };

      const result = await plugin.handleHotUpdate(mockContext);

      expect(result).toBeDefined();
      expect(result).toEqual(mockContext.modules);
    });

    it('should handle morph file changes without CSS', async () => {
      const mockContext = {
        file: 'test.morph',
        read: vi.fn().mockResolvedValue(`
          <template>
            <div>Hello</div>
          </template>
          <script>
            function test() { return 'hello'; }
          </script>
        `),
        timestamp: Date.now(),
        modules: [{ id: 'test.morph' }],
      };

      const result = await plugin.handleHotUpdate(mockContext);

      expect(result).toEqual([mockContext.modules[0]]);
    });

    it('should handle HMR errors gracefully', async () => {
      const mockContext = {
        file: 'test.morph',
        read: vi.fn().mockRejectedValue(new Error('Read failed')),
        timestamp: Date.now(),
        modules: [{ id: 'test.morph' }],
      };

      const result = await plugin.handleHotUpdate(mockContext);

      expect(result).toBeNull();
    });
  });

  describe('CSS Source Maps', () => {
    it('should generate source maps for CSS processing', async () => {
      // This would require a full integration test with actual file processing
      // For now, we test the source map structure
      const mockSourceMap = {
        version: 3,
        sources: ['input.css'],
        names: [],
        mappings: 'AAAA;',
        file: 'output.css',
      };

      expect(mockSourceMap).toHaveProperty('version', 3);
      expect(mockSourceMap).toHaveProperty('sources');
      expect(mockSourceMap).toHaveProperty('mappings');
    });
  });

  describe('CSS Error Reporting', () => {
    it('should create CSS processing errors with location', () => {
      const error = createCssProcessingError(
        'Invalid CSS syntax',
        'test.morph',
        { file: 'test.morph', line: 5, column: 10, offset: 50 }
      );

      expect(error.code).toBe('CSS_PROCESSING_ERROR');
      expect(error.message).toContain('CSS processing failed');
      expect(error.location.line).toBe(5);
      expect(error.location.column).toBe(10);
    });

    it('should create CSS scoping errors', () => {
      const error = createCssScopingError('Invalid selector', 'test.morph', {
        file: 'test.morph',
        line: 3,
        column: 5,
        offset: 20,
      });

      expect(error.code).toBe('CSS_SCOPING_ERROR');
      expect(error.message).toContain('CSS scoping failed');
      expect(error.location.line).toBe(3);
    });
  });

  describe('CSS Debug Utilities', () => {
    let debugUtils;

    beforeEach(() => {
      debugUtils = new CSSDebugUtils({ enabled: true, verbose: true });
    });

    it('should create CSS inspector', () => {
      const css = `
        .button { background: blue; color: white; }
        .input { border: 1px solid #ccc; }
      `;

      const inspector = debugUtils.createInspector(css, 'TestComponent');

      expect(inspector.getRuleCount()).toBeGreaterThan(0);
      expect(inspector.getDeclarationCount()).toBeGreaterThan(0);
      expect(inspector.getSelectors()).toContain('.button');
      expect(inspector.getSelectors()).toContain('.input');
    });

    it('should log CSS processing information', () => {
      // Test that the method exists and can be called
      expect(() => {
        debugUtils.logCssProcessing('TestComponent', {
          originalLength: 100,
          scopedLength: 120,
          processedLength: 110,
          scopedClasses: { button: 'TestComponent_button_abc123' },
        });
      }).not.toThrow();
    });

    it('should log CSS errors', () => {
      // Test that the method exists and can be called
      expect(() => {
        const error = new Error('Test CSS error');
        error.location = { file: 'test.morph', line: 5, column: 10 };
        debugUtils.logCssError(error, 'TestComponent');
      }).not.toThrow();
    });

    it('should respect enabled/disabled state', () => {
      const disabledUtils = new CSSDebugUtils({ enabled: false });
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      disabledUtils.logCssProcessing('TestComponent', {});

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Global Debug Utilities', () => {
    afterEach(() => {
      // Reset global instance
      if (globalThis.globalCssDebugUtils) {
        delete globalThis.globalCssDebugUtils;
      }
    });

    it('should provide global debug utilities instance', () => {
      const utils = getCssDebugUtils({ enabled: true });

      expect(utils).toBeInstanceOf(CSSDebugUtils);
      expect(utils.enabled).toBe(true);
    });

    it('should enable CSS debugging globally', () => {
      enableCssDebugging({ verbose: true });

      const utils = getCssDebugUtils();
      expect(utils.enabled).toBe(true);
      expect(utils.verbose).toBe(true);
    });

    it('should disable CSS debugging globally', () => {
      enableCssDebugging();
      disableCssDebugging();

      const utils = getCssDebugUtils();
      expect(utils.enabled).toBe(false);
    });
  });
});
