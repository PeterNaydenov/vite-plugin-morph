# Quickstart: Unified Client Interface

**Date**: 2025-12-25
**Feature**: specs/001-unified-client-interface/spec.md
**Phase**: 1 - Design & Contracts

## Overview

The unified client interface provides a consistent way to apply CSS styles and manage themes across all vite-plugin-morph environments (development, build, and library consumption).

## Installation

```bash
npm install @peter.naydenov/vite-plugin-morph
```

## Basic Usage

### Development Mode

```javascript
// In your main.js or app entry point
import { applyStyles, themesControl } from '@peter.naydenov/vite-plugin-morph/client';

// Apply all CSS layers (general, components, themes)
applyStyles();

// Theme management
console.log('Available themes:', themesControl.list());
console.log('Current theme:', themesControl.getCurrent());
console.log('Default theme:', themesControl.getDefault());

// Switch theme
themesControl.set('dark');
```

### Library Consumption

```javascript
// When using a built morph library
import { Button, applyStyles, themesControl } from '@my-morph-library';

// Apply library styles
applyStyles();

// Use components and themes
const button = Button({ text: 'Click me', variant: 'primary' });
themesControl.set('ocean');
```

## Configuration

### Vite Plugin Setup

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin({
      // Optional: Configure global CSS collection
      globalCSS: {
        directory: 'src/styles',
        include: ['**/*.css'],
        exclude: ['**/*.min.css']
      }
    })
  ]
});
```

### Theme Setup

Create theme files in your `themes/` directory:

```
themes/
├── default.css
├── dark.css
└── ocean.css
```

## API Reference

### applyStyles()

Applies CSS layers in order: general → components → themes.

```typescript
applyStyles(): void
```

- **Development**: Embeds CSS in `<style>` tags
- **Production**: Creates `<link>` tags to CSS assets
- **Idempotent**: Multiple calls add new elements (not replaced)

### themesControl

Theme management interface.

```typescript
themesControl: {
  list(): string[]           // Get available theme names
  getCurrent(): string       // Get active theme name
  getDefault(): string       // Get default theme name
  set(name: string): boolean // Switch to theme, returns success
}
```

## Environment Behavior

| Environment | CSS Loading | Theme Switching | Hot Reload |
|-------------|-------------|-----------------|------------|
| Development | `<style>` tags | DOM link updates | ✅ Full |
| Build | `<link>` tags | DOM link updates | ❌ None |
| Library | `<link>` tags | DOM link updates | ❌ None |

## Error Handling

- **CSS Loading Failures**: Logged but execution continues
- **Invalid Theme Names**: Warning logged, current theme unchanged
- **Multiple applyStyles()**: Each call adds new CSS elements
- **SSR**: No special handling needed (components don't use events)

## Migration Guide

### From Environment-Specific Code

**Before** (different code per environment):
```javascript
// Development
import { applyStyles } from 'virtual:morph-client';

// Library
import { applyStyles } from '@my-library';
```

**After** (same code everywhere):
```javascript
// Works in all environments
import { applyStyles } from '@peter.naydenov/vite-plugin-morph/client';
```

### From Manual CSS Management

**Before**:
```javascript
// Manual CSS link creation
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/themes/dark.css';
document.head.appendChild(link);
```

**After**:
```javascript
// Unified theme switching
themesControl.set('dark');
```

## Troubleshooting

### CSS Not Loading

1. Check browser network tab for failed CSS requests
2. Verify theme names match available themes: `themesControl.list()`
3. Ensure `applyStyles()` is called after DOM is ready

### Theme Not Switching

1. Check `themesControl.list()` returns expected themes
2. Verify theme CSS files exist at expected URLs
3. Check browser console for theme loading errors

### Development vs Production Differences

- **Development**: CSS embedded for hot reloading
- **Production**: CSS loaded from separate files for caching
- Both use same API, different internal strategies

## Advanced Usage

### Custom Theme URLs

For advanced theme management, you can implement custom theme controllers:

```javascript
import { createThemeController } from '@peter.naydenov/vite-plugin-morph/client';

const customThemes = createThemeController({
  themes: ['light', 'dark'],
  defaultTheme: 'light',
  getThemeUrl: (name) => `/api/themes/${name}.css`
});
```

### CSS Layer Ordering

The system applies CSS in this guaranteed order:
1. **General**: Global styles, resets, utilities
2. **Components**: Morph component styles
3. **Themes**: Theme-specific overrides

This ensures proper cascading and prevents style conflicts.</content>
<parameter name="filePath">specs/001-unified-client-interface/quickstart.md