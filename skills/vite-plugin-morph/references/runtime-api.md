# Client runtime (`@peter.naydenov/vite-plugin-morph/client`)

## Contents
- What needs the runtime
- applyStyles / applyGeneralStyles
- themesControl
- Component CSS registry
- Environment and config
- Globals

## What needs the runtime

Component CSS doesn't. Every compiled `.morph` module injects its own
`<style id="morph-css-<Name>">` when imported. The runtime is for **themes**,
**general (global) CSS**, and registering CSS from non-`.morph` code.

```js
import {
  applyStyles, applyGeneralStyles, themesControl,
  registerComponentCSS, getAllComponentCSS, generateCombinedCSS, updateComponentCSS,
  detectEnvironment, getMorphConfig, setMorphConfig,
} from '@peter.naydenov/vite-plugin-morph/client';
```

For local theme files of a single project there is also `themeRuntime` /
`getThemeRuntime` from `@peter.naydenov/vite-plugin-morph/browser` (same method
names as `themesControl`, minus `listForLibrary`).

## applyStyles / applyGeneralStyles

Call `applyStyles()` once at app start. It returns a Promise. What it does by
environment (`detectEnvironment()`):

| Environment | `applyStyles()` |
| --- | --- |
| `development` | Injects every registered component CSS, the default theme, and general CSS (fetched from the dev server) |
| `build` | Applies the default theme and the general CSS embedded at build time. Fetches `componentCssUrl` into a `<style>` only if set through `setMorphConfig` |
| `library` | Injects the library's `componentsCSS` (in `@layer modules`, as each component already did) and its default theme. General CSS is **not** applied |

`applyGeneralStyles()` applies only general CSS. Do not call it alongside
`applyStyles()` in your own app, which already does it (in dev it would fetch
twice). Call it for an imported library whose global styles you want:
`import { applyGeneralStyles } from '@myorg/ui/client'`. Each library's general
CSS gets its own `<style id="morph-css-general-<library>">`, so several can
coexist.

## themesControl

| Method | Behaviour |
| --- | --- |
| `list()` | Theme names across all registered libraries (deduplicated) |
| `listForLibrary(name)` | Themes of one library (`[]` if unknown) |
| `set(name)` | Applies the theme to the host and every library that has it. Returns how many it applied to (`0` = nothing happened) |
| `getCurrent()` | Last theme `set()` applied, else the configured default |
| `getDefault()` | Configured default (`'default'` if none) |
| `setDefault(name)` | Makes `name` the default and applies it. Returns `false` if `name` isn't in `list()` |
| `has(name)` | Whether `list()` contains `name` |

A theme is a `<style id="morph-theme-<library>">` holding `:root { --vars }`.

## Component CSS registry

For CSS that should join the same registry as components (e.g. host code that is
not a `.morph` file):

```js
registerComponentCSS('HostCard', '.HostCard_root { padding: 1rem; }');
```

- Injects the `<style>` immediately and stores it under the key `'HostCard/host'`.
- `getAllComponentCSS()` → `{ 'Name/source': cssText }`. The source is the
  library name, `'host'`, or `'library'`.
- `generateCombinedCSS()` → all registered CSS joined with blank lines.
- `updateComponentCSS(name, css, source = 'host')` replaces one entry.

The style element id is `morph-css-<Name>` without the source, so two
same-named components from different sources share one element.

## Environment and config

`detectEnvironment()` returns `'development'` (when `import.meta.hot` exists),
`'library'` or `'build'`. A `config.environment` set with `setMorphConfig` takes
precedence.

`setMorphConfig(partial)` shallow-merges into a module-level config (not on
`window`). Override it only to embed a library in a non-Vite shell. Fields the
runtime reads:

```ts
{
  environment?: 'development' | 'build' | 'library';
  defaultTheme?: string;
  libraryName?: string;
  generalCss?: string;                     // general CSS as text
  globalCSS?: { directory: string; entry: string };
  componentsCSS?: Record<string, string>;  // { ComponentName: css } — registered, not injected
  componentCssUrl?: string;                // fetched into a <style>
}
```

## Globals

Internal. Read and change them only through the API above:
`window.__MORPH_COMPONENTS_CSS__`, `__MORPH_THEMES__` (theme contents per
library), `__MORPH_THEME_REGISTRY__` (list of libraries and their themes).
