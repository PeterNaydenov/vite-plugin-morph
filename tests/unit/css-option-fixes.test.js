/**
 * CSS Option Fixes Tests
 * @fileoverview Hyphen-prefix class scoping and deep merging of plugin options.
 */

import { describe, it, expect } from 'vitest';
import { createMorphPlugin } from '../../src/plugin/index.js';
import { compileMorph } from '../utils/compile-morph.js';

describe('scoping classes that prefix other classes', () => {
  it('should scope .btn and .btn-primary independently', async () => {
    const { module } = await compileMorph(
      `<button class="btn btn-primary">x</button>
<style>.btn { padding: 1px; } .btn-primary { color: red; }</style>`,
      'PrefixButton',
      { hashMode: 'development' }
    );

    expect(module.css).toContain(`.${module.styles['btn-primary']} {`);
    expect(module.css).toContain(`.${module.styles.btn} {`);
    expect(module.default('render')).toContain(module.styles['btn-primary']);
  });
});

describe('plugin option merging', () => {
  it('should keep autoprefixer when only css.postcss.minify is set', async () => {
    const plugin = createMorphPlugin({ css: { postcss: { minify: true } } });
    plugin.configResolved({ root: process.cwd(), command: 'build' });

    const result = await plugin.transform(
      `<div class="box">x</div><style>.box { user-select: none; }</style>`,
      `${process.cwd()}/Box.morph`
    );

    expect(result.code).toContain('-webkit-user-select');
  });
});
