# Library Mode Guide

## Overview

Library Mode allows you to build distributable component libraries with `vite-plugin-morph`. Your library will extract your components, CSS layers, and runtime controls into a single, self-contained package. It will be a standard npm package containing:

> **Two theme runtimes exist for two lifecycle stages.** This doc's `themesControl` is the **consumption-mode** API — for a host app combining one or more published libraries. There is a second, **local-mode** API, `themeRuntime`/`getThemeRuntime` (`@peter.naydenov/vite-plugin-morph/browser`), for a single project working directly with its own local theme files before (or instead of) publishing — see [setup-component-library.md](setup-component-library.md). Both share the same method vocabulary (`list`, `getCurrent`, `getDefault`, `set`, `setDefault`, `has`); `themesControl` adds `listForLibrary()`, `themeRuntime` adds `initialize()`.

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

Applies CSS based on the current execution environment (see [README.md](./README.md#runtime-api-peternaydenovvite-plugin-morphclient) for the full breakdown):

- **`development`**: injects per-component `<style>` tags
- **`library`**: uses the embedded `componentsCSS` mapping to register `<style>` tags, with source prefix
- **`build`**: loads CSS from URLs

Always `<style>` tag injection (or URL loading in production) — never `<link>` tags.

```javascript
import { applyStyles } from '@myorg/my-components';
applyStyles();
```

### `themesControl`

Runtime API for theme switching.

- `list()` - Get available themes
- `getCurrent()` - Get current theme
- `getDefault()` - Get the configured default theme's name
- `set(themeName)` - Switch theme
- `setDefault(themeName)` - Designate a new default theme and apply it immediately
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

The class `btn` maps to `Button_btn_x7k9p2` to prevent conflicts with host project styles. Scoping happens once, here at library build time — the host never re-scopes it. The rendered element carries **both** names (`class="Button_btn_x7k9p2 btn"`): the scoped name is what the library's own CSS (in the `libs` cascade layer) targets, and the plain `btn` "light label" is what a host app can target with pure selectors in its `app`/`context` layers to customize the component — see [README.md's CSS @layer Cascade Control](README.md#css-layer-cascade-control) for the full five-layer model.

## Configuration

| Option                    | Type   | Required | Default              | Description                                                |
| ------------------------- | ------ | -------- | -------------------- | ----------------------------------------------------------- |
| `entry`                   | string | No       | `'src/main.js'`       | Entry point file path                                        |
| `outputDir`               | string | No       | `'dist/library'`      | Output directory                                             |
| `themesDir`               | string | No       | `'src/themes'`        | Directory containing theme CSS files                          |
| `hashMode`                | string | No       | `'development'`       | `'development'` (stable) or `'production'` (content-based)   |
| `library.name`            | string | **Yes**  | -                     | Package name (e.g., `@myorg/my-components`)                  |
| `library.version`         | string | No       | `'1.0.0'`             | Package version                                              |
| `library.description`     | string | No       | Generated             | Package description                                          |
| `library.author`          | string | No       | -                     | Package author                                               |
| `library.license`         | string | No       | -                     | Package license                                              |
| `library.defaultTheme`    | string | No       | First theme, or the project's own `themes.defaultTheme` if set | Default theme name for the packaged library — see the note above |
| `library.packageJson`     | object | No       | -                     | Additional package.json fields                                |

See full documentation in README.md.
