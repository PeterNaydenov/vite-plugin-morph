/**
 * Processor Config Wiring Tests
 * @fileoverview Confirms css.* config options actually change processMorphFile() behavior,
 * not just that they exist in the default config.
 */

import { describe, it, expect } from 'vitest';
import { processMorphFile } from '../../src/core/processor.js';

const BUTTON_MORPH = `
<button class="btn">Click me</button>
<style>
.btn { background: blue; }
</style>
`;

describe('processMorphFile - css.* config wiring', () => {
  it('should scope CSS class names by default (css.enabled defaults to true)', async () => {
    const result = await processMorphFile(BUTTON_MORPH, 'Button.morph', {
      hashMode: 'production',
    });

    expect(result.code).toMatch(/Button_btn_[a-z0-9]{5}/);
    expect(result.code).not.toContain('.btn { background: blue; }');
  });

  it('should pass through raw, unscoped CSS when css.enabled is false', async () => {
    const result = await processMorphFile(BUTTON_MORPH, 'Button.morph', {
      hashMode: 'production',
      css: { enabled: false },
    });

    expect(result.code).toContain('.btn { background: blue; }');
    expect(result.code).not.toMatch(/Button_btn_[a-z0-9]{5}/);
  });

  it('should use a custom css.modules.generateScopedName pattern', async () => {
    const result = await processMorphFile(BUTTON_MORPH, 'Button.morph', {
      hashMode: 'production',
      css: { modules: { generateScopedName: '[local]--[hash:base64:5]' } },
    });

    expect(result.code).toMatch(/btn--[a-z0-9]{5}/);
  });

  it('should apply autoprefixer when css.postcss.autoprefixer is enabled', async () => {
    const morph = `
<div class="box">content</div>
<style>
.box { display: flex; }
</style>
`;
    const result = await processMorphFile(morph, 'Box.morph', {
      hashMode: 'production',
      css: { postcss: { autoprefixer: true } },
    });

    // autoprefixer adds vendor-prefixed display values for flex in some target browsers;
    // at minimum it must not fail and must still contain the scoped flex rule.
    expect(result.code).toMatch(/Box_box_[a-z0-9]{5}/);
    expect(result.code).toContain('display');
  });
});

describe('processMorphFile - dev-mode CSS source maps', () => {
  // Deliberately pad the <style> block down several lines so a naive
  // implementation (mapping from the extracted CSS's own line 1) would be
  // caught out — `.card {` must resolve to its real line (5), not line 2.
  const MULTILINE_MORPH = `<div class="card">{{ text }}</div>


<style>
.card {
  color: green;
}
</style>
`;

  it('embeds a sourceMappingURL comment only when isDevServer is true', async () => {
    const devResult = await processMorphFile(
      MULTILINE_MORPH,
      '/project/src/components/Card.morph',
      { hashMode: 'production', rootDir: '/project', isDevServer: true }
    );
    expect(devResult.processedCss).toContain(
      '/*# sourceMappingURL=data:application/json;base64,'
    );

    // Build/library mode (isDevServer unset) must not carry the comment —
    // it would just bloat shipped output for no benefit there.
    const buildResult = await processMorphFile(
      MULTILINE_MORPH,
      '/project/src/components/Card.morph',
      { hashMode: 'production', rootDir: '/project' }
    );
    expect(buildResult.processedCss).not.toContain('sourceMappingURL');
  });

  it('maps the generated CSS back to the real line number in the .morph file', async () => {
    const result = await processMorphFile(
      MULTILINE_MORPH,
      '/project/src/components/Card.morph',
      { hashMode: 'production', rootDir: '/project', isDevServer: true }
    );

    const match = result.processedCss.match(
      /sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/
    );
    expect(match).not.toBeNull();
    const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8'));

    // Embeds the real project-relative path and the exact original file text
    // (sourcesContent) — required since .morph files aren't fetchable over
    // HTTP the way a plain .css asset would be, so DevTools has no other way
    // to show the original source.
    expect(map.sources).toEqual(['src/components/Card.morph']);
    expect(map.sourcesContent[0]).toBe(MULTILINE_MORPH);

    const { SourceMapConsumer } = await import('source-map-js');
    const consumer = new SourceMapConsumer(map);
    let minLine = Infinity;
    consumer.eachMapping((m) => {
      if (m.originalLine != null) minLine = Math.min(minLine, m.originalLine);
    });
    expect(minLine).toBe(5); // `.card {` sits on line 5 of MULTILINE_MORPH
  });
});

