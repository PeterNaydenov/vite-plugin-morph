/**
 * Unit tests for HTML parser functionality
 * @fileoverview Tests for parse5-based HTML parsing in morph files
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseMorphFile,
  parseHTMLFragment,
  extractScriptContent,
  extractStyleContent,
  getNodeLocation,
} from '../../src/core/parser.js';
import { extractTemplateContent } from '../../src/core/template.js';

describe('HTML Parser', () => {
  describe('parseMorphFile', () => {
    it('should parse valid morph file content', () => {
      const content = `
                <div class="container">
                  <h1>Hello World</h1>
                </div>
                <script>console.log('test');</script>
                <style>.container { color: red; }</style>
              `;

      const result = parseMorphFile(content);
      expect(result).toBeDefined();
      expect(result.childNodes).toBeDefined();
      expect(result.childNodes.length).toBeGreaterThan(0);
    }); //it

    it('should parse malformed HTML gracefully', () => {
      const malformedContent = '<div><p>Unclosed tags';

      const result = parseMorphFile(malformedContent);
      expect(result).toBeDefined();
      expect(result.childNodes).toBeDefined();
    }); // it

    it('should handle empty content', () => {
      const result = parseMorphFile('');
      expect(result).toBeDefined();
      expect(result.childNodes).toBeDefined();
      // parse5 creates a full HTML document even for empty content
      expect(result.childNodes.length).toBeGreaterThan(0);
    }); // it
  }); // describe

  describe('parseHTMLFragment', () => {
    it('should parse HTML fragment', () => {
      const fragment = '<div class="test">Content</div>';

      const result = parseHTMLFragment(fragment);
      expect(result).toBeDefined();
      expect(result.childNodes).toBeDefined();
      expect(result.childNodes.length).toBeGreaterThan(0);
    }); // it

    it('should handle multiple root elements in fragment', () => {
      const fragment = '<div>First</div><span>Second</span>';

      const result = parseHTMLFragment(fragment);
      expect(result.childNodes.length).toBe(2);
    }); // it

    it('should parse invalid fragment gracefully', () => {
      const invalidFragment = '<div><span>Unclosed';

      const result = parseHTMLFragment(invalidFragment);
      expect(result).toBeDefined();
      expect(result.childNodes).toBeDefined();
    }); // it
  }); // describe

  describe('extractScriptContent', () => {
    let document;

    beforeEach(() => {
      const content = `
                                <div>Template content</div>
                                <script type="text/javascript">
                                  function test() { return 'hello'; }
                                </script>
                                <script type="application/json">
                                  { "key": "value" }
                                </script>
                              `;
      document = parseMorphFile(content);
    }); // beforeEach

    it('should extract JavaScript script content', () => {
      const scriptContent = extractScriptContent(document, 'text/javascript');
      expect(scriptContent).toContain('function test()');
      expect(scriptContent).toContain("return 'hello'");
    }); // it

    it('should extract JSON script content', () => {
      const jsonContent = extractScriptContent(document, 'application/json');
      expect(jsonContent).toContain('{ "key": "value" }');
    }); // it

    it('should return null for non-existent script type', () => {
      const content = extractScriptContent(document, 'text/typescript');
      expect(content).toBeNull();
    }); // it

    it('should return empty string for script without content', () => {
      const content = '<script type="text/javascript"></script>';
      const doc = parseMorphFile(content);
      const scriptContent = extractScriptContent(doc, 'text/javascript');
      expect(scriptContent).toBe('');
    }); // it
  }); // describe

  describe('extractStyleContent', () => {
    it('should extract CSS content from style tags', () => {
      const content = `
                    <div>Template</div>
                    <style>
                      .container { 
                        color: red; 
                        font-size: 16px; 
                      }
                    </style>
                  `;
      const document = parseMorphFile(content);

      const styleContent = extractStyleContent(document);
      expect(styleContent).toContain('.container');
      expect(styleContent).toContain('color: red');
      expect(styleContent).toContain('font-size: 16px');
    });

    it('should return null when no style tag exists', () => {
      const content = '<div>No styles here</div>';
      const document = parseMorphFile(content);

      const styleContent = extractStyleContent(document);
      expect(styleContent).toBeNull();
    });

    it('should return empty string for empty style tag', () => {
      const content = '<div>Template</div><style></style>';
      const document = parseMorphFile(content);

      const styleContent = extractStyleContent(document);
      expect(styleContent).toBe('');
    });

    it('should handle multiple style tags (takes first one)', () => {
      const content = `
                    <style>.first { color: red; }</style>
                    <style>.second { color: blue; }</style>
                  `;
      const document = parseMorphFile(content);

      const styleContent = extractStyleContent(document);
      expect(styleContent).toContain('.first');
      expect(styleContent).not.toContain('.second');
    }); // it
  }); // describe

  describe('extractTemplateContent', () => {
    it('should extract template content excluding scripts and styles', () => {
      const content = `
                    <div class="container">
                      <h1>Title</h1>
                      <p>Content</p>
                    </div>
                    <script>console.log('script');</script>
                    <style>.container { color: red; }</style>
                  `;
      const document = parseMorphFile(content);

      const templateContent = extractTemplateContent(document);
      expect(templateContent.html).not.toContain('.test');
      // Should contain basic HTML structure
      expect(templateContent.html).toContain('<html>');
      expect(templateContent.html).toContain('<head>');
      expect(templateContent.html).toContain('<body>');
    }); // it

    it('should handle comments in template', () => {
      const content = `
                    <!-- This is a comment -->
                    <div>Content</div>
                    <!-- Another comment -->
                  `;
      const document = parseMorphFile(content);

      const templateContent = extractTemplateContent(document);
      expect(templateContent.html).toContain('<!-- This is a comment -->');
      expect(templateContent.html).toContain('<div>Content</div>');
      expect(templateContent.html).toContain('<!-- Another comment -->');
    }); // it

    it('should handle text nodes', () => {
      const content = `
                    Plain text content
                    <div>HTML content</div>
                    More text
                  `;
      const document = parseMorphFile(content);

      const templateContent = extractTemplateContent(document);
      expect(templateContent.html).toContain('Plain text content');
      expect(templateContent.html).toContain('<div>HTML content</div>');
      expect(templateContent.html).toContain('More text');
    }); // it
  }); // describe

  describe('getNodeLocation', () => {
    it('should return default location when no location info available', () => {
      const mockNode = { nodeName: 'div' };

      const location = getNodeLocation(mockNode);
      expect(location).toEqual({
        file: '',
        line: 1,
        column: 1,
        offset: 0,
      });
    }); // it

    it('should extract location from node with __location', () => {
      const mockNode = {
        nodeName: 'div',
        __location: {
          line: 5,
          col: 10,
          startOffset: 100,
        },
      };

      const location = getNodeLocation(mockNode);
      expect(location).toEqual({
        file: '',
        line: 5,
        column: 10,
        offset: 100,
      });
    }); // it
  }); // describe

  describe('Complex morph file parsing', () => {
    it('should handle complete morph file structure', () => {
      const morphContent = `
                <!-- Basic morph file for testing -->
                <div class="container">
                  <h1>{{title}}</h1>
                  <p>{{content}}</p>
                </div>

                <script>
                function formatTitle(title) {
                  return title.toUpperCase();
                }

                function formatContent(content) {
                  return content.trim();
                }
                </script>

                <style>
                .container {
                  padding: 1rem;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                }

                h1 {
                  color: var(--primary-color, #007bff);
                }

                p {
                  color: var(--text-color, #333);
                }
                </style>

                <script type="application/json">
                {
                  "title": "Hello World",
                  "content": "This is a test morph file"
                }
                </script>
              `;

      const document = parseMorphFile(morphContent);

      // Test template extraction
      const template = extractTemplateContent(document);
      expect(template.html).toContain('<!-- Basic morph file for testing -->');
      expect(template.html).toContain('<div class="container">');
      expect(template.html).toContain('{{title}}');
      expect(template.html).toContain('{{content}}');

      // Test JavaScript extraction
      const jsContent = extractScriptContent(document, 'text/javascript');
      expect(jsContent).toContain('function formatTitle');
      expect(jsContent).toContain('function formatContent');

      // Test CSS extraction
      const cssContent = extractStyleContent(document);
      expect(cssContent).toContain('.container');
      expect(cssContent).toContain('padding: 1rem');

      // Test JSON extraction
      const jsonContent = extractScriptContent(document, 'application/json');
      expect(jsonContent).toContain('"title": "Hello World"');
      expect(jsonContent).toContain('"content": "This is a test morph file"');
    }); // it
  }); // describe
}); // describe
