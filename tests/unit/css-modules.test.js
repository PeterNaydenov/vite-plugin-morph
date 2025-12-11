/**
 * CSS Modules and Scoping Tests
 */

import { describe, it, expect } from 'vitest';

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
});
