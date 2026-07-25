# CSS system — layers, modules, tree-shaking

The plugin turns every `.morph` file's `<style>` block into a **scoped CSS module**, optionally wrapped in `@layer` blocks, optionally tree-shaken when the component isn't imported. This is the source of the library's CSS power — understand it before you reach for overrides.

## 1. Scoping (CSS modules)

Every class selector inside a `<style>` block is rewritten to include the file's component name and a stable hash:

```css
/* in Button.morph */
.btn { background: blue; }
.btn.primary { background: navy; }
```

becomes (in the consumer's bundle):

```css
.Button_btn_a1b2c { background: blue; }
.Button_btn_a1b2c.Button_btn_primary_d3e4f { background: navy; }
```

- The hash is content-based in `production` mode, name-based in `development` mode (so dev edits don't churn the hash and don't require re-rendering the template).
- Multiple classes combined into a single selector keep their relationship (both get the same component prefix).
- Tag selectors, ID selectors, and CSS variables are **not** renamed.

### How to use a scoped class from a template

In the template, use the **original** class name — the scoper rewrites both CSS and the `class="…"` lookup at the helper level. The helper sees the real scoped name via `dependencies.styles`:

```html
<button class="btn {{variant : getVariant}}">…</button>
```

```js
function getVariant({data, dependencies}) {
  return dependencies.styles['btn-primary'] || 'btn-primary';
}
```

> Don't paste the hashed class name into the template — it'll break on the next build.

### Escape hatch: `:global()`

To keep a class un-scoped (rare; usually a bad idea), wrap it in `:global(.foo)`.

## 2. CSS layers

`@layer` is a real CSS feature; the plugin doesn't fake it. Declared layers give you predictable cascade order regardless of CSS load order:

```css
@layer reset { * { box-sizing: border-box; } }
@layer global { :root { --primary: #007bff; } }
@layer components { .btn { background: var(--primary); } }
@layer utilities { .visually-hidden { /* … */ } }
```

With `css.layers.order: ['reset','global','components','utilities']`, the cascade is exactly that order, with later layers winning. A consumer can re-declare any layer to change the order without forking your library.

### When to use layers

- **When the component is part of a multi-file cascade** — a design system, a host app with a defined layer order, a library whose consumers will override. Wrap the component's rules in the appropriate layer (`components`, `utilities`, etc.) so cascade order is predictable across files.
- **When you anticipate theme overrides** — layers let a consumer drop a higher-precedence rule into a `global` or `utilities` layer without `!important`.

### When not to use layers

- **Standalone one-off components** that don't share a cascade with anyone. Scoping already isolates the rules; `@layer` is organizational noise here.
- **Inside a CSS-only `.morph` file used as a plain stylesheet** — wrap the whole block in `@layer` once, not per rule.
- If you find yourself fighting the cascade with `!important`, the layers are probably wrong — fix the order, don't add `!important`.

## 3. Tree-shaking

If `css.treeShaking.enabled: true` (default) and a component is **not imported anywhere**, its CSS is dropped from the bundle. This is the 30–70% bundle-size win the README cites.

### Verify tree-shaking

1. Comment out an `import Button from './Button.morph'` in your entry file.
2. Build with `vite build`.
3. Grep the output for a unique Button class — it should not appear.

### Pitfalls

- **Dynamic imports** (`import('./Button.morph')`) count as imports and keep CSS in. If you want the CSS gone, fully drop the import.
- **Side-effect imports** of CSS-only `.morph` files are tracked. If you `import './theme.morph'` and the file is CSS-only, the CSS is kept.
- **Library mode** disables tree-shaking on the library side (the host does it). See `library-mode.md`.

## 4. Global CSS variables

For design tokens, put plain `.css` files in a directory and register it with `globalCSS`:

```js
morphPlugin({
  globalCSS: { directory: 'src/styles', include: ['**/*.css'] },
})
```

```css
/* src/styles/tokens.css */
:root {
  --primary: #007bff;
  --btn-padding: 0.5rem 1rem;
}
```

Inside any component CSS, reference these via `var(--primary)`. If the global file isn't loaded yet (rare in dev), use `var(--primary, #007bff)` with a fallback.

## 5. PostCSS pipeline

`css.postcss` controls the final pass:

- `autoprefixer: true` — adds vendor prefixes.
- `minify: true` — runs `cssnano`.
- `sourceMaps: true` (dev) / `false` (prod) — emit CSS source maps.

The plugin uses `postcss-import` and `postcss-nested` automatically for `@import` and `&` nesting support.

## 6. CSS HMR

In dev with `development.cssHmr: true` (default), edits to a `<style>` block update without a full reload. Edits to the template or script section trigger a normal Vite module reload — the component re-renders with the new template.

## 7. Chunking (large apps)

If your CSS bundle gets large, enable chunking:

```js
css: { chunking: { enabled: true, strategy: 'size', maxChunkSize: 50 * 1024 } }
```

Strategies:

- `'size'` — split by byte size (default).
- `'category'` — split by layer / component category.
- `'manual'` — split by explicit markers in the CSS.

## 8. CSS debugging

```js
import { enableCssDebugging } from '@peter.naydenov/vite-plugin-morph';
enableCssDebugging({ verbose: true, showSourceMaps: true });
```

Or via the plugin: `css.debug: { enabled: true, verbose: true }`. Logs include per-component processing time, scoped class count, and minified size delta.