describe('processMorphFile - CSS layer wrapping for the self-injecting <style> tag', () => {
  // The compiled module embeds `const css = "...";` for the <style> tag that
  // every .morph component self-injects on import (in every environment, not
  // just dev) — this must carry the same @layer wrapping as the bundled CSS
  // path, or module CSS would always win over app/context-layer overrides.
  const MODULE_MORPH = `<div class="card">{{ text }}</div>
<style>
.card {
  color: green;
}
</style>
`;

  function extractCssBinding(code) {
    const match = code.match(/const css = (".*?");\nexport \{ css \};/s);
    return match ? JSON.parse(match[1]) : null;
  }

  it('wraps in @layer modules for local (non-node_modules) components', async () => {
    const result = await processMorphFile(
      MODULE_MORPH,
      '/project/src/components/Card.morph',
      { hashMode: 'production', rootDir: '/project' }
    );

    const injectedCss = extractCssBinding(result.code);
    expect(injectedCss).toMatch(/^@layer modules \{/);
    expect(injectedCss).toContain('.Card_card_');
  });

  it('wraps in @layer libs for components resolved from node_modules', async () => {
    const result = await processMorphFile(
      MODULE_MORPH,
      '/project/node_modules/@some/lib/Card.morph',
      { hashMode: 'production', rootDir: '/project' }
    );

    const injectedCss = extractCssBinding(result.code);
    expect(injectedCss).toMatch(/^@layer libs \{/);
  });

  it('does not wrap when css.layers.enabled is false', async () => {
    const result = await processMorphFile(
      MODULE_MORPH,
      '/project/src/components/Card.morph',
      {
        hashMode: 'production',
        rootDir: '/project',
        css: { layers: { enabled: false } },
      }
    );

    const injectedCss = extractCssBinding(result.code);
    expect(injectedCss).not.toContain('@layer');
  });

  it('does not double-wrap the bundle-path result.processedCss', async () => {
    // css-collection.js wraps in @layer again at bundle time — the
    // per-component processedCss used for that path must stay unwrapped.
    const result = await processMorphFile(
      MODULE_MORPH,
      '/project/src/components/Card.morph',
      { hashMode: 'production', rootDir: '/project' }
    );

    expect(result.processedCss).not.toContain('@layer');
  });

  it('keeps the dev sourceMappingURL comment outside the @layer block and shifts its map by one generated line', async () => {
    const result = await processMorphFile(
      MODULE_MORPH,
      '/project/src/components/Card.morph',
      { hashMode: 'production', rootDir: '/project', isDevServer: true }
    );

    const injectedCss = extractCssBinding(result.code);
    // Comment must come AFTER the closing brace, not nested inside the layer.
    expect(injectedCss).toMatch(/\n\}\n\/\*# sourceMappingURL=.*\*\/$/);

    const match = injectedCss.match(
      /sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/
    );
    const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8'));

    const { SourceMapConsumer } = await import('source-map-js');
    const consumer = new SourceMapConsumer(map);
    let minLine = Infinity;
    consumer.eachMapping((m) => {
      if (m.originalLine != null) minLine = Math.min(minLine, m.originalLine);
    });
    // `.card {` sits on line 3 of MODULE_MORPH. The @layer wrapper adds one
    // generated line above the original content; if the map weren't shifted
    // to account for it, this would resolve to line 2 instead.
    expect(minLine).toBe(3);
  });
});
