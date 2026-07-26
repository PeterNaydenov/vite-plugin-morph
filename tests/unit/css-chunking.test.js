/**
 * CSS Chunking Tests
 * Tests for CSS chunking functionality in CSS collection service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CSSCollectionService } from '../../src/services/css-collection.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';

describe('CSS Chunking', () => {
  let tempDir;
  let service;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'css-chunking-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('should create size-based chunks when CSS exceeds maxChunkSize', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: true,
      chunkStrategy: 'size',
      maxChunkSize: 40,
    });
    service.applyTreeShaking = async function () { return; };
    service.startCollection();
    service.addComponentCss('Button', '.btn { color: red; }');
    service.addComponentCss('Input', '.input { border: 1px solid #ccc; }');
    service.addComponentCss('Modal', '.modal { position: fixed; top: 0; }');
    await service.stopCollection();
    const files = await fs.readdir(tempDir);
    const cssFiles = files.filter((f) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(1);
    expect(files).toContain('chunks.json');
  });

  it('should create category-based chunks', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: true,
      chunkStrategy: 'category',
    });
    service.applyTreeShaking = async function () { return; };
    service.startCollection();
    service.addComponentCss('Button', '.btn { color: red; }');
    service.addComponentCss('Input', '.input { border: 1px solid #ccc; }');
    service.addComponentCss('Modal', '.modal { position: fixed; top: 0; }');
    service.addComponentCss('Dialog', '.dialog { z-index: 1000; }');
    await service.stopCollection();
    const files = await fs.readdir(tempDir);
    const cssFiles = files.filter((f) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(1);
    expect(files).toContain('chunks.json');
  });

  it('should create manual chunks', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: true,
      chunkStrategy: 'manual',
    });
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    service.defineChunks({
      'ui-components': ['Button', 'Input'],
      overlays: ['Modal', 'Dialog'],
    });

    service.startCollection();

    service.addComponentCss(
      'Button',
      '.btn { color: red; }'
    );
    service.addComponentCss(
      'Input',
      '.input { border: 1px solid #ccc; }'
    );
    service.addComponentCss(
      'Modal',
      '.modal { position: fixed; top: 0; }'
    );
    service.addComponentCss(
      'Dialog',
      '.dialog { z-index: 1000; }'
    );

    await service.stopCollection();

    const files = await fs.readdir(tempDir);
    const cssFiles = files.filter((f) => f.endsWith('.css'));

    expect(cssFiles).toContain('ui-components.css');
    expect(cssFiles).toContain('overlays.css');
    expect(files).toContain('chunks.json');
  });

  it('should generate valid chunk manifest', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: true,
      chunkStrategy: 'size',
      maxChunkSize: 100,
    });
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    service.startCollection();

    service.addComponentCss(
      'Button',
      '.btn { color: red; }'
    );
    service.addComponentCss(
      'Input',
      '.input { border: 1px solid #ccc; }'
    );

    await service.stopCollection();

    const manifestPath = join(tempDir, 'chunks.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    expect(manifest).toHaveProperty('chunks');
    expect(manifest).toHaveProperty('components');

    // Check that all components are mapped to chunks
    expect(Object.keys(manifest.components)).toContain('Button');
    expect(Object.keys(manifest.components)).toContain('Input');
  });

  it('should disable chunking when chunkingEnabled is false', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: false,
    });
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    service.startCollection();

    service.addComponentCss(
      'Button',
      '.btn { color: red; }'
    );
    service.addComponentCss(
      'Input',
      '.input { border: 1px solid #ccc; }'
    );

    await service.stopCollection();

    const files = await fs.readdir(tempDir);
    const cssFiles = files.filter((f) => f.endsWith('.css'));

    expect(cssFiles).toContain('components.css');
    expect(cssFiles).not.toContain('chunks.json');
  });

  it('should detect cache invalidation when CSS changes', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: false,
      cacheEnabled: true,
    });
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    // First build
    service.startCollection();
    service.addComponentCss(
      'Button',
      '.btn { color: red; }'
    );
    await service.stopCollection();

    // Check that cache manifest was updated
    expect(service.cacheManifest.has('Button')).toBe(true);

    // Second build with same CSS - should not need invalidation
    service.startCollection();
    service.addComponentCss(
      'Button',
      '.btn { color: red; }'
    );
    expect(service.needsCacheInvalidation()).toBe(false);
    await service.stopCollection();

    // Third build with changed CSS - should need invalidation
    service.startCollection();
    service.addComponentCss(
      'Button',
      '.btn { color: blue; }'
    );
    expect(service.needsCacheInvalidation()).toBe(true);
    await service.stopCollection();
  });

  it('should wrap component CSS in the modules layer by default (no source given)', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: false,
    });
    service.applyTreeShaking = async function () { return; };
    service.startCollection();
    service.addComponentCss('Button', '.btn { color: red; }');
    await service.stopCollection();

    const css = await fs.readFile(join(tempDir, 'components.css'), 'utf-8');
    expect(css).toContain('@layer vendors, libs, modules, app, context;');
    expect(css).toMatch(/@layer modules \{\n\.btn \{ color: red; \}\n\}/);
    expect(css).not.toContain('@layer libs {');
  });

  it('should wrap library-sourced component CSS in the libs layer', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: false,
    });
    service.applyTreeShaking = async function () { return; };
    service.startCollection();
    service.addComponentCss('Button', '.btn { color: red; }', 'library');
    service.addComponentCss('Card', '.card { padding: 1rem; }', 'module');
    await service.stopCollection();

    const css = await fs.readFile(join(tempDir, 'components.css'), 'utf-8');
    expect(css).toMatch(/@layer libs \{\n\.btn \{ color: red; \}\n\}/);
    expect(css).toMatch(/@layer modules \{\n\.card \{ padding: 1rem; \}\n\}/);
  });

  it('should honor a custom layer order and support disabling layers entirely', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: false,
      layersOrder: ['reset', 'components'],
    });
    service.applyTreeShaking = async function () { return; };
    service.startCollection();
    service.addComponentCss('Button', '.btn { color: red; }');
    await service.stopCollection();

    const css = await fs.readFile(join(tempDir, 'components.css'), 'utf-8');
    expect(css).toContain('@layer reset, components;');

    // Now with layers disabled entirely
    const outputDir2 = join(tempDir, 'no-layers');
    await fs.mkdir(outputDir2, { recursive: true });
    const service2 = new CSSCollectionService({
      outputDir: outputDir2,
      chunkingEnabled: false,
      layersEnabled: false,
    });
    service2.applyTreeShaking = async function () { return; };
    service2.startCollection();
    service2.addComponentCss('Button', '.btn { color: red; }');
    await service2.stopCollection();

    const css2 = await fs.readFile(join(outputDir2, 'components.css'), 'utf-8');
    expect(css2).not.toContain('@layer');
  });

  it('should disable cache when cacheEnabled is false', async () => {
    service = new CSSCollectionService({
      outputDir: tempDir,
      chunkingEnabled: false,
      cacheEnabled: false,
    });
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    service.startCollection();
    service.addComponentCss(
      'Button',
      '.btn { color: red; }'
    );

    expect(service.needsCacheInvalidation()).toBe(false);
    expect(service.cacheManifest.size).toBe(0);

    await service.stopCollection();

    // Cache should still be empty
    expect(service.cacheManifest.size).toBe(0);
  });
});
