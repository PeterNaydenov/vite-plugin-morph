/**
 * Composer System Tests
 * @fileoverview Comprehensive tests for component composition system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies first
vi.mock('@peter.naydenov/morph', () => ({
  morph: {
    curry: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock the composer module
// Mock the composer module - REMOVED to test actual implementation

vi.mock('../../src/core/config-loader.js', () => ({
  parseMorphConfig: vi.fn(),
}));

// Import after mocking
import {
  processCompositions,
  getCompositionMetadata,
  isComposedComponent,
} from '../../src/core/composer.js';
import { parseMorphConfig } from '../../src/core/config-loader.js';

import { existsSync } from 'fs';

describe('Composer System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to true for file existence to pass validation
    existsSync.mockReturnValue(true);
  });

  // Removed mocked processCompositions tests as they were testing the mock, not the implementation.
  // The 'processCompositions with real config' block covers the actual logic.


  describe('processCompositions with real config', () => {
    it('should process valid compositions', async () => {
      const mockConfig = {
        components: {
          'test-component': {
            host: 'host.morph',
            placeholders: {
              content: 'content.morph',
            },
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await processCompositions('morph.config.js');

      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle missing config file', async () => {
      parseMorphConfig.mockResolvedValue(null); // Simulate config not found
      await expect(processCompositions('missing-config.js')).rejects.toThrow('Configuration file not found or invalid');
    });

    it('should handle invalid compositions', async () => {
      const mockConfig = {
        components: {
          'invalid-component': {
            // Missing host and placeholders
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      await expect(processCompositions('invalid-config.js')).rejects.toThrow('Missing host component');
    });

    it('should handle empty compositions', async () => {
      const mockConfig = {
        components: {},
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await processCompositions('empty-config.js');

      expect(result.results).toEqual({});
      expect(result.errors).toEqual({});
      expect(result.metadata.totalCompositions).toBe(0);
      expect(result.metadata.successfulCompositions).toBe(0);
    });

    it('should handle circular dependencies', async () => {
      const mockConfig = {
        components: {
          'circular-a': {
            host: 'circular-b.morph',
            placeholders: {},
          },
          'circular-b': {
            host: 'circular-a.morph',
            placeholders: {},
          },
        },
      };
      parseMorphConfig.mockResolvedValue(mockConfig);

      await expect(processCompositions('circular-config.js')).rejects.toThrow(
        'Circular dependency detected'
      );
    });

    it('should provide processing metadata', async () => {
      const mockConfig = {
        components: {
          'test-component': {
            host: 'host.morph',
            placeholders: {
              content: 'content.morph',
            },
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await processCompositions('metadata-config.js');

      expect(result.metadata).toHaveProperty('totalCompositions');
      expect(result.metadata).toHaveProperty('successfulCompositions');
      expect(result.metadata).toHaveProperty('failedCompositions');
      expect(result.metadata).toHaveProperty('processingTime');
      expect(typeof result.metadata.processingTime).toBe('number');
    });
  });

  describe('getCompositionMetadata', () => {
    it('should return composition metadata for valid component', async () => {
      const mockConfig = {
        components: {
          'test-component': {
            host: 'host.morph',
            placeholders: {
              content: 'content.morph',
              footer: 'footer.morph',
            },
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await getCompositionMetadata(
        'metadata-config.js',
        'test-component'
      );

      expect(result).toEqual({
        name: 'test-component',
        host: 'host.morph',
        placeholders: {
          content: 'content.morph',
          footer: 'footer.morph',
        },
        isComposed: true,
        source: 'config',
      });
    });

    it('should return null for non-existent component', async () => {
      // Return a valid config, but component won't exist in it
      parseMorphConfig.mockResolvedValue({ components: {} });
      const result = await getCompositionMetadata('config.js', 'non-existent');

      expect(result).toBeNull();
    });

    it('should return null for missing config file', async () => {
      parseMorphConfig.mockResolvedValue(null);
      const result = await getCompositionMetadata('missing-config.js', 'component');

      expect(result).toBeNull();
    });

    it('should handle components with empty placeholders', async () => {
      const mockConfig = {
        components: {
          'empty-placeholders': {
            host: 'host.morph',
            placeholders: {},
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await getCompositionMetadata(
        'empty-placeholders-config.js',
        'empty-placeholders'
      );

      expect(result).toEqual({
        name: 'empty-placeholders',
        host: 'host.morph',
        placeholders: {},
        isComposed: true,
        source: 'config',
      });
    });

    it('should handle components without placeholders property', async () => {
      const mockConfig = {
        components: {
          'no-placeholders': {
            host: 'host.morph',
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await getCompositionMetadata(
        'no-placeholders-config.js',
        'no-placeholders'
      );

      expect(result).toEqual({
        name: 'no-placeholders',
        host: 'host.morph',
        placeholders: {},
        isComposed: true,
        source: 'config',
      });
    });
  });

  describe('isComposedComponent', () => {
    it('should return true for composed components', async () => {
      const mockConfig = {
        components: {
          'composed-component': {
            host: 'host.morph',
            placeholders: {},
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await isComposedComponent(
        'composed-config.js',
        'composed-component'
      );

      expect(result).toBe(true);
    });

    it('should return false for non-composed components', async () => {
      parseMorphConfig.mockResolvedValue({ components: {} });
      const result = await isComposedComponent('config.js', 'regular-component');

      expect(result).toBe(false);
    });

    it('should return false for missing config file', async () => {
      parseMorphConfig.mockResolvedValue(null);
      const result = await isComposedComponent('missing-config.js', 'component');

      expect(result).toBe(false);
    });

    it('should return false for empty components object', async () => {
      const mockConfig = {
        components: {},
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await isComposedComponent(
        'empty-components-config.js',
        'component'
      );

      expect(result).toBe(false);
    });

    it('should handle multiple components correctly', async () => {
      const mockConfig = {
        components: {
          'component-a': { host: 'a.morph' },
          'component-b': { host: 'b.morph' },
          'component-c': { host: 'c.morph' },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      expect(
        await isComposedComponent('multi-components-config.js', 'component-a')
      ).toBe(true);
      expect(
        await isComposedComponent('multi-components-config.js', 'component-b')
      ).toBe(true);
      expect(
        await isComposedComponent('multi-components-config.js', 'component-c')
      ).toBe(true);
      expect(
        await isComposedComponent('multi-components-config.js', 'component-d')
      ).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed config files gracefully', async () => {
      // Test with invalid config that causes parse errors (returns null)
      parseMorphConfig.mockResolvedValue(null);
      const result = await getCompositionMetadata('invalid-config.js', 'component');

      expect(result).toBeNull();
    });

    it('should handle config files with missing components property', async () => {
      const mockConfig = {
        // Missing components property
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await isComposedComponent(
        'no-components-config.js',
        'component'
      );

      expect(result).toBe(false);
    });

    it('should handle config files with null components', async () => {
      const mockConfig = {
        components: null,
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      const result = await isComposedComponent(
        'null-components-config.js',
        'component'
      );

      expect(result).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should work end-to-end with valid configuration', async () => {
      const mockConfig = {
        components: {
          'card-with-button': {
            host: 'card.morph',
            placeholders: {
              action: 'button.morph',
            },
          },
          'simple-card': {
            host: 'card.morph',
            placeholders: {},
          },
        },
      };

      parseMorphConfig.mockResolvedValue(mockConfig);

      // Test metadata retrieval
      const metadata1 = await getCompositionMetadata(
        'integration-config.js',
        'card-with-button'
      );
      const metadata2 = await getCompositionMetadata(
        'integration-config.js',
        'simple-card'
      );

      expect(metadata1).toBeDefined();
      expect(metadata2).toBeDefined();

      // Test composition checking
      expect(
        await isComposedComponent('integration-config.js', 'card-with-button')
      ).toBe(true);
      expect(await isComposedComponent('integration-config.js', 'simple-card')).toBe(
        true
      );
      expect(
        await isComposedComponent('integration-config.js', 'unknown-component')
      ).toBe(false);
    });
  });
});
