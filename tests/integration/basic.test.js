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
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain(
      'const renderFunction = morph.build(template);'
    );
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).not.toContain('export const styles');
    expect(result.meta['vite-plugin-morph'].isCSSOnly).toBe(false);

    writeFileSync(outputPath, result.code);

    const outputContent = readFileSync(outputPath, 'utf8');
    expect(outputContent).toContain(
      "import morph from '@peter.naydenov/morph'"
    );
    expect(outputContent).toContain('const template = {');
    expect(outputContent).toContain('"template":');
    expect(outputContent).toContain(
      'const renderFunction = morph.build(template);'
    );
    expect(outputContent).toContain('export default renderFunction;');
    expect(outputContent).not.toContain('export const styles');
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

  it('should handle template-only morph files without placeholders', async () => {
    const inputContent = readFileSync(
      resolve(__dirname, '../fixtures/template-only.morph'),
      'utf8'
    );
    const outputPath = resolve(testOutputDir, 'template-only.js');

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(inputContent, 'template-only.morph');

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain(
      'const renderFunction = morph.build(template);'
    );
    expect(result.code).toContain('export default renderFunction;');
    // Should not contain any placeholder processing logic
    expect(result.code).not.toContain('{{');
    expect(result.code).not.toContain('}}');

    writeFileSync(outputPath, result.code);

    const outputContent = readFileSync(outputPath, 'utf8');
    expect(outputContent).toContain(
      "import morph from '@peter.naydenov/morph'"
    );
    expect(outputContent).toContain('const template = {');
    expect(outputContent).toContain('"template":');
    expect(outputContent).toContain(
      'const renderFunction = morph.build(template);'
    );
    expect(outputContent).toContain('export default renderFunction;');
  });
});
