/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processMorphFile } from '../../src/core/processor.js';

describe('Original Template Test', () => {
  it('should process the original failing template correctly', async () => {
    const originalTemplate = `<div class="popblock">
            <h2>Create new token - step 1</h2>
            <p>Select the project you want to make a token for:</p>
            <p class="space">
                <select name="project" id="project">
                        <option value="">Select project</option>
                        {{ projects : option }}
                    </select>
            </p>
            <p><button class="action hide" data-click="next">Continue</button></p>
    </div>

<script>
const option = \`<option value="{{projectID}}">{{name}}</option>\`
</script>

<script type="application/json"> {
"projects": [
        {
            "name": "Ah 1",
            "projectID": "124-2d1w-3mwe-5341"
        },
        {
                "name": "Ah 2",
            "projectID": "144-2d1w-3mwe-1250",
            "selected": true
        },
        {
                "name": "Ah 3",
            "projectID": "663-2d1w-3mwe-5399"
        }
    ],
"selection": "124-2d1w-3mwe-5341"
} </script>`;

    const result = await processMorphFile(
      originalTemplate,
      'original.morph',
      {}
    );

    // Verify the helper is correctly processed
    expect(result.templateObject.helpers).toBeDefined();
    expect(result.templateObject.helpers.option).toBe(
      '<option value="{{projectID}}">{{name}}</option>'
    );

    // Verify the generated code contains the helper
    expect(result.code).toContain('template.helpers.option');
    expect(result.code).toContain(
      '`<option value="{{projectID}}">{{name}}</option>`'
    );

    // Verify the template contains the helper usage
    expect(result.templateObject.template).toContain('{{ projects : option }}');
  });
});
