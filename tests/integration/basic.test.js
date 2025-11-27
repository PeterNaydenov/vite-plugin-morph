/**
 * Basic integration test for morph plugin
 * @fileoverview Tests the complete morph processing pipeline
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { clearCache } from '../../src/utils/cache.js';

describe('Basic Morph Processing Integration', () => {
  const testOutputDir = resolve(__dirname, '../test-output');

  beforeEach(() => {
    // Clear morph cache to prevent interference between tests
    clearCache();

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
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');
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
    const result = await transformHook(inputContent, 'template-only.morph', {});

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');
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

  it('should parse and register helper functions from script tags', async () => {
    const morphContent = `<p class="space">
    <button id="fullscreen" title="here" data-click="fullscreen">Full Screen</button>
</p>
{{ notifications : showNotify }}
{{ : showProfile }}
<h2>Projects</h2>
<p class="space">Projects you own or have access to.</p>
{{ projects : showService }}
<script>
const blank = () => \`\`
const showProfile = ({ data, dependencies:{ cards } }) => cards.profile ( 'render', {...data.profile, icons:data.icons}, cards )
function showService ({ data, dependencies, full }) {
    const { cards } = dependencies;
    if ( typeof data !== 'object' ) {
        console.error ( \`Error: Expected 'Service' data to be an object\` )
        return \`\`
    }
    return cards.service ( 'render', data, { ...dependencies, icons:full.icons} )
}
function showNotify ({ data, dependencies:{ cards } }) {
    return cards.notify ( 'render', data, cards )
}
</script>
<script type="application/json"> {
    "t": "test",
    "notifications": [],
    "projects": [
        {
            "name": "Test Project",
            "started": "2024-01-01",
            "description": "Test description",
            "type": "Test Type",
            "access": "Owner",
            "service": "test/service",
            "tokens": 100
        }
    ]
} </script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'projects.morph');

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();

    // Verify that helpers are included in the generated code
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain('template.helpers.showProfile');
    expect(result.code).toContain('template.helpers.showService');
    expect(result.code).toContain('template.helpers.showNotify');
    expect(result.code).toContain('template.helpers.blank');
    expect(result.code).toContain(
      'const renderFunction = morph.build(template);'
    );
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');
  });

  it('should warn when template uses undefined helper', async () => {
    const morphContent = `<div>{{ data : missingHelper }}</div>
<script>
function existingHelper(data) { return data; }
</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'missing-helper.morph');

    // Should succeed but generate code with available helpers
    expect(result).toBeDefined();
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');
    expect(result.code).toContain(
      'template.helpers.existingHelper = function existingHelper'
    );

    // Should not contain helper assignments for the missing helper
    expect(result.code).not.toContain('template.helpers.missingHelper');
  });

  it('should export correct JSON handshake data', async () => {
    const morphContent = `<div>{{ title }}</div>
<script type="application/json">{
  "title": "Test Title",
  "data": {
    "nested": true,
    "array": [1, 2, 3]
  }
}</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'json-test.morph');

    expect(result).toBeDefined();
    expect(result.code).toContain('export const handshake =');

    // Extract and parse the handshake data from the generated code
    const handshakeMatch = result.code.match(
      /export const handshake = ({[\s\S]*?});/
    );
    expect(handshakeMatch).toBeTruthy();

    const handshakeData = JSON.parse(handshakeMatch[1]);
    expect(handshakeData).toEqual({
      title: 'Test Title',
      data: {
        nested: true,
        array: [1, 2, 3],
      },
    });
  });

  it('should generate correct JSON template object', async () => {
    const morphContent = `<div>{{ title }}</div>
<script>
function formatTitle(title) {
  return title.toUpperCase();
}
</script>
<script type="application/json">{
  "title": "Test Title"
}</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'template-test.morph', {
      development: { sourceMaps: true },
    });

    expect(result).toBeDefined();
    expect(result.code).toContain('const template = {');

    // Extract the template object JSON
    const templateMatch = result.code.match(
      /const template = (\{[\s\S]*?\n\});\s*\n/
    );
    expect(templateMatch).toBeTruthy();

    const templateJson = templateMatch[1];
    const templateData = JSON.parse(templateJson);

    // Verify template structure
    expect(templateData).toHaveProperty('template');
    expect(templateData).toHaveProperty('helpers');
    expect(templateData).toHaveProperty('handshake');

    // Check template HTML
    expect(templateData.template).toContain('<div>{{ title }}</div>');

    // Check helpers object structure (should be empty initially, helpers added later)
    expect(templateData.helpers).toEqual({});

    // Check handshake data
    expect(templateData.handshake).toEqual({ title: 'Test Title' });

    // Verify helpers are added to the template object
    expect(result.code).toContain(
      'template.helpers.formatTitle = function formatTitle(title) {'
    );
    expect(result.code).toContain('return title.toUpperCase();');
  });

  it('should support named import of template object', async () => {
    const morphContent = `<div>{{ message }}</div>
<script type="application/json">{
  "message": "Hello World"
}</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(
      morphContent,
      'named-import-test.morph',
      {
        development: { sourceMaps: true },
      }
    );

    expect(result).toBeDefined();
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');

    // Verify the template object can be imported as named export
    // This would allow: import { template } from './component.morph'
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain('<div>{{ message }}</div>');
    expect(result.code).toContain('"handshake": {');
    expect(result.code).toContain('"message": "Hello World"');
  });

  it('should handle dynamic imports correctly', async () => {
    const morphContent = `<div>{{ title }}</div>
<script type="application/json">{
  "title": "Dynamic"
}</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'dynamic-test.morph');

    // Verify the generated code supports both static and dynamic imports
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');

    // The module should be importable in different ways
    expect(result.code).toMatch(/export default/);
    expect(result.code).toMatch(/export \{ template \}/);
  });

  it('should validate complex morph module with advanced placeholders', async () => {
    const morphContent = `{{ @all : blank, ^^, >setupData }}
<h2>Contacts</h2>
<p class="space">Storage for your relation's profiles.
    <button data-click="nav-contacts-edit">Create a new contact</button>
    </p>

<!-- TODO: some tag filtering + string search -->

{{ contacts : [], #, [], contactCards, #, [], tags  }}

<script>
const blank = () => ''
const contactCards = \`
                    <div class="contact">
                                    <h3>{{ name }}</h3>
                                    <p><strong>ID Token</strong>:
                                         <textarea readonly>{{ id-contact }}</textarea>
                                    </p>
                                    <p><strong>Tags</strong>:
                                                   {{ tags }}
                                    </p>

                                    <p>
                                            <button class="action" data-click="nav-contacts-edit" data-number="{{number}}">Edit</button>
                                            <button class="action">Copy ID Token</button>
                                            <button class="action warn" data-click="delete-contact" data-number="{{number}}">Delete</button>
                                    </p>
                            </div>
                    \`
const tags = \`<span>{{text}}</span>\`

function setupData ({ data }) {
            data.contacts.map ( (c,i) => {
                            c.number = i
                            if ( c.tags.length === 0 ) c.tags = 'No tags selected'
                            return c
                    })
            return data
    } // setupData func.
</script>



<script type="application/json"> {
"contacts": [
            {
                    "name": "Ivan Ivanov",
                "id-contact": "3mwes!534-12-2fe-!2d1w",
                "tags": [ "project1", "man", "brazil" ]
            },
            {
                    "name": "Stoyan Lazov",
                "id-contact": "3mpes!534-14-4fm-!1214",
                "tags": [ "Paris", "man", "french" ]
            }
        ]
} </script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'complex-contacts.morph', {
      development: { sourceMaps: true },
    });
  });

  it('should correctly extract helpers with action prefixes', async () => {
    const morphContent = `{{ : li }}
{{ : >setup}}
{{ friends : []coma }}
{{ list : ul, [], li, a}}

<script>
function li(data) { return \`<li>\${data}</li>\`; }
function setup(data) { return data; }
function coma(data) { return data.join(', '); }
function ul(data) { return \`<ul>\${data}</ul>\`; }
function a(data) { return \`<a href="#">\${data}</a>\`; }
</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(morphContent, 'prefix-test.morph');

    expect(result).toBeDefined();
    expect(result.code).toContain('export default renderFunction;');

    // Verify all prefixed helpers are extracted correctly
    expect(result.code).toContain('template.helpers.li = function li');
    expect(result.code).toContain('template.helpers.setup = function setup');
    expect(result.code).toContain('template.helpers.coma = function coma');
    expect(result.code).toContain('template.helpers.ul = function ul');
    expect(result.code).toContain('template.helpers.a = function a');

    // Verify template contains the prefixed placeholders
    expect(result.code).toContain('{{ : li }}');
    expect(result.code).toContain('{{ : >setup}}');
    expect(result.code).toContain('{{ friends : []coma }}');
    expect(result.code).toContain('{{ list : ul, [], li, a}}');
  });

  it('should extract complex helpers with arrow functions and templates', async () => {
    const morphContent = `{{ @all : blank, ^^, >setupData }}
<h2>Contacts</h2>
{{ contacts : [], #, [], contactCards, #, [], tags }}

<script>
const blank = () => ''
const contactCards = \`
<div class="contact">
  <h3>{{ name }}</h3>
  <p>{{ id-contact }}</p>
</div>
\`
const tags = \`<span>{{text}}</span>\`

function setupData ({ data }) {
  data.contacts = data.contacts || [];
  return data;
}
</script>

<script type="application/json">{
  "contacts": [{"name": "Test", "id-contact": "123"}]
}</script>`;

    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(
      morphContent,
      'complex-helpers-test.morph',
      {
        development: { sourceMaps: true },
      }
    );

    expect(result).toBeDefined();
    expect(result.code).toContain('export default renderFunction;');

    // Verify arrow function helper
    expect(result.code).toContain("template.helpers.blank = () => '';");

    // Verify template literal helpers
    expect(result.code).toContain('template.helpers.contactCards = `');
    expect(result.code).toContain('<div class="contact">');
    expect(result.code).toContain(
      'template.helpers.tags = `<span>{{text}}</span>`;'
    );

    // Verify function declaration helper
    expect(result.code).toContain(
      'template.helpers.setupData = function setupData'
    );

    // Verify JSON data
    expect(result.code).toContain('"contacts":');
    expect(result.code).toContain('"name": "Test"');
  });
});
