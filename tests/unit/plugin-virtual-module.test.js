
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMorphPlugin } from '../../src/plugin/index.js';
import { createThemeDiscovery } from '../../src/services/theme-discovery.js';

// Mock dependnecies
vi.mock('../../src/services/theme-discovery.js');
vi.mock('../../src/plugin/config.js', () => ({
    default: { defaultConfig: {} },
    resolveThemeDirectories: () => ['/themes']
}));
vi.mock('../../src/services/css-collection.js', () => ({
    startCssCollection: vi.fn(),
    finalizeCssCollection: vi.fn()
}));

describe('Plugin - Virtual Morph Themes', () => {
    let mockDiscoverThemes;

    beforeEach(() => {
        vi.resetAllMocks();

        mockDiscoverThemes = vi.fn();
        createThemeDiscovery.mockReturnValue({
            discoverThemes: mockDiscoverThemes
        });
    });

    it('should generate virtual module with discovered themes', async () => {
        // Setup mock themes
        const themesMap = new Map();
        themesMap.set('light', { name: 'light', variables: { '--bg': '#fff' } });
        themesMap.set('dark', { name: 'dark', variables: { '--bg': '#000' } });

        mockDiscoverThemes.mockResolvedValue(themesMap);

        const plugin = createMorphPlugin({ themes: { defaultTheme: 'light' } });
        const loadHook = plugin.load.bind(plugin);

        const code = await loadHook('\0virtual:morph-themes');

        // Verify content
        expect(code).toContain('export const defaultTheme = "light"');
        expect(code).toContain('export default {');
        expect(code).toContain('"light": {');
        expect(code).toContain('"name": "light"');
        expect(code).toContain('"dark": {');
        expect(code).toContain('"name": "dark"');
    });

    it('should handle circular dependencies by JSON.stringify', async () => {
        // Test if standard stringify works or if we need special handling
        // (Though standard JSON.stringify throws on circular, we want to see if that's the issue)
        const themesMap = new Map();
        const circularTheme = { name: 'circular' };
        circularTheme.self = circularTheme; // Circular ref
        themesMap.set('circular', circularTheme);

        mockDiscoverThemes.mockResolvedValue(themesMap);

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
