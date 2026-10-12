# Library mode: publishing and consuming `.morph` components

## Contents
- Building a library
- What the build produces
- Consuming a library

## Building a library

```js
// scripts/build-library.js
import { buildLibrary } from '@peter.naydenov/vite-plugin-morph';

await buildLibrary({
  library: { name: '@myorg/ui', version: '1.0.0' },
});
```

```bash
node scripts/build-library.js
cd dist/library && npm publish
```

**`buildLibrary()` generates its entry module**: it exports every
`src/**/*.morph` component under its PascalCase name, plus a default object
holding all of them. You can't hand-write the library's exports. By default the
entry goes to a temporary directory, so `src/main.js` (often the demo app's
entry) is never touched. If you set `entry`, the generated module is written
there, and the build throws rather than overwrite a file it didn't generate.

| Option | Default | Notes |
| --- | --- | --- |
| `library.name` | — | **Required** (throws without it) |
| `library.version` | | Written to the generated `package.json` |
| `library.description`, `author`, `license` | | Same |
| `library.packageJson` | | Extra fields merged into the generated `package.json` |
| `library.defaultTheme` | first discovered theme | Default theme name |
| `entry` | temporary file | Where to write the generated entry (see above) |
| `outputDir` | `'dist/library'` | |
| `rootDir` | `process.cwd()` | |
| `themesDir` | `'src/themes'` | One `.css` file per theme |
| `hashMode` | `'development'` | Class-name hash mode for the shipped CSS |
| `morphPlugin` | | Only `themesDir`, `hashMode`, `stylesDir`, `themes.defaultTheme` and `css.postcss.autoprefixer` are read. Other plugin options don't reach the library compile |

Scoping happens once, here: the shipped components already carry hashed class
names (`Button_btn_w4lcs btn`), and nothing re-scopes them later.

## What the build produces

In `outputDir`:

| File | Content |
| --- | --- |
| `package.json` | Generated, with `"type": "module"`, `isMorphLibrary: true`, `peerDependencies: { "@peter.naydenov/morph": "^3.3.0" }`, and exports `.`, `./client`, `./themes/*`, `./assets/*` |
| `index.mjs` / `index.cjs` | All components (ESM / CJS), plus `applyStyles`, `themesControl` |
| `client.mjs` | `applyStyles`, `applyGeneralStyles`, `themesControl`, `__morphConfig__`. Registers the library's themes on load |
| `runtime.js` | The client runtime, copied |
| `assets/components.css` | All component CSS (unlayered) |
| `assets/*.css` | The library's general CSS (from `src/styles`) |
| `themes.json`, `themes/*.css` | Theme definitions |

Component CSS is autoprefixed (not minified), wrapped in `@layer modules`, and
embedded in each component's JS. Importing a component injects its CSS. The
library's `applyStyles()` re-injects the same layered CSS, so calling it is
harmless but unnecessary.

## Consuming a library

```js
import { Button } from '@myorg/ui';

document.querySelector('#app').innerHTML = Button('render', { label: 'Save', variant: 'primary' });
```

- Component CSS arrives with the import. No call is needed.
- The library's general CSS (resets, tokens) is opt-in per library:
  `import { applyGeneralStyles } from '@myorg/ui/client'; applyGeneralStyles();`.
  It is exported from `/client`, not from the package root.
- Themes: `import { themesControl } from '@myorg/ui'` and then
  `themesControl.set('dark')`. Method reference: `runtime-api.md`.
- Brand and context overrides go in `app`/`context` layer rules that target the
  unscoped light-label classes (`.btn`), never the hashed ones. See `css-system.md`.
- A host app doesn't need `morphPlugin` just to consume a built library. It needs
  the plugin only for its own `.morph` files. With the plugin, a host build also
  runs each installed library's `assets/main.css` (present when the library had
  `src/styles/main.css`) through the host's PostCSS config and emits it as
  `assets/morph-<name>.css`, with non-alphanumerics in the name turned into `-`.
  Nothing links that file into the page.
