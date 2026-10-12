---
name: vite-plugin-morph
description: Writes, tests and debugs `.morph` components and configures `@peter.naydenov/vite-plugin-morph`, the Vite plugin that compiles `.morph` files (HTML template + helpers + scoped CSS + JSON handshake) into render functions for the `@peter.naydenov/morph` template engine. Covers HTML escaping of user data, helper rules, scoped CSS classes and cascade layers, plugin options, component-library builds (`buildLibrary`) and the client runtime (`applyStyles`, `themesControl`). Use when creating or editing `.morph` files, importing or testing them, configuring `morphPlugin` in a Vite config, or publishing or consuming a morph component library. For plain `morph.build()` code without `.morph` files, use the morph skill instead.
---

# vite-plugin-morph

A `.morph` file compiles to an ES module whose default export is a morph render
function. The plugin only converts the file into the description `morph.build()`
expects (`{ template, helpers, handshake }`) and adds scoped CSS. Placeholder and
action semantics are morph's: for anything not covered here, read the morph skill
(`node_modules/@peter.naydenov/morph/skills/morph/SKILL.md`).

## The compiled module

```js
import Card, { styles, handshake, template, css } from './Card.morph';

Card('render', data);               // → HTML string
Card('render', data, dependencies); // dependencies reach helpers as `dependencies`
Card('render', 'demo');             // renders the handshake (demo data)
```

The first argument is a morph **command**: `render`, `debug`, `snippets`, `set` or
`curry`. Anything else returns an `Error: Wrong command …` string.
`styles` maps each authored class to its scoped name. `handshake` exists only if
the file has one. `css` exists only if the file has a `<style>`.

## Writing a component

Copy this checklist and work through it:

```
- [ ] 1. Template: HTML with {{ placeholders }}
- [ ] 2. Escape decision for every placeholder that shows data
- [ ] 3. Helpers in <script>, following the helper rules
- [ ] 4. <style> with plain class names and var(--token, fallback) values
- [ ] 5. Handshake: demo data with a value for every placeholder
- [ ] 6. Run check-morph.mjs, fix, repeat until 0 errors
- [ ] 7. Add a test that renders hostile data
```

**1. Template.** Plain HTML at the top of the file, no wrapper. `{{ name }}`
inserts `data.name`. `{{ name : helper }}` runs it through a helper. Lists are
`{{ items : [], itemHelper }}`: `itemHelper` renders each item and `[]` (morph's
mix action) joins the results. Action chains run **right to left**:
`{{ x : a, b }}` runs `b` first. Morph has no `{{#if}}`/`{{#each}}`; a condition
is a helper that returns `''`.

**2. Escaping (required).** Morph escapes nothing, and `.morph` files cannot turn
on morph's `escape` option, so every value is inserted raw unless you escape it:

- Placeholder showing data: `{{ name : escape }}`. In a chain, `escape` goes
  leftmost so it runs last: `href="/go?next={{ next : escape, >urlEncode }}"`.
- Inside a function helper, escape every interpolated value, attributes included:
  `` `<li title="${useHelper('escape', data.name)}">…` ``.
- Never put user data through a string helper template. Placeholders with
  actions inside one (`<li>{{ name : escape }}</li>`) are not rendered at all.
  Use a function helper with `useHelper('escape', …)` instead.
- `{{ x : raw }}` does not work in `.morph` files. It renders a "Helper 'raw' is
  not available" error.
- A placeholder may stay unescaped only if its value can never contain markup:
  numbers, values your own code produces, or helper output that escapes internally.

**3. Helpers.** Declared in the `<script>` block. Rules (each one breaks silently
or at render time when ignored):

- A helper receives `{ data, dependencies, full, useHelper, memory, styles }`.
  `data` is the **placeholder's value**, not the whole data object: in
  `{{ name : fmt }}` it is the name string, and in a list it is the current item.
  For the whole object use `{{ @all : helper }}`.
- Each helper is compiled in isolation. A helper cannot call another helper or
  any other function in `<script>` directly (`ReferenceError`). Use
  `useHelper('other', value)`. Functions declared inside a helper's body are fine.
- No `import`/`export` and no shared module-level variables in `<script>`.
- **Function helper**: `function f() {}`, `const f = function () {}`, or an arrow
  function with a block body `const f = ({ data }) => { return … }`.
- **String helper template**: `` const row = `<li>{{ text }}</li>` ``. An arrow
  function whose body is a template literal is **also** a string helper template,
  and its `${}` expressions are dropped. Use string helpers only for static or
  trusted markup.

**4. Style.** Write plain class names. The plugin scopes them (`.card` →
`.Card_card_x7k2p`) and rewrites static class names in the template to
`Card_card_x7k2p card` (scoped name + unscoped "light label"). Class names that
arrive through a placeholder are **not** rewritten, so `class="card {{ variant }}"`
never matches the CSS. Return the scoped name from a helper instead:
`function variant({ data, styles }) { return styles[data] || ''; }`.
Start every selector with a class (`.nav .link`, not `nav .link`, which stays
global), hyphenate class names (`card-title`, not `card_title_x`), keep `.morph`
file names unique across the project, and never write `@layer` in a component
(the plugin wraps it in `@layer modules` itself). Use `var(--token, fallback)`
for anything themeable. For layers, themes and global CSS, see
[references/css-system.md](references/css-system.md).

