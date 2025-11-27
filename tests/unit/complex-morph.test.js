/**
 * Test for complex morph file with multiple helpers
 * @fileoverview Tests for processing morph file with showProfile helper
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { processMorphFile } from '../../src/core/processor.js';

describe('Complex Morph File Processing', () => {
  it('should extract showProfile helper correctly', async () => {
    const morphContent = readFileSync(
      resolve(__dirname, '../fixtures/complex-show-profile.morph'),
      'utf8'
    );

    const result = await processMorphFile(
      morphContent,
      'complex-show-profile.morph',
      {}
    );

    // Verify that the template object was created
    expect(result.templateObject).toBeDefined();
    expect(result.templateObject.template).toContain(
      '{{ notifications : showNotify }}'
    );
    expect(result.templateObject.template).toContain('{{ : showProfile }}');
    expect(result.templateObject.template).toContain(
      '{{  projects : showService }}'
    );

    // Verify that helpers were extracted
    expect(result.templateObject.helpers).toBeDefined();

    // Verify showProfile helper is a function with correct content
    const showProfileHelper = result.templateObject.helpers.showProfile;
    console.log(showProfileHelper.toString());
    expect(typeof showProfileHelper).toBe('function');

    // Check that function string contains the expected logic
    const showProfileString = showProfileHelper.toString();
    expect(showProfileString).toContain('cards.profile');
    expect(showProfileString).toContain('render');
    expect(showProfileString).toContain('data.profile');
    expect(showProfileString).toContain('icons:data.icons');

    // Verify other helpers are also functions
    expect(typeof result.templateObject.helpers.showService).toBe('function');
    expect(typeof result.templateObject.helpers.showNotify).toBe('function');
    expect(typeof result.templateObject.helpers.blank).toBe('string');
  }); // it

  it('should include handshake data in development mode', async () => {
    const morphContent = `<p>Test content</p><script>const test = () => {}</script><script type="application/json">{"test": true}</script>`;

    const result = await processMorphFile(morphContent, 'test.morph', {
      development: { sourceMaps: true },
    });
    expect(result.templateObject.handshake).toEqual({ test: true });
  });

  it('should include handshake data in production mode', async () => {
    const morphContent = `<p>Test content</p><script>const test = () => {}</script><script type="application/json">{"test": true}</script>`;

    const result = await processMorphFile(morphContent, 'test.morph', {
      production: { removeHandshake: true },
    });
    expect(result.templateObject.handshake).toEqual({ test: true });
  });
});
