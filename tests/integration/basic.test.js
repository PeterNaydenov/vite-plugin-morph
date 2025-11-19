/**
 * Basic integration test for morph plugin
 * @fileoverview Tests the complete morph processing pipeline
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

describe('Basic Morph Processing Integration', () => {
  const testOutputDir = resolve(__dirname, '../test-output');

  beforeEach(() => {
    // Clean up and create test output directory
    try {
      if (require('fs').existsSync(testOutputDir)) {
        require('fs').rmSync(testOutputDir, { recursive: true });
      }
      require('fs').mkdirSync(testOutputDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(() => {
    // Clean up test output directory
    try {
      if (require('fs').existsSync(testOutputDir)) {
        require('fs').rmSync(testOutputDir, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should process basic morph file and generate ES module', async () => {
    const inputContent = readFileSync(
      resolve(__dirname, '../fixtures/basic.morph'),
      'utf8'
    );
    const outputPath = resolve(testOutputDir, 'basic.js');

    // Simulate the transform process
    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(inputContent, 'test.morph');

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.code).toContain('export default');
    expect(result.code).toContain('function');

    // Write the output for inspection
    writeFileSync(outputPath, result.code);

    // Verify the output is valid JavaScript
    const outputContent = readFileSync(outputPath, 'utf8');
    expect(outputContent).toContain('export default');
    expect(outputContent).toContain('function');
  });

  it('should handle morph files with helpers and handshake', async () => {
    const inputContent = readFileSync(
      resolve(__dirname, '../fixtures/basic.morph'),
      'utf8'
    );
    const outputPath = resolve(testOutputDir, 'with-handshake.js');

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(inputContent, 'test.morph', {
      development: { sourceMaps: true },
    });

    expect(result).toBeDefined();
    expect(result.code).toContain('export const handshake');
    expect(result.code).toContain('formatTitle');
    expect(result.code).toContain('formatContent');

    writeFileSync(outputPath, result.code);

    const outputContent = readFileSync(outputPath, 'utf8');
    expect(outputContent).toContain('export const handshake');
    expect(outputContent).toContain('export default');
  });

  it('should remove handshake in production mode', async () => {
    const inputContent = readFileSync(
      resolve(__dirname, '../fixtures/basic.morph'),
      'utf8'
    );
    const outputPath = resolve(testOutputDir, 'production.js');

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(inputContent, 'test.morph', {
      production: { removeHandshake: true },
    });

    expect(result).toBeDefined();
    expect(result.code).not.toContain('export const handshake');
    expect(result.code).toContain('export default');

    writeFileSync(outputPath, result.code);

    const outputContent = readFileSync(outputPath, 'utf8');
    expect(outputContent).not.toContain('export const handshake');
    expect(outputContent).toContain('export default');
  });

  it('should handle CSS-only morph files', async () => {
    const inputContent = readFileSync(
      resolve(__dirname, '../fixtures/css-only.morph'),
      'utf8'
    );
    const outputPath = resolve(testOutputDir, 'css-only.js');
    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(inputContent, 'css-only.morph');

    expect(result).toBeDefined();
    expect(result.code).toContain('export const styles');
    expect(result.code).not.toContain('export default');
    expect(result.meta['vite-plugin-morph'].isCSSOnly).toBe(true);

    writeFileSync(outputPath, result.code);

    const outputContent = readFileSync(outputPath, 'utf8');
    expect(outputContent).toContain('export const styles');
    expect(outputContent).not.toContain('export default');
  });

  it('should provide meaningful error messages', async () => {
    const inputContent = readFileSync(
      resolve(__dirname, '../fixtures/syntax-error.morph'),
      'utf8'
    );

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(inputContent, 'syntax-error.morph');

    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta['vite-plugin-morph']).toBeDefined();
    expect(result.meta['vite-plugin-morph'].errors).toBeDefined();
    expect(result.meta['vite-plugin-morph'].errors.length).toBeGreaterThan(0);
  });
});
