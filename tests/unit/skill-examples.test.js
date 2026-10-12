/**
 * Skill Examples Tests
 * @fileoverview Keeps the shipped agent skill (skills/vite-plugin-morph) true:
 * every `.morph` example in it is compiled, rendered and checked with the
 * skill's own check-morph.mjs, and the behaviour the skill states is asserted.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkMorph } from '../../skills/vite-plugin-morph/scripts/check-morph.mjs';
import { compileMorph } from '../utils/compile-morph.js';
import { configure } from '../../src/utils/logger.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const skillDir = path.join(repoRoot, 'skills/vite-plugin-morph');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-examples-'));

/**
 * Collect fenced html blocks whose first line is `<!-- Name.morph … -->`
 * (`<!-- ✗ Name.morph … -->` marks an example that must fail the check)
 */
function collectExamples() {
  const files = [
    path.join(skillDir, 'SKILL.md'),
    ...fs
      .readdirSync(path.join(skillDir, 'references'))
      .map((name) => path.join(skillDir, 'references', name)),
  ];
  const examples = [];
  for (const file of files) {
    const markdown = fs.readFileSync(file, 'utf8');
    for (const [, body] of markdown.matchAll(/```html\n([\s\S]*?)```/g)) {
      const header = body.match(/^<!-- (✗ )?(\w+)\.morph\b/);
      if (header) {
        examples.push({
          doc: path.relative(skillDir, file),
          name: header[2],
          wrong: Boolean(header[1]),
          source: body,
        });
      }
    }
  }
  return examples;
}

const examples = collectExamples();
const byName = Object.fromEntries(examples.map((example) => [example.name, example]));

async function check(name) {
  const file = path.join(outDir, `${name}.morph`);
  fs.writeFileSync(file, byName[name].source);
  return checkMorph(file);
}

beforeAll(() => {
  // checkMorph raises the shared logger level; keep test output quiet
  return () => configure({ level: 'info' });
});

describe('skill examples', () => {
  it('should find the examples', () => {
    expect(examples.filter((example) => !example.wrong).length).toBeGreaterThanOrEqual(5);
    expect(examples.filter((example) => example.wrong).length).toBeGreaterThanOrEqual(5);
  });

  for (const example of examples.filter((item) => !item.wrong)) {
    it(`${example.name} (${example.doc}) passes check-morph`, async () => {
      const report = await check(example.name);

      expect(report.errors).toEqual([]);
      expect(report.warnings).toEqual([]);
      expect(report.html).not.toContain('{{');
    });
  }

  for (const example of examples.filter((item) => item.wrong)) {
    it(`✗ ${example.name} (${example.doc}) is reported by check-morph`, async () => {
      const report = await check(example.name);

      expect(report.errors.length).toBeGreaterThan(0);
    });
  }
});

describe('claims stated in the skill', () => {
  it('render needs a command; "view" is an error string', async () => {
    const { module } = await compileMorph('<p>{{ name }}</p>', 'Command');

    expect(module.default('view', { name: 'x' })).toMatch(/^Error: Wrong command "view"/);
    expect(module.default('render', { name: 'x' })).toBe('<p>x</p>');
  });

  it('a missing or null value leaves the raw placeholder', async () => {
    const { module } = await compileMorph('<p>{{ name }}</p>', 'Missing');

    expect(module.default('render', {})).toBe('<p>{{ name }}</p>');
    expect(module.default('render', { name: null })).toBe('<p>{{ name }}</p>');
  });

  it('a helper receives the placeholder value, the context keys and styles', async () => {
    const { module } = await compileMorph(
      `<p>{{ name : keys }}</p>
<script>function keys(context) { return typeof context.data + ':' + Object.keys(context).sort().join(','); }</script>`,
      'Context'
    );

    expect(module.default('render', { name: 'ada' })).toBe(
      '<p>string:data,dependencies,full,memory,styles,useHelper</p>'
    );
  });

  it('action chains run right to left', async () => {
    const { module } = await compileMorph(
      `<p>{{ x : a, b }}</p>
<script>
function a({ data }) { return 'a(' + data + ')'; }
function b({ data }) { return 'b(' + data + ')'; }
</script>`,
      'Chain'
    );

    expect(module.default('render', { x: 'x' })).toBe('<p>a(b(x))</p>');
  });

  it('escape last in a chain encodes then escapes', async () => {
    const { module } = await compileMorph(
      `<a href="/go?next={{ next : escape, >urlEncode }}">go</a>
<script>function urlEncode({ data }) { return encodeURIComponent(data); }</script>`,
      'EscapeChain'
    );

    expect(module.default('render', { next: '/a b' })).toBe('<a href="/go?next=%2Fa%20b">go</a>');
  });

  it('{{ items : [] : itemTpl }} never applies itemTpl', async () => {
    const { module } = await compileMorph(byName.WrongListSyntax.source, 'ListSyntax');

    expect(module.default('render', { items: ['a', 'b'] })).not.toContain('<li>');
  });

  it('raw is not available in .morph files', async () => {
    const { module } = await compileMorph('<p>{{ html : raw }}</p>', 'Raw');

    expect(module.default('render', { html: '<i>x</i>' })).toContain(
      "Helper 'raw' is not available"
    );
  });

  it('a template-literal arrow is a string helper and drops ${}', async () => {
    const { module } = await compileMorph(
      `<p>{{ x : arrow }}</p>
<script>const arrow = ({ data }) => \`<b>\${data}</b>\`;</script>`,
      'ArrowTemplate'
    );

    expect(module.default('render', { x: 'v' })).toBe('<p><b></b></p>');
  });

  it('static classes render scoped + light label; placeholder classes stay raw', async () => {
    const { module } = await compileMorph(
      `<div class="card {{ variant }}">x</div>
<style>.card { color: red; } .elevated { color: blue; }</style>`,
      'Classes',
      { hashMode: 'development' }
    );

    expect(module.default('render', { variant: 'elevated' })).toBe(
      `<div class="${module.styles.card} card elevated">x</div>`
    );
  });

  it('component CSS is wrapped in @layer modules', async () => {
    const { module } = await compileMorph(
      '<p class="a">x</p><style>.a { color: red; }</style>',
      'Layered'
    );

    expect(module.css).toMatch(/^@layer modules \{/);
  });

  it('a stripped handshake exports {} and demo renders report it', async () => {
    const { module } = await compileMorph(
      '<p>{{ t }}</p><script type="application/json">{ "t": "x" }</script>',
      'Stripped',
      { production: { removeHandshake: true } }
    );

    expect(module.handshake).toEqual({});
    expect(module.default('render', 'demo')).toBe('Error: No handshake data.');
  });
});
