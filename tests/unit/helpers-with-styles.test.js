/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processMorphFile } from '../../src/core/processor.js';
import morph from '@peter.naydenov/morph';

describe ( 'Helpers with Styles Integration', () => {


    it ( 'Inject styles into helper props', async () => {
        const content = /*html*/`
      <div class="{{ variant : getClass }}">Content</div>
      <script>
      function getClass({ data, styles }) {
        if (data === 'big') return styles.big;
        if (data === 'small') return styles.small;
        return '';
      }
      </script>
      <style>
        .big { color: red; }
        .small { color: blue; }
      </style>
      `;


        const result = await processMorphFile(content, 'test-component.morph', {});

        // Mock module system for evaluation
        const mockMorph = morph;
        const exports = {};

        let evalCode = result.code
            .replace("import morph from '@peter.naydenov/morph';", "const morph = mockMorph;")
            .replace("export default renderFunction;", "exports.default = renderFunction;")
            .replace("export { template };", "exports.template = template;")
            .replace(/export \{ (\w+) \};/g, "exports.$1 = $1;")
            .replace(/export const (\w+) =/g, "exports.$1 =")
            // Remove HMR code for test compatibility
            .replace(/\/\/ HMR handling[\s\S]*$/g, '');

        const executionFunction = new Function('mockMorph', 'exports', evalCode);

        executionFunction(mockMorph, exports);

        const renderFunc = exports.default;

        expect(renderFunc).toBeDefined();

        // Test 1: Variant 'big'
        // Morph build returns a function that expects a command as first arg
        const resultBig = renderFunc('render', { variant: 'big' });

        const classNameRegex = /class="([^"]+)"/;
        const matchBig = resultBig.match(classNameRegex);

        if (!matchBig) {
            console.log('Result Big:', resultBig);
        }

        expect(matchBig).toBeTruthy();
        const classNameBig = matchBig[1];

        expect(classNameBig).toContain('test-component_big_');

        // Test 2: Variant 'small'
        const resultSmall = renderFunc('render', { variant: 'small' });
        const matchSmall = resultSmall.match(classNameRegex);
        expect(matchSmall).toBeTruthy();
        const classNameSmall = matchSmall[1];

        expect(classNameSmall).toContain('test-component_small_');

        // Ensure they are different
        expect(classNameBig).not.toBe(classNameSmall);
    });



    it ( 'should provide empty styles object if no css defined', async () => {
        const content = /*html*/`
      <div class="{{ variant : getClass }}">Content</div>
      <script>
            function getClass({ data, styles }) {
                          // styles should be present but empty or at least defined object
                          if (styles && typeof styles === 'object') return 'ok';
                          return 'error-no-styles';
                        }
      </script>
      `;

        const result = await processMorphFile(content, 'no-style.morph', {});

        const mockMorph = morph;
        const exports = {};

        let evalCode = result.code
            .replace("import morph from '@peter.naydenov/morph';", "const morph = mockMorph;")
            .replace("export default renderFunction;", "exports.default = renderFunction;")
            .replace("export { template };", "exports.template = template;")
            .replace(/export \{ (\w+) \};/g, "exports.$1 = $1;")
            .replace(/export const (\w+) =/g, "exports.$1 =");

        const executionFunction = new Function('mockMorph', 'exports', evalCode);
        executionFunction(mockMorph, exports);

        const render = exports.default;
        const output = render('render', { variant: 'whatever' });

        expect(output).toContain('class="ok"');
    });
});
