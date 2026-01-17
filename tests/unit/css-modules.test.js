/**
 * CSS Modules Transformation Tests
 * Tests for auto-transforming class names in templates with content-based hashing
 */

import { describe, it, expect } from 'vitest';
import { scopeCss, transformHtmlClasses } from '../../src/core/css-scoper.js';

describe('CSS Modules - Content-Based Hashing', () => {
  describe('scopeCss - Content-based hashing', () => {
    it('should generate consistent hash for same CSS content', () => {
      const result1 = scopeCss('.btn { background: blue; }', 'Button', {
        hashMode: 'production',
      });
      const result2 = scopeCss('.btn { background: blue; }', 'Button', {
        hashMode: 'production',
      });

      expect(result1.scopedClasses.btn).toBe(result2.scopedClasses.btn);
    });

    it('should generate different hash for different CSS content', () => {
      const result1 = scopeCss('.btn { background: blue; }', 'Button', {
        hashMode: 'production',
      });
      const result2 = scopeCss('.btn { background: red; }', 'Button', {
        hashMode: 'production',
      });

      expect(result1.scopedClasses.btn).not.toBe(result2.scopedClasses.btn);
    });

    it('should scope multiple classes', () => {
      const result = scopeCss(
        '.btn { background: blue; } .primary { font-weight: bold; }',
        'Button',
        { hashMode: 'production' }
      );

      expect(result.scopedClasses.btn).toMatch(/Button_btn_[a-z0-9]{5}/);
      expect(result.scopedClasses.primary).toMatch(
        /Button_primary_[a-z0-9]{5}/
      );
    });

    it('should transform CSS selectors to scoped names', () => {
      const result = scopeCss('.btn { background: blue; }', 'Button', {
        hashMode: 'production',
      });

      expect(result.scopedCss).toContain('.Button_btn_');
      expect(result.scopedCss).not.toContain('.btn ');
    });

    it('should handle CSS with multiple rules', () => {
      const css = `
        .container { max-width: 1200px; }
        .btn { padding: 10px 20px; }
        .card { border: 1px solid #ccc; }
      `;

      const result = scopeCss(css, 'MyComponent', { hashMode: 'production' });

      expect(result.classNames).toContain('container');
      expect(result.classNames).toContain('btn');
      expect(result.classNames).toContain('card');
      expect(result.scopedClasses.container).toMatch(/MyComponent_container_/);
      expect(result.scopedClasses.btn).toMatch(/MyComponent_btn_/);
      expect(result.scopedClasses.card).toMatch(/MyComponent_card_/);
    });
  });

  describe('transformHtmlClasses - Template transformation', () => {
    it('should transform class names in HTML', () => {
      const scopedClasses = { btn: 'Button_btn_abc12' };
      const html = '<div class="btn">Click</div>';

      const result = transformHtmlClasses(html, scopedClasses);

      expect(result.html).toBe('<div class="Button_btn_abc12">Click</div>');
    });

    it('should handle multiple classes', () => {
      const scopedClasses = {
        btn: 'Button_btn_abc12',
        primary: 'Button_primary_xyz34',
      };
      const html = '<button class="btn primary">Submit</button>';

      const result = transformHtmlClasses(html, scopedClasses);

      expect(result.html).toBe(
        '<button class="Button_btn_abc12 Button_primary_xyz34">Submit</button>'
      );
    });

    it('should keep classes not in scopedClasses unchanged', () => {
      const scopedClasses = { btn: 'Button_btn_abc12' };
      const html = '<div class="btn framework-class">Content</div>';

      const result = transformHtmlClasses(html, scopedClasses);

      expect(result.html).toBe(
        '<div class="Button_btn_abc12 framework-class">Content</div>'
      );
    });

    it('should handle single quotes', () => {
      const scopedClasses = { btn: 'Button_btn_abc12' };
      const html = "<div class='btn'>Click</div>";

      const result = transformHtmlClasses(html, scopedClasses);

      expect(result.html).toBe("<div class='Button_btn_abc12'>Click</div>");
    });

    it('should handle no class attribute', () => {
      const scopedClasses = { btn: 'Button_btn_abc12' };
      const html = '<div>No class</div>';

      const result = transformHtmlClasses(html, scopedClasses);

      expect(result.html).toBe('<div>No class</div>');
    });

    it('should handle empty scopedClasses', () => {
      const html = '<div class="btn">Click</div>';

      const result = transformHtmlClasses(html, {});

      expect(result.html).toBe('<div class="btn">Click</div>');
      expect(result.componentsCSS).toEqual({});
    });
  });

  describe('End-to-end transformation', () => {
    it('should transform morph file with CSS', async () => {
      const { processMorphFile } = await import('../../src/core/processor.js');

      const content = `
<template>
  <div class="btn primary">Click</div>
</template>
<style>
.btn { background: blue; }
.primary { font-weight: bold; }
</style>
`;

      const result = await processMorphFile(content, 'Button.morph', {});

      // Template should have scoped class names
      expect(result.templateObject.template).toContain('Button_btn_');
      expect(result.templateObject.template).toContain('Button_primary_');

      // Original class names should not appear in template
      expect(result.templateObject.template).not.toMatch(/class="btn /);
      expect(result.templateObject.template).not.toMatch(/class="primary"/);

      // CSS export should have scoped selectors
      expect(result.code).toContain('.Button_btn_');
      expect(result.code).toContain('.Button_primary_');
    });

    it('should keep global classes unchanged', async () => {
      const { processMorphFile } = await import('../../src/core/processor.js');

      const content = `
<template>
  <div class="btn bootstrap-btn">Click</div>
</template>
<style>
.btn { background: blue; }
</style>
`;

      const result = await processMorphFile(content, 'Button.morph', {});

      // Template should have scoped btn but unchanged bootstrap-btn
      expect(result.templateObject.template).toContain('Button_btn_');
      expect(result.templateObject.template).toContain('bootstrap-btn');
    });

    it('should generate different hashes for different CSS content', async () => {
      const { processMorphFile } = await import('../../src/core/processor.js');

      const content1 = `
<template>
  <div class="btn">Blue</div>
</template>
<style>
.btn { background: blue; }
</style>
`;

      const content2 = `
<template>
  <div class="btn">Red</div>
</template>
<style>
.btn { background: red; }
</style>
`;

      const result1 = await processMorphFile(content1, 'Button.morph', {
        hashMode: 'production',
      });
      const result2 = await processMorphFile(content2, 'Button.morph', {
        hashMode: 'production',
      });

      // In production mode, different CSS content should produce different hashes
      // Extract the scoped class name from template
      const match1 = result1.templateObject.template.match(
        /Button_btn_([a-z0-9]+)/
      );
      const match2 = result2.templateObject.template.match(
        /Button_btn_([a-z0-9]+)/
      );

      expect(match1[1]).not.toBe(match2[1]);
    });
  });
});
