# Plugin configuration — full reference

The plugin is configured by passing a `MorphPluginOptions` object to `morphPlugin(options)`. Every field is optional; sensible defaults are baked in.

## Top-level fields

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `hashMode` | `'development' \| 'production'` | `'development'` | How scoped CSS class names are generated. `'development'`: stable, name-based (no template re-render on style change). `'production'`: content-based, optimal for cache busting. |
| `globalCSS` | `{ directory, include?, exclude? }` | off | Treat plain `.css` files in `directory` as design-system globals. `include` / `exclude` use glob patterns. |
| `production` | `{ removeHandshake?, minifyCSS? }` | off | Production-time optimizations. `removeHandshake` strips the JSON demo data from output. `minifyCSS` re-minifies scoped CSS. |
| `development` | `{ sourceMaps?, hmr?, cssHmr? }` | on | Dev-time ergonomics. `cssHmr` enables live CSS updates without reload. |
| `errorHandling` | `{ failOnError?, showLocation?, maxErrors?, cssErrors? }` | off | Make failures loud and actionable. `cssErrors: true` enables line/offset for CSS errors. |
| `css` | object | on | CSS subsystem configuration. See below. |
| `themes` | `{ enabled?, directories?, defaultTheme?, watch?, outputDir? }` | on | Local theme discovery/output config for the plugin's own project — see `setup-component-library.md`. `defaultTheme` names which discovered theme is the default; it's inherited by `library.defaultTheme` when packaging with `buildLibrary()` unless overridden (see `library-mode.md`). |

## `css.*` fields

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `css.enabled` | boolean | `true` | Master switch for CSS processing. |
| `css.postcss.autoprefixer` | boolean | `true` | Add vendor prefixes. |
| `css.postcss.minify` | boolean | `true` (prod) | Minify with `cssnano`. |
| `css.postcss.sourceMaps` | boolean | `true` (dev) | Emit CSS source maps. |
| `css.modules.enabled` | boolean | `true` | Scoped class names. |
| `css.modules.generateScopedName` | string | (file-class-hash) | Custom scoper (advanced). |
| `css.layers.enabled` | boolean | `true` | Honor `@layer` declarations in component CSS. |
| `css.layers.order` | string[] | `['vendors','libs','modules','app','context']` | Layer cascade order. |
| `css.treeShaking.enabled` | boolean | `true` | Drop CSS for unimported components. |
| `css.bundling.enabled` | boolean | `true` | Bundle scoped CSS into per-component exports. |
| `css.bundling.outputDir` | string | `'dist/components'` | Where bundling artifacts are written (when applicable). |
| `css.chunking.enabled` | boolean | `false` | Split large CSS bundles into chunks. |
| `css.chunking.strategy` | `'size' \| 'category' \| 'manual'` | `'size'` | Chunking strategy. |
| `css.chunking.maxChunkSize` | number | `50 * 1024` | Max chunk size in bytes. |
| `css.outputDir` | string | (vite build output) | Override CSS output directory. |
| `css.debug.enabled` | boolean | `false` | Emit CSS processing logs. |
| `css.debug.verbose` | boolean | `false` | Verbose CSS logs. |
| `css.debug.showSourceMaps` | boolean | `false` | Log source map info per component. |

## Minimal config — most projects

```js
morphPlugin({
  hashMode: 'production',
  css: {
    postcss: { autoprefixer: true, minify: true },
    treeShaking: { enabled: true },
  },
})
```

## Library-author config

When building a library (see `library-mode.md`), use:

```js
morphPlugin({
  production: { removeHandshake: false }, // keep demo data for library users
  css: { enabled: true, treeShaking: { enabled: false } }, // host does the tree-shaking
})
```

The library plugin config and the host plugin config are independent — they don't need to match.

## Consumer (host app) config

The host app is where the heavy CSS work happens:

```js
morphPlugin({
  hashMode: 'production',
  globalCSS: { directory: 'src/styles', include: ['**/*.css'] },
  css: {
    layers: { enabled: true, order: ['vendors','libs','modules','app','context'] },
    postcss: { autoprefixer: true, minify: true, sourceMaps: false },
    treeShaking: { enabled: true },
  },
  errorHandling: { failOnError: true, showLocation: true, cssErrors: true },
})
```

## Reading errors

When `errorHandling.cssErrors: true` is set, the error format is:

```
❌ CSS processing failed: <message>
   📍 Location: <file>:<line>:<column>
   📍 Offset: <char-offset>
```

Use the file/line to jump to the offending rule.
