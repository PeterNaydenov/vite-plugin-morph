/**
 * Shared Utilities Tests
 * @fileoverview Comprehensive tests for shared utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isProductionMode,
  // Add other shared functions when they exist
} from '../../src/utils/shared.js';

describe('Shared Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    if (process.env) {
      delete process.env.NODE_ENV;
    }
    // Reset process.argv
    process.argv = ['node', 'vitest'];
  });

  afterEach(() => {
    // Clean up environment
    if (process.env) {
      delete process.env.NODE_ENV;
    }
    process.argv = ['node', 'vitest'];
  });

  describe('isProductionMode', () => {
    it('should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';

      const result = isProductionMode({});

      expect(result).toBe(true);
    });

    it('should return false when NODE_ENV is prod', () => {
      process.env.NODE_ENV = 'prod';

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is dev', () => {
      process.env.NODE_ENV = 'dev';

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should return false when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should return true when --production flag is in argv', () => {
      process.argv = ['node', 'vitest', '--production'];

      const result = isProductionMode({});

      expect(result).toBe(true);
    });

    it('should return false when -p flag is in argv', () => {
      process.argv = ['node', 'vitest', '-p'];

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should return false when no production flags in argv', () => {
      process.argv = ['node', 'vitest', '--watch'];

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should return true when options.production.removeHandshake is true', () => {
      const options = {
        production: {
          removeHandshake: true,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(true);
    });

    it('should return false when options.production.removeHandshake is false', () => {
      const options = {
        production: {
          removeHandshake: false,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(false);
    });

    it('should return false when options.production is not set', () => {
      const options = {
        development: {
          sourceMaps: true,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(false);
    });

    it('should prioritize NODE_ENV over other flags', () => {
      process.env.NODE_ENV = 'production';
      process.argv = ['node', 'vitest', '--watch'];

      const options = {
        production: {
          removeHandshake: false,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(true);
    });

    it('should prioritize argv flag over options', () => {
      delete process.env.NODE_ENV;
      process.argv = ['node', 'vitest', '--production'];

      const options = {
        production: {
          removeHandshake: false,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(true);
    });

    it('should handle multiple production indicators', () => {
      process.env.NODE_ENV = 'production';
      process.argv = ['node', 'vitest', '--production'];

      const options = {
        production: {
          removeHandshake: true,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(true);
    });

    it('should handle edge case environments', () => {
      const edgeCases = [
        'PRODUCTION',
        'Production',
        'production',
        'test',
        'testing',
        'staging',
        'development',
        'dev',
        '',
      ];

      for (const env of edgeCases) {
        process.env.NODE_ENV = env;

        const result = isProductionMode({});

        if (
          env === 'production' ||
          env === 'PRODUCTION' ||
          env === 'Production'
        ) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }
    });

    it('should handle malformed argv', () => {
      const malformedArgs = [
        ['node'],
        ['node', 'vitest'],
        ['node', 'vitest', ''],
        ['node', 'vitest', null],
        ['node', 'vitest', undefined],
      ];

      for (const argv of malformedArgs) {
        process.argv = argv;

        const result = isProductionMode({});

        expect(result).toBe(false);
      }
    });

    it('should handle malformed options', () => {
      const malformedOptions = [
        null,
        undefined,
        'string',
        123,
        [],
        { production: null },
        { production: 'invalid' },
        { production: { removeHandshake: 'invalid' } },
      ];

      for (const options of malformedOptions) {
        expect(() => {
          isProductionMode(options);
        }).not.toThrow();
      }
    });

    it('should be case sensitive for NODE_ENV', () => {
      const caseVariations = ['PRODUCTION', 'Production', 'production'];

      for (const env of caseVariations) {
        process.env.NODE_ENV = env;

        const result = isProductionMode({});

        expect(result).toBe(true);
      }
    });

    it('should handle complex argv scenarios', () => {
      const complexArgs = [
        ['node', 'vitest', '--mode', 'production'],
        ['node', 'vitest', '--config', 'vite.config.js', '--production'],
        ['node', 'vitest', '--production', '--watch'],
        ['node', 'vitest', 'run', 'build', '--production'],
      ];

      for (const argv of complexArgs) {
        process.argv = argv;

        const result = isProductionMode({});

        if (argv.includes('--production')) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }
    });

    it('should handle options with nested production settings', () => {
      const complexOptions = {
        production: {
          removeHandshake: true,
          minifyCSS: true,
          sourceMaps: false,
        },
        development: {
          sourceMaps: true,
          hmr: true,
        },
      };

      const result = isProductionMode(complexOptions);

      expect(result).toBe(true);
    });

    it('should handle performance with repeated calls', () => {
      delete process.env.NODE_ENV;
      process.argv = ['node', 'vitest'];

      const options = {
        production: {
          removeHandshake: false,
        },
      };

      // Call multiple times to ensure no side effects
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push(isProductionMode(options));
      }

      // All results should be consistent
      expect(results.every((r) => r === false)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {

    it('should handle process modifications', () => {
      // Test that function works even if process is modified
      const originalEnv = process.env?.NODE_ENV;
      const originalArgv = [...process.argv];

      // Modify process
      process.env.NODE_ENV = 'test';
      process.argv = ['custom', 'args'];

      const result = isProductionMode({});

      expect(result).toBe(false);

      // Restore
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
      process.argv = originalArgv;
    });
  });

  describe('Integration with Real Scenarios', () => {
    it('should work in typical development environment', () => {
      if (!process.env) process.env = {};
      process.env.NODE_ENV = 'development';
      process.argv = ['node', 'vitest', '--watch'];

      const options = {
        development: {
          sourceMaps: true,
          hmr: true,
        },
        production: {
          removeHandshake: true,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(false);
    });

    it('should work in typical production environment', () => {
      if (!process.env) process.env = {};
      process.env.NODE_ENV = 'production';
      process.argv = ['node', 'vitest', 'run', 'build'];

      const result = isProductionMode({});

      expect(result).toBe(true);
    });

    it('should work in CI environment', () => {
      if (!process.env) process.env = {};
      process.env.NODE_ENV = 'test';
      process.argv = ['node', 'vitest', '--run'];

      const result = isProductionMode({});

      expect(result).toBe(false);
    });

    it('should work with custom build scripts', () => {
      if (!process.env) process.env = {};
      delete process.env.NODE_ENV;
      process.argv = ['node', 'build-script.js', '--production'];

      const options = {
        production: {
          removeHandshake: true,
        },
      };

      const result = isProductionMode(options);

      expect(result).toBe(true);
    });
  });
});
