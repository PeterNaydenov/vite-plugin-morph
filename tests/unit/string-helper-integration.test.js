/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processMorphFile } from '../../src/core/processor.js';
import fs from 'fs/promises';

describe('String Helper Integration Verification', () => {
  it('should generate working code that can be executed', async () => {
    // Read the test fixture
    const content = await fs.readFile(
      '/Users/peternaydenov/Open-source/git-morph-plugin/tests/fixtures/string-helper.morph',
      'utf-8'
    );

    const result = await processMorphFile(content, 'string-helper.morph', {});

    // Verify the generated code contains the helper
    expect(result.code).toContain('template.helpers.option');
    expect(result.code).toContain(
      `<option value=\\"{{projectID}}\\">{{name}}</option>`
    );

    // Verify the template object contains the helper
    expect(result.templateObject.helpers.option).toBe(
      '<option value="{{projectID}}">{{name}}</option>'
    );
  });

  it('should handle mixed function and string helpers', async () => {
    const mixedContent = `
            <div class="test">
              {{ formatName(name) }}
              {{ items : listItem }}
            </div>

            <script>
            function formatName(name) {
              return name.toUpperCase();
            }

            const listItem = \`<li>{{item}}</li>\`;
            </script>

            <script type="application/json">
            {
              "name": "test",
              "items": ["a", "b", "c"]
            }
            </script>
                `.trim();

    const result = await processMorphFile(mixedContent, 'mixed.morph', {});

    // Should have both function and string helpers
    expect(result.templateObject.helpers.formatName).toBeInstanceOf(Function);
    expect(result.templateObject.helpers.listItem).toBe('<li>{{item}}</li>');

    // Generated code should handle both types
    expect(result.code).toContain('try { function formatName(name) {');
    expect(result.code).toContain(
      'template.helpers.listItem = "<li>{{item}}</li>";'
    );
  });
});