**5. Handshake.** `<script type="application/json">` holds demo data for
`Card('render', 'demo')`. JSON, plus `//` and `/* */` comments, single quotes and
trailing commas. It ships in the bundle unless `production.removeHandshake` is
on, so never put real data, IDs or secrets in it. Give every placeholder a
value. A key that is missing, `null` or `undefined` at render time leaves the raw
`{{ name }}` in the output, so pass `''` for empty values.

**6. Validate.** Run the bundled checker from the project root (the plugin must be
installed):

```bash
node <this-skill-dir>/scripts/check-morph.mjs src/components/Card.morph
```

It compiles the file with the installed plugin, renders it with the handshake (or
`--data file.json`), and reports dropped helpers, render errors, unrendered
placeholders, and every data path whose value reaches the HTML unescaped. It
checks escaping by injecting `"><img src=x onerror=alert(1)>` into each string
value. Fix each error and run it again. Do not finish while it reports errors.

**7. Test.** Vitest picks up `morphPlugin` from the Vite config. The recipe is in
[references/testing.md](references/testing.md).

## Example

```html
<!-- UserCard.morph -->
<article class="card {{ size : sizeClass }}">
  <h3 class="name">{{ name : capitalize }}</h3>
  <p>{{ email : escape }}</p>
  <ul>{{ tags : [], tag }}</ul>
</article>

<script>
function capitalize({ data, useHelper }) {
  return useHelper('escape', data.charAt(0).toUpperCase() + data.slice(1));
}

function sizeClass({ data, styles }) {
  return styles[data] || '';
}

function tag({ data, useHelper }) {
  return `<li>${useHelper('escape', data)}</li>`;
}
</script>

<style>
.card { padding: var(--card-padding, 1rem); background: var(--card-bg, #fff); }
.small { padding: 0.5rem; }
.name { color: var(--name-color, #333); }
</style>

<script type="application/json">
{ "name": "ada lovelace", "email": "ada@example.com", "size": "small", "tags": ["math", "engines"] }
</script>
```

```js
import UserCard from './UserCard.morph';
document.querySelector('#app').innerHTML = UserCard('render', {
  name: 'ada lovelace', email: 'ada@example.com', size: 'small', tags: ['math'],
});
```

More patterns (conditionals, lists of objects, dependencies, wrong-vs-right
pairs): [references/morph-file-format.md](references/morph-file-format.md).

## Configuring the plugin

```js
// vite.config.js
import { defineConfig } from 'vite';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
  plugins: [morphPlugin()],
});
```

Requires `vite` 8. The defaults work for an app. Add options only for a
specific need. Some documented-looking options have no effect, so check
[references/plugin-config.md](references/plugin-config.md) before adding one.

Component CSS arrives with each import. Global CSS (`src/styles/main.css`) and
the default theme need one call at app start:

```js
import { applyStyles } from '@peter.naydenov/vite-plugin-morph/client';
applyStyles();
```

Declare the cascade layer order once in `index.html` `<head>`:
`<style>@layer vendors, libs, modules, app, context;</style>`. The plugin
doesn't do this for you.

## Other tasks

- **Publishing a component library** (`buildLibrary`) or **consuming one**:
  [references/library-mode.md](references/library-mode.md)
- **Client runtime** (`applyStyles`, `applyGeneralStyles`, `themesControl`,
  `registerComponentCSS`): [references/runtime-api.md](references/runtime-api.md)
- **CSS layers, themes, global CSS, Content-Security-Policy**:
  [references/css-system.md](references/css-system.md)

## Anti-patterns

- Rendering user data without `escape`. This is the most damaging mistake: a
  stored-XSS hole in every page that shows the component.
- Calling `Component('view', …)` or `Component(data)`. The first argument is
  always a command, usually `'render'`.
- Reading `data.name` in a helper attached to `{{ name : helper }}`. `data` is
  already the name.
- Calling one helper from another directly. Use `useHelper`.
- Treating `.morph` like a Vue/Svelte SFC: no reactive state, no props
  declaration, no lifecycle, no imports. It is a template plus pure helpers.
- Putting a placeholder inside `class="…"`, or pasting a hashed class name into
  the template. Use a helper that returns `styles[name]`.
- Real data or secrets in the handshake.
- Hardcoded colours in component CSS, `!important` to fight scoping, or `@layer`
  in a component `<style>` (it becomes the nested layer `modules.app`).

## Output contract

A `.morph` deliverable is one file containing: the template, an escape decision
for every placeholder that shows data, a `<script>` only if helpers are used, a
`<style>` only if the component has CSS, and a handshake with demo values for
every placeholder. It passes `check-morph.mjs` with 0 errors.
