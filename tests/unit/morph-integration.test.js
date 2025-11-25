/**
 * Test for morph library integration
 * @fileoverview Tests that generated code includes proper morph utilities
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';

describe('Morph Library Integration', () => {
  it('should include morph utilities in generated code', async () => {
    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(
      `
              <div>{{title}}</div>
              <script>
                function formatTitle ( {data:title}) {
                            return title.toUpperCase ()
                    }
              </script>
            `,
      'test.morph'
    );

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();

    // Check that the render function is generated with context preservation
    expect(result.code).toContain('formatTitle');
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const morphRenderFunction');
    expect(result.code).toContain('reconstructedHelpers');
    expect(result.code).toContain(
      'Inline context variables from _readTemplate'
    );
    expect(result.code).toContain('const chop = originalChop;');
    expect(result.code).toContain('const helpers = reconstructedHelpers;');
    expect(result.code).toContain(
      "export default function(command = 'render', data = {}, dependencies = {}, ...args)"
    );
    expect(result.code).toContain(
      'return morphRenderFunction(command, data, dependencies)'
    );
  }); // it

  it('should handle template-only files without placeholders', async () => {
    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(
      `
                                      <div class="static-content">
                                        <h1>Static Title</h1>
                                        <p>This is static content</p>
                                      </div>
                                    `,
      'template-only.morph'
    );

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();

    // Should generate render function with context preservation
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const morphRenderFunction');
    expect(result.code).toContain(
      "export default function(command = 'render', data = {}, dependencies = {}, ...args)"
    );
    expect(result.code).toContain(
      'return morphRenderFunction(command, data, dependencies)'
    );
  }); // it

  it('should include morph utilities in CSS-only files', async () => {
    const { transformHook } = await import('../../src/plugin/hooks.js');
    const result = await transformHook(
      `
              <style>
                .btn { background: blue; }
              </style>
            `,
      'css-only.morph'
    );

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();

    // CSS-only files should not include morph utilities
    expect(result.code).not.toContain(
      "import { get } from '@peter.naydenov/morph'"
    );
    expect(result.code).toContain('export const styles');
  }); // it
});
