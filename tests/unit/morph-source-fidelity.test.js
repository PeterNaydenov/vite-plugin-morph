/**
 * Morph Source Fidelity Tests
 * @fileoverview Helpers, handshakes and exports must survive compilation
 * intact - no regex comment stripping that corrupts strings containing '//'.
 */

import { describe, it, expect } from 'vitest';
import { parseJsonLike } from '../../src/core/parser.js';
import { compileMorph } from '../utils/compile-morph.js';

describe('helpers containing "//"', () => {
  it('should keep a helper whose string holds a URL', async () => {
    const { module } = await compileMorph(
      `<p>{{ x : link }}</p>
<script>function link() { return '<a href="https://example.com">docs</a>'; }</script>`,
      'UrlHelper'
    );

    expect(module.default('render', { x: 1 })).toBe(
      '<p><a href="https://example.com">docs</a></p>'
    );
  });

  it('should keep a helper with "//" inside a template literal', async () => {
    const { module } = await compileMorph(
      `<p>{{ path : link }}</p>
<script>
const link = ({ data }) => {
  return \`<a href="//cdn.example.com/\${data}">x</a>\`;
};
</script>`,
      'TemplateLiteralHelper'
    );

    expect(module.default('render', { path: 'a.js' })).toBe(
      '<p><a href="//cdn.example.com/a.js">x</a></p>'
    );
  });

  it('should keep a helper that contains real comments', async () => {
    const { module } = await compileMorph(
      `<p>{{ x : twice }}</p>
<script>
function twice({ data }) {
  // line comment
  return data + data; /* block comment */
}
</script>`,
      'CommentedHelper'
    );

    expect(module.default('render', { x: 'ab' })).toBe('<p>abab</p>');
  });
});

describe('parseJsonLike', () => {
  it('should parse strict JSON', () => {
    expect(parseJsonLike('{"a": 1}')).toEqual({ a: 1 });
  });

  it('should accept comments, single quotes and trailing commas', () => {
    const parsed = parseJsonLike(`{
      // line comment
      'title': 'It\\'s "quoted"', /* block */
      "url": 'https://example.com/a',
      "list": [1, 2,],
    }`);

    expect(parsed).toEqual({
      title: 'It\'s "quoted"',
      url: 'https://example.com/a',
      list: [1, 2],
    });
  });

  it('should keep "//" inside double-quoted strings', () => {
    expect(parseJsonLike(`{ "url": "https://example.com", // c
    }`)).toEqual({ url: 'https://example.com' });
  });
});

describe('compiled module exports', () => {
  it('should export the scoped class map as styles', async () => {
    const { module } = await compileMorph(
      `<div class="card">x</div><style>.card { color: red; }</style>`,
      'StylesExport',
      { hashMode: 'development' }
    );

    expect(module.styles.card).toMatch(/^StylesExport_card_/);
  });

  it('should export an empty styles map for a component without CSS', async () => {
    const { module } = await compileMorph('<p>{{ x }}</p>', 'NoStyles');

    expect(module.styles).toEqual({});
  });
});
