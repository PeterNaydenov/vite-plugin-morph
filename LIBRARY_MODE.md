# Library Mode Guide

## Overview

Library Mode allows you to build distributable component libraries with `vite-plugin-morph`. Your library will extract your components, CSS layers, and runtime controls into a single, self-contained package. It will be a standard npm package containing:

- **Components** - Compiled `.morph` files as ES modules
- **CSS Modules** - Scoped CSS with unique class names for each component
- **Runtime Controls** - `applyStyles()`, `themesControl`, and CSS management functions

## Quick Start

### 1. Create Build Script

Create `scripts/build-library.js`:

```javascript
import { buildLibrary } from '@peter.naydenov/vite-plugin-morph';

await buildLibrary({
  entry: 'src/main.js',
  library: {
    name: '@myorg/my-components',
    version: '1.0.0',
    description: 'My component library',
    author: 'Your Name',
    license: 'MIT',
  },
});
```

### 2. Add NPM Script

In your `package.json`:

```json
{
  "scripts": {
    "build:lib": "node scripts/build-library.js"
  }
}
```

### 3. Define Your Library Entry

Create `src/main.js` (or `src/index.js`):

```javascript
// Export components
export { default as Button } from './components/Button.morph';
export { default as Card } from './components/Card.morph';

// Export CSS controls
export {
  applyStyles,
  themesControl,
  registerComponentCSS,
  getAllComponentCSS,
  generateCombinedCSS,
} from '@peter.naydenov/vite-plugin-morph/client';
```

### 4. Build Your Library

```bash
npm run build:lib
```

### 5. Publish Your Library

Publish your library package to npm as usual.

## API Reference

### `applyStyles()`

Injects `<style>` tags for all component CSS. Uses `componentsCSS` mapping to register styles with source prefix.

```javascript
import { applyStyles } from '@myorg/my-components';
applyStyles();
```

### `themesControl`

Runtime API for theme switching.

- `list()` - Get available themes
- `getCurrent()` - Get current theme
- `getDefault()` - Get default theme
- `set(themeName)` - Switch theme
- `listForLibrary(libraryName)` - Get themes for specific library
- `has(themeName)` - Check if theme exists

### `registerComponentCSS(componentName, cssRule)`

Register CSS for a host project component. Useful when dynamically adding components.

```javascript
import { registerComponentCSS } from '@peter.naydenov/vite-plugin-morph/client';

registerComponentCSS(
  'MyComponent',
  '.MyComponent_container_abc123 { padding: 1rem; }'
);
```

### `getAllComponentCSS()`

Get all registered component CSS. Returns object keyed by `'componentName/source'`.

```javascript
import { getAllComponentCSS } from '@peter.naydenov/vite-plugin-morph/client';

const allCSS = getAllComponentCSS();
// { 'Button/@myorg/ui': '.Button_btn_x7k9p2 { ... }', 'Card/host': '.Card_card_y2m8r4 { ... }' }
```

### `generateCombinedCSS()`

Generate combined CSS string from all registered components for production bundling.

```javascript
import { generateCombinedCSS } from '@peter.naydenov/vite-plugin-morph/client';

const combinedCSS = generateCombinedCSS();
// '.Button_btn_x7k9p2 { ... }\n\n.Card_card_y2m8r4 { ... }'
```

## CSS Modules in Libraries

Library components automatically get scoped CSS class names:

```html
<!-- Button.morph -->
<button class="btn">Click me</button>

<style>
  .btn {
    background: blue;
    color: white;
  }
</style>
```

Generates scoped CSS:

```javascript
// In client.mjs (generated)
const componentsCSS = {
  btn: '.Button_btn_x7k9p2 { background: blue; color: white; }',
};
```

The class `btn` maps to `Button_btn_x7k9p2` to prevent conflicts with host project styles.

## Configuration

| Option            | Type   | Required | Description                                                |
| ----------------- | ------ | -------- | ---------------------------------------------------------- |
| `entry`           | string | No       | Entry point (default: `src/main.js`)                       |
| `library.name`    | string | **Yes**  | Package name                                               |
| `library.version` | string | No       | Version (default: `1.0.0`)                                 |
| `outputDir`       | string | No       | Output directory (default: `dist/library`)                 |
| `hashMode`        | string | No       | `'development'` (stable) or `'production'` (content-based) |

See full documentation in README.md.
