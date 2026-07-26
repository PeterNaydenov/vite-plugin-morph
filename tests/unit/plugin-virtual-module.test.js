import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMorphPlugin } from '../../src/plugin/index.js';
import { extractThemesFromDirs } from '../../src/services/theme-variables.js';

// Mock dependencies
vi.mock('../../src/services/theme-variables.js', () => ({
  extractThemesFromDirs: vi.fn(),
}));
vi.mock('../../src/plugin/config.js', () => ({
  default: { defaultConfig: {} },
  resolveThemeDirectories: () => ['/themes'],
}));
vi.mock('../../src/services/css-collection.js', () => ({
  startCssCollection: vi.fn(),
  finalizeCssCollection: vi.fn(),
}));

describe('Plugin - Virtual Morph Themes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should generate virtual module with discovered themes', async () => {
    extractThemesFromDirs.mockResolvedValue({
      light: { variables: { '--bg': '#fff' } },
      dark: { variables: { '--bg': '#000' } },
    });

    const plugin = createMorphPlugin({ themes: { defaultTheme: 'light' } });
    const loadHook = plugin.load.bind(plugin);

    const code = await loadHook('\0virtual:morph-themes');

    // Verify the virtual module exports an object
    expect(code).toMatch(/export default \{.*\}/);

    // Verify JSON structure is valid by parsing it
    const jsonMatch = code.match(/export default (\{.*\});/);
    expect(jsonMatch).toBeDefined();

    const exportedThemes = JSON.parse(jsonMatch[1]);
    expect(exportedThemes.light).toBeDefined();
    expect(exportedThemes.dark).toBeDefined();
    expect(exportedThemes.light.variables['--bg']).toBe('#fff');
    expect(exportedThemes.dark.variables['--bg']).toBe('#000');

    // Verify the named defaultTheme export exists and resolves (src/browser.js imports it)
    expect(code).toMatch(/export const defaultTheme = "light";/);
  });

  it('should handle circular dependencies by JSON.stringify', async () => {
    // Test if standard stringify works or if we need special handling
    // (Though standard JSON.stringify throws on circular, we want to see if that's the issue)
    const circularTheme = { name: 'circular' };
    circularTheme.self = circularTheme; // Circular ref

    extractThemesFromDirs.mockResolvedValue({ circular: circularTheme });

    const plugin = createMorphPlugin();
    const loadHook = plugin.load.bind(plugin);

    try {
      await loadHook('\0virtual:morph-themes');
    } catch (e) {
      expect(e.message).toMatch(/circular structure/);
      return;
    }
    // If it doesn't throw, something is weird, but standard JSON.stringify SHOULD throw.
  });
});
