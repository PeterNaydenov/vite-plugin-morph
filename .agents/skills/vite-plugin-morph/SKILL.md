---
name: vite-plugin-morph
description: |
  Help developers use the `@peter.naydenov/vite-plugin-morph` library correctly.
  Use this skill when the user is creating/editing `.morph` files, configuring
  the Vite plugin, working with the CSS layers / modules / tree-shaking
  system, using template helpers, building a component library, or using the
  client runtime API (`applyStyles`, `themesControl`, etc.).

  Load this skill when the user mentions: "morph file", ".morph", "vite-plugin-morph",
  "morph template", "morph CSS layers", "morph CSS modules", "morph helpers",
  "morph handshake", "build a component library with morph", or asks to
  "set up morph" / "configure the plugin" / "use scoped CSS in morph".

  Do NOT load this skill for: plain Vue/React/Svelte components, generic Vite
  plugin development unrelated to this library, or general HTML/CSS questions.
---

# vite-plugin-morph

`@peter.naydenov/vite-plugin-morph` compiles `.morph` files into ES modules.
A `.morph` file is **NOT** a Vue/React/Svelte component — it is a single
template + helpers + scoped CSS + JSON handshake. The plugin returns a render
function plus scoped CSS exports; the host app or runtime applies the CSS.

## Inputs to collect

Before writing code, confirm:

- The user wants a **single component file** (most common) → use the four-section `.morph` format.
- The user wants a **distributable library** of `.morph` components → use Library Mode (`buildLibrary`).
- The user wants to **consume a library** of `.morph` components in a host app → use the client runtime API.
- The user's Vite version (peer dep: `vite ^8.0.0`).

## Mental model — read this first

A `.morph` file has four sections, in this order:

1. **Template** — HTML with `{{placeholder}}` slots and `{{key : helper}}` helpers.
2. **`<script>`** — helper **functions** (`function foo({data}){...}`) and helper **templates** (`const foo = \`...\``). NOT a stateful component class.
3. **`<style>`** — CSS, automatically scoped to the file (CSS modules). Wrap in `@layer` blocks for cascade control.
4. **`<script type="application/json">`** — the **handshake**: the default data object the template renders against. Trailing-comments and single-quote keys are allowed.

The default export is a **render function** that takes `(renderKey, data)` and returns an HTML string. The named export `styles` exposes the scoped class names; the named export `handshake` exposes the JSON data.

Full file format, helper syntax, and trade-offs: see `references/morph-file-format.md`.

## Procedure — creating a `.morph` file

> **Placeholder syntax convention:** write placeholders without internal
> spaces — `{{title}}` and `{{title : truncate}}`. Add spaces only when you
> need to separate the helper from a placeholder name (`{{items : [] : itemTpl}}`).

