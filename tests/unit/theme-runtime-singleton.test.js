
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getThemeRuntime, ThemeRuntime } from '../../src/services/theme-runtime.js';

describe('ThemeRuntime Singleton', () => {
    beforeEach(() => {
        // Reset the module registry to ensure a fresh singleton for each test file import if possible,
        // but since we are importing the module, the singleton variable `globalThemeRuntime` is persistent.
        // We need to hackily reset it or use a separate way to clear it.
        // Inspecting services/theme-runtime.js, `globalThemeRuntime` is not exported.
        // However, `reset()` method clears content.
        // We can't easily nullify the singleton variable from outside without changing code.
        // But we can check if `reset()` is sufficient for our test case logic.
        // Actually, `getThemeRuntime` checks `!globalThemeRuntime`.
        // If we want to test "creation then update", we can do it.

        // Ideally we would reload the module, but that's hard in vitest without isolation.
        // Let's assume we can just use the existing instance and clear it.
        const runtime = getThemeRuntime();
        runtime.reset();
        // Note: reset() doesn't nullify globalThemeRuntime, just clears themes.
        // My fix checks `globalThemeRuntime.themes.size === 0`.
        // So reset() properly simulates the "empty" state.
    });

    it('should hydrate an empty singleton when themeRuntime is called later', () => {
        // 1. Get empty runtime (simulates early access)
        const runtime1 = getThemeRuntime();
        expect(runtime1.list()).toEqual([]);
        expect(runtime1.themes.size).toBe(0);

        // 2. Call again WITH themes (simulates themeRuntime() helper)
        const themes = {
            default: { variables: {} },
            dark: { variables: {} }
        };

        const runtime2 = getThemeRuntime({ themes });

        // 3. Verify it's the SAME instance
        expect(runtime2).toBe(runtime1);

        // 4. Verify it is now populated
        expect(runtime2.list()).toHaveLength(2);
        expect(runtime2.list()).toContain('default');
        expect(runtime2.list()).toContain('dark');
    });


    it('should hydrate with object-based themes', () => {
        const runtime1 = getThemeRuntime();
        expect(runtime1.list()).toEqual([]);

        const themesObj = {
            'obj-theme': { variables: {} }
        };

        const runtime2 = getThemeRuntime({ themes: themesObj });

        expect(runtime2.list()).toContain('obj-theme');
    });

    it('should NOT overwrite existing themes if runtime is already populated', () => {
        // 1. Setup with initial themes
        const initialThemes = { 'initial': { variables: {} } };
        const runtime1 = getThemeRuntime({ themes: initialThemes });
        expect(runtime1.list()).toContain('initial');

        // 2. Try to "hydrate" with different themes
        const newThemes = { 'new': { variables: {} } };
        const runtime2 = getThemeRuntime({ themes: newThemes });

        // 3. Should still have only initial themes because size > 0 prevents overwrite
        expect(runtime2.list()).toContain('initial');
        expect(runtime2.list()).not.toContain('new');
    });
});
