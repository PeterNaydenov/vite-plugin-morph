/**
 * Common test utilities and mock builders
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFixture(fixtureName) {
  return readFileSync(resolve(__dirname, `../fixtures/${fixtureName}`), 'utf8');
}

export function createMockMorphContext(options = {}) {
  const {
    file = 'test.morph',
    hasCss = true,
    hasScript = false,
    timestamp = Date.now(),
  } = options;

  let content = `<template><div class="test">Hello</div></template>`;

  if (hasCss) {
    content += `<style>.test { color: red; }</style>`;
  }

  if (hasScript) {
    content += `<script>function test() { return 'hello'; }</script>`;
  }

  return {
    file,
    read: vi.fn().mockResolvedValue(content),
    timestamp,
    modules: [{ id: file }],
  };
}

export function createMockHmrContext(file = 'test.morph') {
  return {
    file,
    read: vi.fn().mockResolvedValue(`
      <template><div class="test">Hello</div></template>
      <style>.test { color: red; }</style>
    `),
    timestamp: Date.now(),
    modules: [{ id: file }],
  };
}

export function createMockServer() {
  return {
    ws: {
      send: vi.fn(),
    },
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMorphFileContent(options = {}) {
  const {
    template = '<div class="test">Hello</div>',
    style = '.test { color: red; }',
    script = '',
    scriptType = 'text/javascript',
  } = options;

  let content = `<template>${template}</template>`;
  if (style) content += `<style>${style}</style>`;
  if (script) content += `<script type="${scriptType}">${script}</script>`;
  return content;
}

export function expectMorphCodeStructure(result) {
  expect(result).toBeDefined();
  expect(result.code).toBeDefined();
  expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
  expect(result.code).toContain('const template = {');
  expect(result.code).toContain('"template":');
}

export async function setupChunkingService(CSSCollectionService, tempDir, options = {}) {
  const service = new CSSCollectionService({
    outputDir: tempDir,
    chunkingEnabled: true,
    ...options,
  });
  service.applyTreeShaking = async function () { return; };
  return service;
}

export async function addTestComponents(service, components = []) {
  const defaultComponents = [
    { name: 'Button', css: '@layer components { .btn { color: red; } }' },
    { name: 'Input', css: '@layer components { .input { border: 1px solid #ccc; } }' },
    { name: 'Modal', css: '@layer components { .modal { position: fixed; top: 0; } }' },
  ];
  const comps = components.length > 0 ? components : defaultComponents;
  service.startCollection();
  for (const comp of comps) {
    service.addComponentCss(comp.name, comp.css);
  }
  await service.stopCollection();
  return comps;
}

export async function verifyChunksCreated(tempDir, fs) {
  const files = await fs.readdir(tempDir);
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  return {
    cssFiles,
    hasChunksJson: files.includes('chunks.json'),
    multipleChunks: cssFiles.length > 1,
  };
}