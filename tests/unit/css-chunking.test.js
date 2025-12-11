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
      maxChunkSize: 100,
    });
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    service.startCollection();

    // Add CSS that exceeds chunk size
    service.addComponentCss(
      'Button',
      '@layer components { .btn { color: red; } }'
    );
    service.addComponentCss(
      'Input',
      '@layer components { .input { border: 1px solid #ccc; } }'
    );
    service.addComponentCss(
      'Modal',
      '@layer components { .modal { position: fixed; top: 0; } }'
    );

    await service.stopCollection();

    // Check that chunks were created
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
    // Mock tree-shaking
    service.applyTreeShaking = async function () {
      return;
    };

    service.startCollection();

    service.addComponentCss(
      'Button',
      '@layer components { .btn { color: red; } }'
    );
    service.addComponentCss(
      'Input',
      '@layer components { .input { border: 1px solid #ccc; } }'
    );
    service.addComponentCss(
      'Modal',
      '@layer components { .modal { position: fixed; top: 0; } }'
    );
    service.addComponentCss(
      'Dialog',
      '@layer components { .dialog { z-index: 1000; } }'
    );

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
      '@layer components { .btn { color: red; } }'
    );
    service.addComponentCss(
      'Input',
      '@layer components { .input { border: 1px solid #ccc; } }'
    );
    service.addComponentCss(
      'Modal',
      '@layer components { .modal { position: fixed; top: 0; } }'
    );
    service.addComponentCss(
      'Dialog',
      '@layer components { .dialog { z-index: 1000; } }'
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
      '@layer components { .btn { color: red; } }'
    );
    service.addComponentCss(
      'Input',
      '@layer components { .input { border: 1px solid #ccc; } }'
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
      '@layer components { .btn { color: red; } }'
    );
    service.addComponentCss(
      'Input',
      '@layer components { .input { border: 1px solid #ccc; } }'
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
      '@layer components { .btn { color: red; } }'
    );
    await service.stopCollection();

    // Check that cache manifest was updated
    expect(service.cacheManifest.has('Button')).toBe(true);

    // Second build with same CSS - should not need invalidation
    service.startCollection();
    service.addComponentCss(
      'Button',
      '@layer components { .btn { color: red; } }'
    );
    expect(service.needsCacheInvalidation()).toBe(false);
    await service.stopCollection();

    // Third build with changed CSS - should need invalidation
    service.startCollection();
    service.addComponentCss(
      'Button',
      '@layer components { .btn { color: blue; } }'
    );
    expect(service.needsCacheInvalidation()).toBe(true);
    await service.stopCollection();
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
      '@layer components { .btn { color: red; } }'
    );

    expect(service.needsCacheInvalidation()).toBe(false);
    expect(service.cacheManifest.size).toBe(0);

    await service.stopCollection();

    // Cache should still be empty
    expect(service.cacheManifest.size).toBe(0);
  });
});
