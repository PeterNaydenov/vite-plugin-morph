/**
 * Test for morph library integration
 * @fileoverview Tests that generated code includes proper morph utilities
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearCache } from '../../src/utils/cache.js';

describe('Morph Library Integration', () => {
  beforeEach(() => {
    // Clear morph cache to prevent interference between tests
    clearCache();
  });

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

    // Check that template object and render function are generated
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain(
      'const renderFunction = morph.build(template, false, buildDependencies);'
    );
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');
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

    // Should generate template object and morph.build call
    expect(result.code).toContain("import morph from '@peter.naydenov/morph'");
    expect(result.code).toContain('const template = {');
    expect(result.code).toContain('"template":');
    expect(result.code).toContain(
      'const renderFunction = morph.build(template, false, buildDependencies);'
    );
    expect(result.code).toContain('export default renderFunction;');
    expect(result.code).toContain('export { template };');
  }); // it

  it('should not include morph utilities in CSS-only files', async () => {
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

    // CSS-only files should NOT include morph utilities or template structure
    expect(result.code).not.toContain(
      "import morph from '@peter.naydenov/morph'"
    );
    expect(result.code).not.toContain('const template = {');
    expect(result.code).not.toContain('"template":');
    expect(result.code).not.toContain(
      'const renderFunction = morph.build(template, false, buildDependencies);'
    );
    expect(result.code).not.toContain('export default renderFunction;');
    expect(result.code).not.toContain('export { template };');

    // Should only export CSS styles
    expect(result.code).toContain('// Export CSS styles');
    expect(result.code).toContain('export const styles =');
    expect(result.code).toContain('.btn { background: blue; }');
    // CSS-only files export as 'styles', not 'css'
    expect(result.code).not.toContain('export const css =');
  }); // it
});
