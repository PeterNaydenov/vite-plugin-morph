# Plugin options

`morphPlugin(options)`. All options are optional and deep-merged with the
defaults, so `{ css: { postcss: { minify: true } } }` keeps every other default.

## Options that change behaviour

| Option | Default | Effect |
| --- | --- | --- |
| `logLevel` | `'info'` | `'debug'`, `'info'`, `'warn'`, `'error'` or `'silent'`. Use `'silent'` in tests/CI, `'debug'` to trace per-file processing |
| `hashMode` | `'development'` | Scoped class hash. `'development'`: from file + class name (stable). `'production'`: from rule content. Applies in dev and build; `NODE_ENV` doesn't change it |
| `production.removeHandshake` | `false` | `true` strips handshake data from `vite build` output. The dev server keeps it. Stripped modules export `handshake = {}` |
| `globalCSS.directory` | `'src/styles'` | Folder of global CSS (wrapped in `@layer app`) |
| `globalCSS.entry` | `'main.css'` | The only file the dev server serves |
| `globalCSS.include` / `exclude` | `['**/*.css']` / `[]` | Files read by a build. Set `include: ['main.css']` when the entry `@import`s the rest |
| `localThemes.directory` | `'src/themes'` | The app's theme files, one `.css` per theme |
| `themes.defaultTheme` | `'default'` | Theme applied by `applyStyles()` |
| `css.enabled` | `true` | `false` passes component CSS through raw: no scoping, no layers, no PostCSS |
| `css.layers.enabled` | `true` | Automatic `@layer modules`/`libs`/`app` wrapping |
| `css.modules.generateScopedName` | `'[name]_[local]_[hash:base64:5]'` | Class-name pattern. Only `[name]`, `[local]`, `[hash:base64:5]` are substituted (the hash is base36) |
| `css.postcss.autoprefixer` | `true` | Vendor prefixes |
| `css.postcss.minify` | `false` | cssnano on component CSS |
| `css.postcss.sourceMaps` | `true` | Inline CSS source maps, dev server only |
| `css.variablesFile` | — | CSS file imported by every component whose CSS uses `var()` (an HMR dependency) |
| `css.debug.enabled` / `verbose` | `false` | Extra CSS logs (`verbose` details need `logLevel: 'debug'`) |
| `errorHandling.failOnError` | `true` | Throw on invalid plugin options |

## Accepted, but no effect on the app

`production.minifyCSS`, `development.*` (including `cssHmr`),
`errorHandling.showLocation`/`maxErrors`/`cssErrors`, `themes.enabled`/`watch`/`outputDir`,
`css.modules.enabled`, `css.outputDir`, `css.debug.showSourceMaps`,
`css.layers.order`, `css.treeShaking.*`, `css.bundling.*`, `css.chunking.*`
(the last four only shape an unused side file, see `css-system.md`). Don't add
them to a config to get a behaviour.

## Typical app config

```js
// vite.config.js
import { defineConfig } from 'vite';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin({
      globalCSS: { include: ['main.css'] },
      production: { removeHandshake: true },
      css: { postcss: { minify: true } },
    }),
  ],
});
```

Development behaviour: editing any part of a `.morph` file that has a `<style>`
triggers a full page reload. A CSS error in a component is logged, not thrown.
The build still succeeds.
