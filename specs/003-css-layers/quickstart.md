# Quick Start: CSS Layers Architecture

## Overview

Get started with CSS modules, PostCSS processing, and CSS layers in your morph plugin project. This guide covers the essential setup and usage patterns.

## Installation & Setup

### 1. Enable CSS Processing

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin({
      css: {
        enabled: true,
        modules: true,
        layers: true,
        treeShaking: true,
      },
    }),
  ],
});
```

### 2. PostCSS Configuration

Create `postcss.config.js` in your project root:

```javascript
// postcss.config.js
export default {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    autoprefixer: {},
    cssnano: { preset: 'default' },
  },
};
```

## Component CSS with Modules

### Basic Component with Scoped CSS

```html
<!-- components/Button.morph -->
<style>
  .btn {
    background: var(--primary-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }

  .btn:hover {
    transform: translateY(-1px);
  }
</style>

<div class="btn">Click me</div>
```

**Generated Output:**

```javascript
// dist/components/Button.js
export const styles = {
  btn: 'Button_btn_1a2b3c'
};

export default function Button() {
  return `<div class="${styles.btn}">Click me</div>`;
}

// dist/components/Button.css (auto-injected)
@layer components {
  .Button_btn_1a2b3c {
    background: var(--primary-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
  .Button_btn_1a2b3c:hover {
    transform: translateY(-1px);
  }
}
```

### Using Scoped Classes

```javascript
// In your JavaScript
import Button, { styles } from './components/Button.morph';

// styles.btn is automatically scoped
<button className={styles.btn}>Click me</button>;

// Renders: <button class="Button_btn_1a2b3c">Click me</button>
```

## Global Styles & Themes

### Global CSS Variables

```css
/* src/styles/global.css */
@layer global {
  :root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }

  body {
    font-family: var(--font-family);
    margin: 0;
  }
}
```

### Theme Variables

```css
/* src/themes/dark.css */
@layer themes {
  :root {
    --primary-color: #6c5ce7;
    --background: #2d3436;
    --text-color: #ffffff;
  }

  body {
    background: var(--background);
    color: var(--text-color);
  }
}
```

### Theme Switching

```javascript
import { themeControl } from '@peter.naydenov/vite-plugin-morph';

// Switch to dark theme
await themeControl.load('dark');

// Switch to light theme
await themeControl.load('light');

// Component automatically updates via CSS variables
```

## CSS Layers Hierarchy

All CSS is automatically organized into layers:

```css
@layer reset, global, components, themes;
```

- **reset**: Browser normalization
- **global**: Your global styles and variables
- **components**: All component CSS (scoped)
- **themes**: Theme overrides (highest priority)

## Tree-Shaking

### Automatic CSS Inclusion

```javascript
// app.js - Only Button is imported
import Button from './components/Button.morph';
// ✅ Only Button.css is included in bundle

// Later add Card
import Card from './components/Card.morph';
// ✅ Now Button.css + Card.css in bundle

// Modal never imported
// ❌ Modal.css excluded from bundle
```

### Bundle Output

```css
/* dist/components/components.css */
@layer components {
  /* Button styles */
  .Button_btn_1a2b3c { ... }

  /* Card styles */
  .Card_card_2d3e4f { ... }

  /* Modal styles not included */
}
```

## Development Workflow

### Hot Module Replacement

```bash
npm run dev
```

- CSS changes trigger instant updates
- No page refresh for style changes
- Source maps for debugging

### Error Handling

```javascript
// CSS syntax errors show in console with file/line info
// PostCSS plugin errors are clearly formatted
// Build continues with warnings for non-critical issues
```

## Migration from Existing CSS

### Before (Manual CSS)

```javascript
// Manual CSS handling
import Button, { css } from './Button.morph';

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
```

### After (Automatic)

```javascript
// CSS automatically injected
import Button, { styles } from './Button.morph';

// Use scoped classes
<button className={styles.btn}>Click</button>;
```

## Configuration Options

### Minimal Setup

```javascript
morphPlugin({
  css: true, // Enable all features with defaults
});
```

### Advanced Configuration

```javascript
morphPlugin({
  css: {
    enabled: true,
    postcss: {
      plugins: ['autoprefixer', 'cssnano'],
    },
    modules: {
      generateScopedName: '[name]_[local]_[hash:8]',
    },
    layers: {
      order: ['reset', 'global', 'components', 'themes'],
    },
    treeShaking: {
      analysis: 'static',
    },
    bundling: {
      filename: 'app-components.css',
      sourceMaps: true,
    },
  },
});
```

## Troubleshooting

### CSS Not Applying

- Check that component is imported
- Verify scoped class names are used
- Check browser dev tools for CSS injection

### Theme Not Switching

- Ensure theme file exists in `src/themes/`
- Check theme name matches exactly
- Verify CSS variables are used in components

### Build Performance

- Enable tree-shaking to reduce bundle size
- Use `cssnano` for production minification
- Consider code splitting for large applications

## Next Steps

1. **Start Simple**: Enable basic CSS modules
2. **Add Global Styles**: Create `src/styles/global.css`
3. **Create Themes**: Add theme files to `src/themes/`
4. **Optimize**: Enable tree-shaking and minification
5. **Advanced**: Configure custom PostCSS plugins

For detailed API reference, see `contracts/plugin-api.md`.</content>
<parameter name="filePath">specs/003-css-layers/quickstart.md
