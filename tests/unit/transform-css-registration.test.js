/**
 * Transform Hook CSS Registration Tests
 * @fileoverview Confirms the plugin's transform() hook actually registers each
 * component's CSS with the collector (source-tagged library vs. module), which
 * feeds the per-layer @layer wrapping in css-collection.js.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const BUTTON_MORPH = `
<button class="btn">Click me</button>
<style>
.btn { background: blue; }
</style>
`;

describe('transform() hook - CSS collection registration', () => {
  let createMorphPlugin;
  let getCssCollector;

  beforeEach(async () => {
    vi.resetModules();
    ({ createMorphPlugin } = await import('../../src/plugin/index.js'));
    ({ getCssCollector } = await import('../../src/services/css-collection.js'));
  });

  it('should register a host component as source "module"', async () => {
    const plugin = createMorphPlugin();
    const collector = getCssCollector();
    collector.startCollection();

    await plugin.transform(BUTTON_MORPH, '/project/src/components/Button.morph');

    expect(collector.hasComponentCss('Button')).toBe(true);
    expect(collector.components.get('Button').source).toBe('module');
  });

  it('should register a node_modules component as source "library"', async () => {
    const plugin = createMorphPlugin();
    const collector = getCssCollector();
    collector.startCollection();

    await plugin.transform(
      BUTTON_MORPH,
      '/project/node_modules/@myorg/ui/dist/Button.morph'
    );

    expect(collector.hasComponentCss('Button')).toBe(true);
    expect(collector.components.get('Button').source).toBe('library');
  });

  it('should not register CSS-only files as components', async () => {
    const plugin = createMorphPlugin();
    const collector = getCssCollector();
    collector.startCollection();

    await plugin.transform(
      '<style>.global { color: red; }</style>',
      '/project/src/styles/global.morph'
    );

    expect(collector.getCollectedComponents()).toEqual([]);
  });
});
