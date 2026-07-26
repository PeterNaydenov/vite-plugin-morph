# Runtime API (`@peter.naydenov/vite-plugin-morph/client`)

The client entry exposes the runtime helpers used by host apps, library consumers, and host-side components that need to participate in the same CSS / theme registry as library components.

## Import surface

```js
import {
  applyStyles,
  applyGeneralStyles,
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

## Two kinds of CSS, two loading rules

- **Component CSS** always travels with its component — the moment you import/render a component, its scoped CSS comes along automatically via `applyStyles()`. No separate opt-in.
- **General/global CSS** (project-wide base styles, tokens — the `app` layer) is a separate, explicit, per-source choice. It's applied via `applyGeneralStyles()`, not bundled into `applyStyles()`'s automatic behavior for imported libraries — so a host combining several libraries can choose which one(s) general CSS to load, avoiding conflicting global styles from the others. For the current project's own general CSS, call it once at boot alongside `applyStyles()`.

## `applyStyles()`

Applies component CSS based on the current environment. Call once on app boot.

- **development** — injects per-component `<style>` tags into `<head>`. Idempotent.
- **library** — registers the library's `componentsCSS` and writes `<style>` tags for them.
- **build** — same as library mode: writes `<style>` tags from whatever `componentsCSS`/`generalCss` were embedded at build time, or from `componentCssUrl` if explicitly set via `setMorphConfig()` (rare — for non-Vite shells).

Never uses `<link>` tags in any mode.

```js
import { applyStyles } from '@peter.naydenov/vite-plugin-morph/client';
applyStyles();
```

## `applyGeneralStyles()`

Applies general/global CSS — see "Two kinds of CSS" above.

- **development** — fetches live from the dev server (`/@morph-css/local/...`), HMR-friendly.
- **build** (host's own project) / **library** — the general CSS text was embedded at build time (same technique as themes); applies it directly, no network request, no `<link>` tag.
- When called on an imported library, the style element is scoped by `libraryName` so multiple libraries' general CSS can coexist without one overwriting another.

```js
import { applyStyles, applyGeneralStyles } from '@peter.naydenov/vite-plugin-morph/client';
applyStyles();          // this project's/library's component CSS + theme — automatic
applyGeneralStyles();   // this project's own general CSS — always wanted for your own project

// Consuming one or more libraries:
import { applyGeneralStyles as libAGeneral } from '@myorg/lib-a';
import { applyGeneralStyles as libBGeneral } from '@myorg/lib-b';
libAGeneral();  // take lib-a's general CSS as the base theme...
// ...but skip libBGeneral() — just use lib-b's components, not its global styles
```

## `themesControl`

Runtime theme switching across libraries — the **consumption-mode** theme API, for a host app combining one or more published libraries. See also the **local-mode** counterpart, `themeRuntime`/`getThemeRuntime` (`@peter.naydenov/vite-plugin-morph/browser`, documented in `setup-component-library.md`), for a single project working with its own local theme files. Both share the same method vocabulary; `themesControl` additionally has `listForLibrary()`.

```js
themesControl.list();           // all themes known across all registered libraries
themesControl.listForLibrary('@myorg/ui');  // themes for one library
themesControl.set('dark');      // apply a theme; cascades to all libraries
themesControl.getCurrent();     // active theme name
themesControl.getDefault();     // configured default theme's name
themesControl.setDefault('light');  // designate a new default and apply it
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

Returns `'development' | 'build' | 'library'`. Detected via `import.meta.hot` (dev) and the `window.__MORPH_LIBRARY_MODE__` flag (library) — there is no `window.__MORPH_CONFIG__` global.

## `getMorphConfig()` / `setMorphConfig(config)`

Get or override the runtime config, held in a module-level variable (not on `window`). Shape (fields actually read by the runtime):

```ts
{
  environment?: 'development' | 'build' | 'library';
  generalCss?: string;          // this project's/library's general CSS, embedded as text
  themes?: string[];
  defaultTheme?: string;
  libraryName?: string;
  componentsCSS?: Record<string, string>; // { componentName: '.scoped { ... }' }
  componentCssUrl?: string;     // rare escape hatch for non-Vite shells
}
```

Most apps don't need to touch this. Override it when embedding a library into a non-Vite shell (Storybook, custom bundlers, etc.).

## Global storage layout

The runtime uses a small set of `window.__MORPH_*` globals (populated as-needed, not eagerly). Touch them only through the API above.

```
window.__MORPH_COMPONENTS_CSS__   // { 'Name/source': '.scoped { ... }' }
window.__MORPH_THEMES__           // { '@lib/name': { light: {...}, dark: {...} } }
window.__MORPH_THEME_REGISTRY__   // [{ libraryName, themes, defaultTheme }]
window.__MORPH_LIBRARY_MODE__     // boolean flag set by library builds
```

## Lifecycle — what to call when

1. **App boot** — `applyStyles()` once, plus `applyGeneralStyles()` if you want general CSS applied (your own project's always; an imported library's only if you want its global styles). Don't call either in a render loop.
2. **Theme switch** — `themesControl.set(name)`. The runtime walks the registry and updates live styles.
3. **Host registers its own CSS** — `registerComponentCSS(name, rule)` before `applyStyles()`.
4. **HMR fires** — the dev server calls `updateComponentCSS` automatically; the consumer's app code doesn't need to do anything.
5. **Production build / library** — `applyStyles()`/`applyGeneralStyles()` apply CSS that was embedded as text at build time; no network request is involved. `componentCssUrl` remains available as a manual override for non-Vite shells.

## Common mistakes

- **Calling `applyStyles()` in a render loop.** It's idempotent but wasteful. Call it once.
- **Reading `window.__MORPH_*` directly.** The API exposes everything you need; the globals are an internal contract.
- **Forgetting `applyStyles()` in the host.** Library components render, but their CSS is missing — components look unstyled. The fix is one call on boot.
- **Re-registering CSS on every render.** `registerComponentCSS` is idempotent but redundant; call it once at module init.
- **Assuming `applyStyles()` also applies a library's general CSS.** It doesn't — general CSS is opt-in per library via `applyGeneralStyles()`. If a library's base/global styles seem to be missing, that's expected until you call its `applyGeneralStyles()` explicitly.
