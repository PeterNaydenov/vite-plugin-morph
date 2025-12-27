# Library Mode Guide

## Overview

Library Mode allows you to build distributable component libraries with `vite-plugin-morph`. Your library will extract your components, CSS layers, and runtime controls into a single, self-contained package. It will be a standard npm package containing:

- **Components** - Compiled `.morph` files as ES modules
- **CSS Layers** - General styles, component styles, and themes as separate files
- **Runtime Controls** - `applyStyles()` and `themesControl` for managing CSS and themes

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
    license: 'MIT'
  }
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
export { applyStyles, themesControl } from '@peter.naydenov/vite-plugin-morph/client';
```

### 4. Build Your Library

```bash
npm run build:lib
```

### 5. Publish Your Library
Publish your library package to npm as usual.



## API Reference

### `applyStyles()`

Injects `<link>` tags for all CSS layers.

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

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `entry` | string | No | Entry point (default: `src/main.js`) |
| `library.name` | string | **Yes** | Package name |
| `library.version` | string | No | Version (default: `1.0.0`) |
| `outputDir` | string | No | Output directory (default: `dist/library`) |

See full documentation in README.md.
