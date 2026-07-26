import themes, { defaultTheme } from 'virtual:morph-themes';
import { getThemeRuntime } from './services/theme-runtime.js';

/**
 * Initialize and get the theme runtime with auto-discovered themes
 * @returns {import('./services/theme-runtime.js').ThemeRuntime} Theme runtime instance
 */
export function themeRuntime() {
    return getThemeRuntime({
        themes,
        defaultTheme,
    });
}

// Re-export getThemeRuntime for manual usage
export { getThemeRuntime };
