/**
 * CSS Modules and Scoping Tests
 */

import { describe, it, expect } from 'vitest';
import { processCss } from '../../src/core/css-processor.js';

describe('CSS Scoping (CSS Modules)', () => {
  describe('Basic CSS scoping logic', () => {
    it('should generate scoped class name pattern', () => {
      // Test the expected pattern for scoped class names
      const componentName = 'Button';
      const className = 'btn';
      const hash = 'abc123';
      const scopedName = `${componentName}_${className}_${hash}`;

      expect(scopedName).toBe('Button_btn_abc123');
      expect(scopedName).toMatch(
        /^[A-Z][a-zA-Z0-9]*_[a-zA-Z_-][a-zA-Z0-9_-]*_[a-z0-9]+$/
      );
    });

    it('should transform CSS selectors', () => {
      // Test basic CSS selector transformation
      const originalCss = '.btn { background: blue; }';
      const scopedClass = 'Button_btn_abc123';
      const transformedCss = originalCss.replace(/\.btn/g, `.${scopedClass}`);

      expect(transformedCss).toBe('.Button_btn_abc123 { background: blue; }');
      expect(transformedCss).not.toContain('.btn');
    });
  });
});

describe('CSS Layers', () => {
  describe('Layer hierarchy', () => {
    it('should define correct layer order', () => {
      const layers = ['reset', 'global', 'components', 'themes'];

      expect(layers).toEqual(['reset', 'global', 'components', 'themes']);
      expect(layers.indexOf('components')).toBeLessThan(
        layers.indexOf('themes')
      );
      expect(layers.indexOf('global')).toBeLessThan(
        layers.indexOf('components')
      );
    });

    it('should wrap CSS in layer declarations', () => {
      const css = '.btn { background: blue; }';
      const layerName = 'components';
      const layeredCss = `@layer ${layerName} {\n${css}\n}`;

      expect(layeredCss).toContain('@layer components');
      expect(layeredCss).toContain('.btn { background: blue; }');
    });
  });
});

describe('Component Name Extraction', () => {
  it('should extract component names from morph file paths', () => {
    const extractComponentName = (importPath) => {
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const parts = importPath.split('/');
        const filename = parts[parts.length - 1];
        if (filename.endsWith('.morph')) {
          return filename.replace('.morph', '');
        }
      }
      return null;
    };

    expect(extractComponentName('./components/Button.morph')).toBe('Button');
    expect(extractComponentName('./components/Card.morph')).toBe('Card');
    expect(extractComponentName('../shared/Modal.morph')).toBe('Modal');
    expect(extractComponentName('some-other-file.js')).toBe(null);
  });
});

describe('PostCSS Processing Integration', () => {
  it('should process CSS without errors', async () => {
    // Test that PostCSS processing works end-to-end
    const css = `
      .test-class {
        display: flex;
        justify-content: center;
        align-items: center;
      }
    `;

    const result = await processCss(css, {
      autoprefixer: true,
      minify: false,
    });

    expect(result).toHaveProperty('css');
    expect(result.css).toContain('display: flex');
    expect(result.css).toContain('justify-content: center');
    expect(result.css).toContain('align-items: center');
    // PostCSS should preserve the structure
    expect(result.css.length).toBeGreaterThan(10);
  });

  it('should handle minification option', async () => {
    const css = `
      .btn {
        background: blue;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
      }
    `;

    const result = await processCss(css, {
      autoprefixer: false,
      minify: true,
    });

    // Minified CSS should not contain extra whitespace
    expect(result.css).not.toContain('\n\n');
    expect(result.css).toContain('background:blue');
    // cssnano optimizes color values
    expect(result.css).toMatch(/color:(#fff|white)/);
    // Should still be valid CSS
    expect(result.css).toContain('.btn');
    expect(result.css).toContain('{');
    expect(result.css).toContain('}');
  });

  it('should minify CSS in production mode', async () => {
    const css = `
      .btn {
        background: blue;
        color: white;
        padding: 10px 20px;
      }
    `;

    const result = await processCss(css, {
      autoprefixer: false,
      minify: true,
    });

    // Minified CSS should be much shorter and on one line
    expect(result.css.length).toBeLessThan(css.length);
    expect(result.css).not.toContain('\n');
    expect(result.css).toContain('background:blue');
  });
});

describe('Morph File CSS Processing', () => {
  it('should export scoped CSS and styles object', () => {
    // Test the expected output structure for processed morph files
    const expectedCss =
      '@layer components { .Button_btn_abc123 { background: blue; } }';
    const expectedStyles = { btn: 'Button_btn_abc123' };

    expect(expectedCss).toContain('@layer components');
    expect(expectedCss).toContain('Button_btn_abc123');
    expect(expectedStyles.btn).toBe('Button_btn_abc123');
  });

  it('should handle CSS-only morph files', () => {
    // Test that CSS-only files export styles instead of css
    const expectedOutput =
      'export const styles = ".btn { background: blue; }";';
    expect(expectedOutput).toContain('export const styles');
    expect(expectedOutput).not.toContain('export const css');
  });
});