1. **Identify the four sections the component needs.** Every file needs the template. Script is only needed if the template uses helpers or you want to extract logic. Style is only needed if you have scoped CSS. Handshake is the default data; omit it only if the host always passes data.
2. **Write the template first** as plain HTML. Use `{{key}}` for direct data binding, `{{key : helperName}}` to run data through a helper.
3. **Add helper functions or helper templates in the script section.** Helpers receive `{ data, dependencies }`. To emit a CSS class from a helper — including modifier classes like `{{size}}` or `{{variant}}` — read the scoped class from `dependencies.styles.<className>` and return that. Never interpolate a consumer's raw `{{variant}}` string into `class="…"`; the scoper renames CSS selectors but does not rewrite `class` attributes, so a literal string won't match a renamed selector.
4. **Write the style section** in plain CSS. The plugin scopes every class selector by appending a unique hash. Wrap rules in `@layer` blocks **only when the component participates in a multi-file cascade** (e.g. it's part of a design system with shared layer order). For a standalone one-off component, scoping alone is enough and `@layer` is noise.
5. **Add the handshake JSON** for default/demo data. You can use `//` line comments and `/* */` block comments inside the handshake, plus single-quoted keys and trailing commas. The plugin tree-shakes unused component CSS based on which components are imported, so demo CSS is fine to leave in.
6. **Import the default export** in the host app and call it with `(renderKey, data)`. Import `styles` only if the consumer's own code needs to read scoped class names.
7. **Verify the dev server picks it up.** HMR updates templates, helpers, and styles live — no reload needed.

Why this order: scoping depends on what the template references, so writing the template first avoids renaming classes after the fact. Helpers depend on the data shape, so writing the template (which uses the data) clarifies that. The `@layer` question is a layering-of-concerns call — solve it last, after the file works without it.

## Procedure — configuring the Vite plugin

1. Add to `vite.config.js`:
   ```js
   import morphPlugin from '@peter.naydenov/vite-plugin-morph';
   export default { plugins: [morphPlugin(options)] };
   ```
2. Pick the `hashMode`: `'development'` (default, stable class names) or `'production'` (content-based, better cache busting). Switching modes in dev is fine; in prod, content-based is recommended.
3. Enable CSS features per-need:
   - `css.layers.enabled: true` — for `@layer` cascade control.
   - `css.modules.enabled: true` (default) — for class scoping.
   - `css.treeShaking.enabled: true` — drop unused component CSS.
   - `css.postcss.{autoprefixer,minify,sourceMaps}` — production cleanup.
4. For design-system globals (CSS variables, resets), set `globalCSS: { directory: 'src/styles', include: ['**/*.css'] }` and put pure CSS files in that dir.
5. For errors, set `errorHandling: { failOnError: true, showLocation: true }` to get file/line/offset in failures.
6. Test with `npm test` and `npm run lint` (the project standard).

Full option list: see `references/plugin-config.md`.

## Procedure — CSS layers, modules, tree-shaking

1. **Use `var(--token, fallback)` for every value that should be themeable.** This is the single most important theming habit; every other CSS rule depends on it.
2. **Add `@layer` blocks only when the component joins a multi-file cascade.** Wrap shared resets/tokens/components/utilities in the host's `globalCSS` directory; in the component itself, only wrap if your `<style>` is contributing to a shared layer order. For a standalone component, `@layer` is organizational noise.
3. **Don't write per-component global classes** (`.btn` everywhere). If two components need the same name, let the scoper give them different hashes — or move the shared rule into `globalCSS`.
4. **For libraries, see `references/library-mode.md` — CSS ownership and processing differ.** Libraries ship raw CSS, the host processes it.
5. **Verify tree-shaking** by importing only the components you use and checking the bundle.

Details, layer ordering, and chunking options: see `references/css-system.md`.

## Procedure — Library Mode (publishing `.morph` components)

1. Create a `scripts/build-library.js` that calls `buildLibrary({ entry, library: { name, version } })`.
2. The `entry` file re-exports each component's default export plus re-exports the runtime helpers (`applyStyles`, `themesControl`, etc.) from `@peter.naydenov/vite-plugin-morph/client`.
3. CSS is **not processed by the library** — it's shipped as raw assets and the host app processes it with its own plugin config.
4. Consumers call `applyStyles()` once on app boot, then render components normally. `themesControl.set('dark')` switches themes across libraries.

Full library-mode flow, host integration, and theme registry: see `references/library-mode.md`.

## Procedure — using the client runtime API

1. `import { applyStyles, themesControl, ... } from '@peter.naydenov/vite-plugin-morph/client'`.
2. Call `applyStyles()` once on app boot (dev: per-component `<style>` tags; build/library: combined bundle).
3. Use `themesControl.list()`, `themesControl.set(name)`, `themesControl.getCurrent()` for theme switching.
4. For host-app components that should join the same CSS registry, use `registerComponentCSS(name, cssRule)` so `applyStyles` picks them up.

Full API list and global storage layout: see `references/runtime-api.md`.

## Output contract

When asked to write a `.morph` file, the deliverable is one file with:

- A template using `{{key}}` and/or `{{key : helper}}` placeholders.
- A `<script>` block only if the template uses helpers.
- A `<style>` block only if the component needs CSS.
- A `<script type="application/json">` handshake only if the user wants default/demo data.

When asked to configure the plugin, the deliverable is one `vite.config.js` snippet using the documented option keys, plus the matching package version in `package.json` (`@peter.naydenov/vite-plugin-morph` + `vite ^8.0.0`).

When asked for a library, the deliverable is a `scripts/build-library.js`, an `src/main.js` re-exporting components and runtime helpers, and a host-app integration snippet.

## Failure handling

- **Class names don't match between template and CSS**: the scoper renamed something. Read the actual scoped name from `dependencies.styles` in the helper, not from the raw `.morph` source.
- **CSS not applied in production**: tree-shaking dropped it. Check that the component is actually imported, or disable `css.treeShaking.enabled` to confirm.
- **Helpers can't see data**: helpers receive `{ data, dependencies }` — the `data` key is the current context, not the whole handshake. For the whole handshake, define a top-level helper that reads it.
- **HMR doesn't pick up style changes**: ensure `development.cssHmr: true` (default true) and that the host is not a build-mode preview.
- **Build fails on a CSS error**: set `errorHandling.cssErrors: true` for line/offset, or read the file location printed in the error.
- **Library consumer can't see CSS**: the host must call `applyStyles()` and configure the plugin on the host side — libraries ship raw CSS, the host processes it.

## Anti-patterns — things AI agents do wrong with this library

- **Treating `.morph` like a Vue SFC.** No `<template setup>`, no reactive state, no `defineProps`. A `.morph` file is a static template + helpers + CSS + data.
- **Adding a top-level `import` or `export` to the script section.** The script section only contains helper function/template declarations. Imports/exports go in the consumer's `main.js`, not in `.morph` files.
- **Generating scoped class names by hand.** Let the plugin scope them. The helper receives the actual names via `dependencies.styles`.
- **Interpolating CSS class names directly into the template.** `class="card {{variant}}"` is a silent bug — the consumer's string ends up in `class="card elevated"` while the CSS selector is `.Card_card_hash.Card_elevated_hash`. The scoper does not rewrite class attributes. To apply a scoped class, return it from a helper that reads `dependencies.styles.<name>`.
- **Wrapping every value in `{{ }}`.** Plain text doesn't need braces. `{{key}}` is only for placeholders that should be substituted.
- **Filling the handshake with production data.** It's default/demo data. Real apps pass data to the render call.
- **Hardcoding colors in component CSS.** Use `var(--token, fallback)` so consumers can theme.
- **Wrapping every component in `@layer` "just because".** `@layer` is for organizing cross-file cascade order. A single standalone component doesn't need it; scoping already isolates the rules.
- **Reaching for `!important` to fight scoping.** Scoping is deterministic — find the right selector and use it.

## Examples

**Example 1 — A simple user card**

```html
<!-- UserCard.morph -->
<div class="user-card {{size : getSizeClass}}">
  <h3 class="name">{{name : formatName}}</h3>
  <p class="email">{{email}}</p>
</div>

<script>
function formatName({ data }) {
  return data.name.charAt(0).toUpperCase() + data.name.slice(1);
}

function getSizeClass({ data, dependencies }) {
  const styles = dependencies.styles || {};
  return styles[data.size] || '';
}
</script>

<style>
.user-card {
  background: var(--card-bg, #fff);
  border-radius: var(--card-radius, 8px);
  padding: var(--card-padding, 1rem);
}
.user-card.small { padding: 0.5rem; }
.user-card.large { padding: 1.5rem; }
.name { color: var(--name-color, #333); }
</style>

<script type="application/json">
{ "name": "ada lovelace", "email": "ada@example.com", "size": "small" }
</script>
```

```js
// consumer
import UserCard from './UserCard.morph';
const html = UserCard('view', { name: 'ada lovelace', email: 'ada@example.com', size: 'small' });
```

**Example 2 — Plugin config with layers and tree-shaking**

```js
// vite.config.js
import morphPlugin from '@peter.naydenov/vite-plugin-morph';
export default {
  plugins: [
    morphPlugin({
      hashMode: 'production',
      globalCSS: { directory: 'src/styles', include: ['**/*.css'] },
      css: {
        layers: { enabled: true, order: ['vendors', 'libs', 'modules', 'app', 'context'] },
        treeShaking: { enabled: true },
        postcss: { autoprefixer: true, minify: true, sourceMaps: true },
      },
      errorHandling: { failOnError: true, showLocation: true, cssErrors: true },
    }),
  ],
};
```

## References

- `references/morph-file-format.md` — full syntax of the four sections, helper types, scoping rules
- `references/plugin-config.md` — every `MorphPluginOptions` field with defaults
- `references/css-system.md` — layers, modules, tree-shaking, chunking, HMR
- `references/library-mode.md` — `buildLibrary`, host integration, theme registry
- `references/runtime-api.md` — client API (`applyStyles`, `themesControl`, `registerComponentCSS`, …)

## External docs (for the model, not the user)

- Library README: `README.md` in this repo — full option list and feature tour
- Library mode deep-dive: `LIBRARY_MODE.md` in this repo
- Helper syntax deep-dive: `HELPERS_GUIDE.md` in this repo
- Transformation examples: `docs/morph-transformation.md` in this repo
- VS Code extension: `PeterNaydenov.morph-template-syntax-highlighting` (mentioned in `README.md`)
- Upstream Morph library: `https://github.com/peter-naydenov/morph`
