/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processScriptContent } from '../../src/core/script.js';

describe('Helper Template Support', () => {
  describe('Template Helper Detection', () => {
    it('should detect const template declarations', () => {
      const scriptContent = `
                  const span = \`<span class="highlight">{{text}}</span>\`;
                  const button = \`<button>{{label}}</button>\`;
                `;

      const result = processScriptContent(scriptContent);

      expect(result.functions).toEqual({});
      expect(result.templates).toEqual({
        span: '<span class="highlight">{{text}}</span>',
        button: '<button>{{label}}</button>',
      });

      // Test that templates are correctly extracted
      expect(Object.keys(result.templates)).toEqual(['span', 'button']);
      expect(result.templates.span).toBe(
        '<span class="highlight">{{text}}</span>'
      );
      expect(result.templates.button).toBe('<button>{{label}}</button>');
    }); // it

    it('should handle both function and template declarations together', () => {
      const scriptContent = `
                  function formatTitle(title) {
                    return title.toUpperCase();
                  }
                  
                  const header = \`<h1>{{title}}</h1>\`;
                `;

      const result = processScriptContent(scriptContent);

      expect(result.functions).toHaveProperty('formatTitle');
      expect(result.functions.formatTitle).toBeInstanceOf(Function);
      expect(result.templates).toHaveProperty('header');
      expect(result.templates.header).toBe('<h1>{{title}}</h1>');
    }); // it

    it('should extract template content with placeholders', () => {
      const scriptContent = `
                  const card = \`<div class="card">{{title}}{{content}}</div>\`;
                `;

      const result = processScriptContent(scriptContent);

      expect(result.templates).toEqual({
        card: '<div class="card">{{title}}{{content}}</div>',
      });
    }); // it

    it('should handle empty template declarations', () => {
      const scriptContent = `
                  const empty = \`\`;
                `;

      const result = processScriptContent(scriptContent);

      expect(result.templates).toEqual({
        empty: '',
      });
    }); // it

    it('should handle malformed template declarations', () => {
      const scriptContent = `
                    const invalid = \`<span>{{text}}\`;
                  `;

      const result = processScriptContent(scriptContent);

      expect(result.templates).toEqual({});
    }); // it
  }); // describe

  describe('String Helper Integration', () => {
    it('should process string helpers correctly in morph files', async () => {
      const { processMorphFile } = await import('../../src/core/processor.js');
      const fs = await import('fs/promises');

      // Read the test fixture
      const content = await fs.readFile(
        '/Users/peternaydenov/Open-source/git-morph-plugin/tests/fixtures/string-helper.morph',
        'utf-8'
      );

      const result = await processMorphFile(content, 'string-helper.morph', {});

      // Check that the template object contains the helper
      expect(result.templateObject).toBeDefined();
      expect(result.templateObject.helpers).toBeDefined();
      expect(result.templateObject.helpers.option).toBe(
        '<option value="{{projectID}}">{{name}}</option>'
      );
    });

    it('should include string helpers in generated code', async () => {
      const { processMorphFile } = await import('../../src/core/processor.js');
      const fs = await import('fs/promises');

      // Read the test fixture
      const content = await fs.readFile(
        '/Users/peternaydenov/Open-source/git-morph-plugin/tests/fixtures/string-helper.morph',
        'utf-8'
      );

      const result = await processMorphFile(content, 'string-helper.morph', {});

      // Check that the generated code includes the helper
      expect(result.code).toContain('template.helpers.option');
      expect(result.code).toContain(
        '<option value="{{projectID}}">{{name}}</option>'
      );
    });
  }); // describe
}); // describe
