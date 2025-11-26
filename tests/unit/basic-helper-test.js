/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processScriptContent } from '../../src/core/script.js';

describe('Helper Template Basic Support', () => {
  it('should recognize simple helper templates', () => {
    const scriptContent = `
      const option = \`<option value="{{id}}">{{name}}</option>\`
    `;

    const result = processScriptContent(scriptContent);

    expect(result.templates).toBeDefined();
    expect(result.templates.option).toBe(
      '<option value="{{id}}">{{name}}</option>'
    );
  });

  it('should recognize multi-line helper templates', () => {
    const scriptContent = `
      const card = \`
        <div class="card">
          <h3>{{title}}</h3>
          <p>{{content}}</p>
        </div>
      \`
    `;

    const result = processScriptContent(scriptContent);

    expect(result.templates).toBeDefined();
    expect(result.templates.card).toContain('<div class="card">');
    expect(result.templates.card).toContain('<h3>{{title}}</h3>');
    expect(result.templates.card).toContain('<p>{{content}}</p>');
  });
});
