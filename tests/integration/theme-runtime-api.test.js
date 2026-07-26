
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeRuntime } from '../../src/services/theme-runtime.js';

describe('Theme Runtime API', () => {
    let runtime;
    const mockThemes = {
        default: {
            variables: { 'color-bg': 'white', 'color-text': 'black' },
            components: {}
        },
        dark: {
            variables: { 'color-bg': 'black', 'color-text': 'white' },
            components: {}
        }
    };

    beforeEach(() => {
        // Mock document and window for DOM operations
        globalThis.document = {
            documentElement: {
                style: {
                    setProperty: vi.fn(),
                    getPropertyValue: vi.fn().mockReturnValue('')
                }
            },
            createElement: vi.fn().mockReturnValue({
                style: {},
                remove: vi.fn()
            }),
            head: {
                appendChild: vi.fn()
            },
            getElementById: vi.fn().mockReturnValue(null)
        };
        globalThis.window = globalThis;
    });

    it('should initialize synchronously with provided themes', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes,
            defaultTheme: 'default'
        });

        expect(runtime.isInitialized).toBe(true);
        expect(runtime.getCurrentTheme()).toBe('default');
    });

    it('should list available themes', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes
        });

        const themes = runtime.list();
        expect(themes).toContain('default');
        expect(themes).toContain('dark');
        expect(themes.length).toBe(2);
    });

    it('should get default theme', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes,
            defaultTheme: 'default'
        });

        expect(runtime.getDefault()).toBe('default');
    });

    it('should switch theme using set()', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes,
            defaultTheme: 'default'
        });

        // Initial state
        expect(runtime.getCurrentTheme()).toBe('default');

        // Switch theme
        const success = runtime.set('dark');

        expect(success).toBe(true);
        expect(runtime.getCurrentTheme()).toBe('dark');

        // Verify DOM updates
        expect(globalThis.document.documentElement.style.setProperty).toHaveBeenCalledWith('--color-bg', 'black');
    });

    it('should handle set() with invalid theme', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes
        });

        const success = runtime.set('invalid-theme');

        expect(success).toBe(false);
        expect(runtime.getCurrentTheme()).toBe('default'); // Should stay on default
    });

    it('should expose getCurrent() as the canonical name for getCurrentTheme()', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes,
            defaultTheme: 'default'
        });

        expect(runtime.getCurrent()).toBe('default');
        runtime.set('dark');
        expect(runtime.getCurrent()).toBe('dark');
        expect(runtime.getCurrentTheme()).toBe('dark'); // deprecated alias stays in sync
    });

    it('should designate and apply a new default theme via setDefault()', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes,
            defaultTheme: 'default'
        });

        const success = runtime.setDefault('dark');

        expect(success).toBe(true);
        expect(runtime.getDefault()).toBe('dark');
        expect(runtime.getCurrent()).toBe('dark');
    });

    it('should reject setDefault() with an unknown theme', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes,
            defaultTheme: 'default'
        });

        const success = runtime.setDefault('nonexistent');

        expect(success).toBe(false);
        expect(runtime.getDefault()).toBe('default');
    });

    it('should check theme existence via has()', () => {
        runtime = new ThemeRuntime({
            themes: mockThemes
        });

        expect(runtime.has('dark')).toBe(true);
        expect(runtime.has('nonexistent')).toBe(false);
    });

    it('should support manual initialization via initialize()', () => {
        runtime = new ThemeRuntime({
            defaultTheme: 'default'
        });

        // Not initialized yet
        expect(runtime.isInitialized).toBe(false);

        // Initialize manually
        runtime.initialize(mockThemes);

        expect(runtime.isInitialized).toBe(true);
        expect(runtime.list()).toEqual(expect.arrayContaining(['default', 'dark']));
    });
});
