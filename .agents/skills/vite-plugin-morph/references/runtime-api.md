# Runtime API (`@peter.naydenov/vite-plugin-morph/client`)

The client entry exposes the runtime helpers used by host apps, library consumers, and host-side components that need to participate in the same CSS / theme registry as library components.

## Import surface

```js
import {
  applyStyles,
  themesControl,
  registerComponentCSS,
  getAllComponentCSS,
  generateCombinedCSS,
  updateComponentCSS,
  detectEnvironment,
  getMorphConfig,
  setMorphConfig,
} from '@peter.naydenov/vite-plugin-morph/client';
```

## `applyStyles()`

Applies CSS based on the current environment. Call once on app boot.

- **dev** — injects per-component `<style>` tags into `<head>`. Idempotent.
- **build** — loads CSS from the URLs in `__MORPH_CONFIG__.cssUrls`.
- **library** — registers the library's `componentsCSS` and writes the host's `<style>` tags.

```js
import { applyStyles } from '@peter.naydenov/vite-plugin-morph/client';
applyStyles();
```

## `themesControl`

Runtime theme switching across libraries.

```js
themesControl.list();           // all themes known across all registered libraries
themesControl.listForLibrary('@myorg/ui');  // themes for one library
themesControl.set('dark');      // apply a theme; cascades to all libraries
themesControl.getCurrent();     // active theme name
themesControl.setDefault('light');  // set and apply default
themesControl.has('high-contrast'); // does this theme exist?
```

Themes are kept in `window.__MORPH_THEMES__` (per-library map) and `window.__MORPH_THEME_REGISTRY__` (master list).

## `registerComponentCSS(componentName, cssRule)`

For host-app components that want their CSS to participate in the same registry as library components. The CSS rule is the full scoped selector rule (e.g. `'.MyComp_root_a1b2c { padding: 1rem; }'`).

```js
import { registerComponentCSS } from '@peter.naydenov/vite-plugin-morph/client';
registerComponentCSS('MyHostCard', '.MyHostCard_root_x7y8z { padding: 1rem; }');
```

`applyStyles()` will then include this CSS in its output.

## `getAllComponentCSS()`

Returns the full registry keyed by `'componentName/source'`:

```js
const all = getAllComponentCSS();
// {
//   'Button/@myorg/ui': '.Button_btn_a1b2c { ... }',
//   'Card/@myorg/ui':   '.Card_card_d3e4f { ... }',
//   'MyHostCard/host':  '.MyHostCard_root_x7y8z { ... }'
// }
```

The `source` is the library name (or `'host'` for host-registered CSS).

## `generateCombinedCSS()`

Returns a single concatenated CSS string. Useful for production bundling or static export:

```js
const css = generateCombinedCSS();
// `.Button_btn_a1b2c { ... }\n\n.Card_card_d3e4f { ... }`
```

## `updateComponentCSS(componentName, cssRule, source?)`

For HMR: replace one component's CSS at runtime.

```js
import { updateComponentCSS } from '@peter.naydenov/vite-plugin-morph/client';
updateComponentCSS('Button', '.Button_btn_xxx { background: red; }', '@myorg/ui');
```

Source defaults to `'host'`. The dev server calls this under the hood when CSS HMR fires.

## `detectEnvironment()`

Returns `'development' | 'build' | 'library'`. Detected by inspecting `window.__MORPH_CONFIG__` and the build environment.

## `getMorphConfig()` / `setMorphConfig(config)`

Get or override the runtime config. Shape:

```ts
{
  environment: 'development' | 'build' | 'library';
  css: string;
  themes: string[];
  defaultTheme: string;
  themeUrls: Record<string, string>;
  cssUrls: string[];
  libraryName?: string;
  componentsCSS?: Record<string, string>; // { componentName: '.scoped { ... }' }
}
```

Most apps don't need to touch this. Override it when embedding a library into a non-Vite shell (Storybook, custom bundlers, etc.).

## Global storage layout

The runtime uses a small set of `window.__MORPH_*` globals. Touch them only through the API above.

```
window.__MORPH_CONFIG__           // current MorphConfig
window.__MORPH_COMPONENTS_CSS__   // { 'Name/source': '.scoped { ... }' }
window.__MORPH_THEMES__           // { '@lib/name': { light: {...}, dark: {...} } }
window.__MORPH_THEME_REGISTRY__   // [{ libraryName, themes, defaultTheme }]
```

## Lifecycle — what to call when

1. **App boot** — `applyStyles()` once. Don't call it on every render.
2. **Theme switch** — `themesControl.set(name)`. The runtime walks the registry and updates live styles.
3. **Host registers its own CSS** — `registerComponentCSS(name, rule)` before `applyStyles()`.
4. **HMR fires** — the dev server calls `updateComponentCSS` automatically; the consumer's app code doesn't need to do anything.
5. **Production build** — `applyStyles()` loads `cssUrls`. No need to call `generateCombinedCSS()` unless you're doing a custom static export.

## Common mistakes

- **Calling `applyStyles()` in a render loop.** It's idempotent but wasteful. Call it once.
- **Reading `window.__MORPH_*` directly.** The API exposes everything you need; the globals are an internal contract.
- **Forgetting `applyStyles()` in the host.** Library components render, but their CSS is missing — components look unstyled. The fix is one call on boot.
- **Re-registering CSS on every render.** `registerComponentCSS` is idempotent but redundant; call it once at module init.
