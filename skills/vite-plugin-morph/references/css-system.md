# CSS: scoping, layers, global CSS, themes

## Contents
- Scoping rules
- Where component CSS goes
- Cascade layers
- Global CSS
- Themes
- PostCSS
- Content-Security-Policy
- Options that don't affect the app

## Scoping rules

Every class in a component's `<style>` gets a per-file name
`<FileName>_<class>_<hash>`, e.g. `.btn` in `Button.morph` → `.Button_btn_w4lcs`.
With the default `hashMode: 'development'` (in dev **and** build), the hash
depends only on the file and class names, so it is stable across builds.
`hashMode: 'production'` hashes the rule's content.

Write CSS the scoper understands:

- **Start every selector with a class.** `.nav .link` and `.card:hover` are
  scoped. `nav .link` and `div.card` are left unscoped (global!), and the
  template is not rewritten for them.
- **Hyphenate class names** (`card-title`, `btn--active`). A name with two or
  more underscores ending in a short segment (`btn_size_s`, `block__el_mod`)
  is taken as already scoped and left alone.
- **Keep component file names unique** across the project. `a/Card.morph` and
  `b/Card.morph` produce the same class names and the same `<style>` id, so one
  overwrites the other.
- Tags, IDs, `:root` variables and `@keyframes` are never renamed.
- `:global(.x)` keeps `.x` unscoped. Once a class appears in `:global()`, it is
  unscoped everywhere in that file.

In the template, write the authored class name. Static `class="card"` renders as
`class="Card_card_t2wwj card"`: the scoped name plus the unscoped **light label**.
A class produced by a placeholder is inserted as-is, so map it with a helper
(`styles[data]`). Never paste a hashed name into the template or into consumer code.
Read it from the module's `styles` export.

## Where component CSS goes

Importing a compiled component injects its CSS into
`<style id="morph-css-<FileName>">`, wrapped in `@layer modules` (or
`@layer libs` when the `.morph` file lives under `node_modules`). This happens in
dev and in builds. There is no separate CSS file to link, and a component that is
never imported contributes no CSS, through Vite's normal tree-shaking.

## Cascade layers

The model, lowest to highest precedence:

| Layer | Holds | Selectors |
| --- | --- | --- |
| `vendors` | Third-party CSS | anything |
| `libs` | Components from `.morph` files in `node_modules` | hashed classes (automatic) |
| `modules` | The app's own components | hashed classes (automatic) |
| `app` | Global CSS (automatic), brand overrides, theme variables | light labels: `.btn` |
| `context` | Situational overrides | light labels: `.sidebar .btn` |

- The plugin wraps component and global CSS **itself**. Never write `@layer` in a
  component `<style>`: `@layer app { … }` there becomes the nested layer
  `modules.app`, not `app`.
- The plugin does **not** declare the layer order on the page. Without a
  declaration, the order is whichever `<style>` names each layer first. Declare it
  once, before any script runs:

  ```html
  <!-- index.html, inside <head> -->
  <style>@layer vendors, libs, modules, app, context;</style>
  ```

- Override a component from the `app` or `context` layer by targeting its light
  label. That wins without `!important` or extra specificity:

  ```css
  @layer app { .btn { border-radius: 999px; } }
  @layer context { .sidebar .btn { padding: 0.25rem; } }
  ```

`css.layers.enabled: false` turns off all the automatic wrapping.

## Global CSS

On by default: `globalCSS: { directory: 'src/styles', entry: 'main.css', include: ['**/*.css'] }`.
Global CSS is wrapped in `@layer app` and applied by `applyStyles()` from
`@peter.naydenov/vite-plugin-morph/client`. **Call `applyStyles()` once at app
start**, or global CSS and the default theme never reach the page.

The dev server serves only the entry file, with its `@import`s inlined. A build
reads every included file and also inlines imports, so an imported file ends up
twice. Keep dev and build identical by importing everything from the entry and
including only the entry:

```js
morphPlugin({ globalCSS: { include: ['main.css'] } })
```

```css
/* src/styles/main.css */
@import './tokens.css';
@import './reset.css';
```

## Themes

One CSS file per theme in `src/themes/` (`light.css`, `dark.css`), each defining
CSS variables. Components read them with `var(--token, fallback)`. Switch at
runtime with `themesControl.set('dark')` (see `runtime-api.md`). `applyStyles()`
applies `themes.defaultTheme` (default `'default'`, so name a file `default.css`
or set the option). The folder is `localThemes.directory`.

## PostCSS

Always on: `postcss-import` (relative to the `.morph` file) and `postcss-nested`
(`&:hover`). `autoprefixer` is on by default. `minify` (cssnano) is off by
default. CSS source maps are inline and exist only under the dev server.

A CSS syntax error does **not** fail the build. The plugin logs an error and
ships the CSS unprocessed. Run `check-morph.mjs`, which reports it as an error.

## Content-Security-Policy

All plugin CSS reaches the page through inline `<style>` elements: components,
global CSS and themes. The plugin never emits `<link rel="stylesheet">`, and it
has no nonce support. A strict CSP therefore needs `style-src 'unsafe-inline'`.
For a host that can't allow that, keep component `<style>` blocks empty, import
plain `.css` files from JavaScript (Vite emits them as linked files), and style
with those class names. That gives up scoping.

## Options that don't affect the app

`css.treeShaking`, `css.bundling` and `css.chunking` only control a side file
(`dist/components/components.css` and chunk files) that the app never loads.
Real CSS elimination comes from Vite dropping unimported modules. Leave these
options at their defaults.
