# Library Mode — publishing `.morph` components

Library Mode lets you ship a set of `.morph` components as a standalone npm package that consumers drop into any Vite app (or any non-Vite app that can apply a `<style>` block).

**Scoping happens once, at compile time.** A `.morph` file compiles to a JS render function exactly once — for a library, that's at `buildLibrary()` time. Class names are CSS-modules scoped (hashed) then, and that's final; there's no host-side re-scoping step, because nothing re-compiles an already-built component. The library ships this pre-scoped CSS **plus** a parallel non-hashed "light label" class on the same elements (`Button_btn_x7k9p2 btn`) — see [README.md's CSS @layer Cascade Control](../../../../README.md#css-layer-cascade-control) for the full five-layer model (`vendors, libs, modules, app, context`). The host does **not** re-scope the library's CSS; it assigns layer membership (`@layer libs`), runs PostCSS/optimization on the combined output, and writes `app`/`context`-layer rules against the light-label classes for theming and brand/contextual overrides. That division — the host controls layering, optimization, and `app`/`context` customization, not component scoping — is the actual separation of concerns.

## When to use Library Mode

- You want to publish a UI kit / component library of `.morph` files.
- Consumers may use a different Vite plugin config than you do.
- Consumers need full theme control without forking your CSS.

Don't use Library Mode for a single app — that's the standard "configure `morphPlugin` in `vite.config.js`" flow.

## Building a library

### 1. Add a build script

```js
// scripts/build-library.js
import { buildLibrary } from '@peter.naydenov/vite-plugin-morph';

await buildLibrary({
  entry: 'src/main.js',
  library: {
    name: '@myorg/my-morph-components',
    version: '1.0.0',
  },
});
```

### 2. Define the entry

```js
// src/main.js
export { default as Button } from './components/Button.morph';
export { default as Card } from './components/Card.morph';
export {
  applyStyles,
  themesControl,
  registerComponentCSS,
  getAllComponentCSS,
  generateCombinedCSS,
  updateComponentCSS,
} from '@peter.naydenov/vite-plugin-morph/client';
```

Each component's CSS is scoped (hashed) at library build time — that scoping is final and not repeated by the host. The library ships this pre-scoped CSS, plus a `componentsCSS` map the host can register, plus each class's parallel non-hashed light-label name for host-side `app`/`context` overrides.

### 3. Library `package.json` exports

```json
{
  "name": "@myorg/my-morph-components",
  "exports": {
    ".": "./dist/index.js",
    "./styles": "./dist/styles"
  }
}
```

The `./styles` subpath exposes the raw CSS directory so consumers can `import '@myorg/my-morph-components/styles'`.

## Consuming a library

### 1. Install + configure host

```js
// host vite.config.js
import morphPlugin from '@peter.naydenov/vite-plugin-morph';
export default {
  plugins: [
    morphPlugin({
      css: {
        layers: { enabled: true, order: ['vendors','libs','modules','app','context'] },
        postcss: { autoprefixer: true, minify: true },
      },
    }),
  ],
};
```

### 2. Wire up the library at app boot

```js
// host src/main.js
import { Button, applyStyles } from '@myorg/my-morph-components';

applyStyles(); // applies the library's CSS using the host's plugin config

const html = Button('view', { text: 'Click me', variant: 'primary' });
document.body.innerHTML = html;
```

`applyStyles()` is environment-aware:

- **dev** — injects per-component `<style>` tags.
- **build** — uses the combined CSS bundle URL.
- **library** — uses `componentsCSS` from the library's metadata.

### 3. Theming

```js
import { themesControl } from '@myorg/my-morph-components';
themesControl.list();           // ['light', 'dark', 'high-contrast']
themesControl.set('dark');      // applies to all registered libraries
themesControl.getCurrent();     // 'dark'
```

Themes are registered per library via the runtime. The plugin keeps a global registry on `window.__MORPH_THEMES__` so multiple libraries cooperate.

## What gets shipped vs. what gets processed

| Concern | Library | Host |
| --- | --- | --- |
| Component compilation | ✅ (scoped CSS + light-label classes, no PostCSS) | (none) |
| Scoping (hashing) | ✅ — final, done once at compile time | ❌ — never re-scopes |
| CSS layer assignment | ❌ | ✅ — wraps library CSS in `@layer libs` |
| Tree-shaking | ❌ (host decides) | ✅ |
| PostCSS / minification | ❌ | ✅ |
| `app`/`context` customization | ❌ — that's the host's job | ✅ — pure selectors against light-label classes |
| Theme application | exposes `themesControl` | `applyStyles()` orchestrates |

## Anti-patterns in Library Mode

- **Minifying, layering, or PostCSS-processing at the library level.** The host owns that. (Scoping/hashing is different — that's correctly done once by the library at compile time, not repeated by the host.)
- **Hardcoding colors in component CSS.** The whole point of library mode is themeability — use `var(--token, fallback)`.
- **Importing the library's CSS directly via `<link>` instead of `applyStyles()`.** The runtime knows about HMR, theme switching, and the componentsCSS registry; raw `<link>` tags bypass all of it.
- **Re-implementing the component render on the consumer side.** Import the component, call it, render the result. Don't re-parse the template.
- **Mutating `window.__MORPH_*` globals directly.** Use the exported `registerComponentCSS`, `themesControl.set`, etc.

## Library build vs. app build

The library build produces:

- A JS bundle per component (template + helpers + handshake).
- Pre-scoped CSS files (hashed class names, plus light-label class exports).
- A `componentsCSS` map exported in the bundle.
- A `themes` registry exported in the bundle.

The app (host) build produces:

- Bundled JS for the consumer's own `.morph` files.
- Bundled CSS for the consumer's components **and** the registered library CSS.
- Optimized, tree-shaken output.
