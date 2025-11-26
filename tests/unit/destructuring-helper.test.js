/**
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processScriptContent } from '../../src/core/script.js';

describe('Helper Template Destructuring Support', () => {
  it('should recognize complex helper templates with destructuring', () => {
    const scriptContent = `
      const showProfile = ({ data, dependencies:{ cards } }) => cards.profile ( 'render', {...data.profile, icons:data.icons}, cards )
    `;

    const result = processScriptContent(scriptContent);

    expect(result.functions).toBeDefined();
    expect(result.functions.showProfile).toBeDefined();
    expect(typeof result.functions.showProfile).toBe('function');
    expect(result.functions.showProfile.toString()).toContain('data.profile');
    expect(result.functions.showProfile.toString()).toContain('data.icons');
    expect(result.functions.showProfile.toString()).toContain('cards');
  });

  it('should handle arrow function helper templates', () => {
    const scriptContent = `
      const userCard = (user) => \`
        <div class="user-card">
          <h3>\${user.name}</h3>
          <p>\${user.email}</p>
        </div>
      \`
    `;

    const result = processScriptContent(scriptContent);

    expect(result.templates).toBeDefined();
    expect(result.templates.userCard).toBeDefined();
  });

  it('should handle mixed destructuring and regular parameters', () => {
    const scriptContent = `
      const complexHelper = ({ user, settings }, defaultOptions = {}) => \`
        <div class="\${settings.theme}">
          <span>\${user.name}</span>
          \${defaultOptions.badge ? '<badge>Admin</badge>' : ''}
        </div>
      \`
    `;

    const result = processScriptContent(scriptContent);

    expect(result.templates).toBeDefined();
    expect(result.templates.complexHelper).toBeDefined();
  });
});
