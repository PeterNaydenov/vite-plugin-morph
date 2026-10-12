# `.morph` file format

## Contents
- Sections
- Placeholders (the parts a `.morph` author needs)
- Helpers: kinds, context, isolation
- Patterns
- Wrong vs right
- Handshake
- Compiled module
- CSS-only files
- Common mistakes

## Sections

| Section | Required | Content |
| --- | --- | --- |
| Template | yes | HTML with `{{ }}` placeholders, top level, no wrapper tag |
| `<script>` | if helpers are used | Helper declarations only |
| `<style>` | if the component has CSS | Plain CSS; classes are scoped per file |
| `<script type="application/json">` | no | Handshake (demo data) |

Section order doesn't matter. The convention is template, script, style, handshake.
The component name is the file name: `UserCard.morph` → scoped classes
`UserCard_<class>_<hash>`.

## Placeholders

Only what a `.morph` author needs. For full semantics see the morph skill
(`references/placeholders-and-actions.md` in `@peter.naydenov/morph`).

| Form | Meaning |
| --- | --- |
| `{{ name }}` | Insert `data.name`, unescaped |
| `{{ name : escape }}` | Insert `data.name`, HTML-escaped (built-in helper) |
| `{{ name : helper }}` | Insert `helper`'s return value. `data` = the value of `name` |
| `{{ items : [], item }}` | Render each array element with `item`, then join (`[]` = mix action) |
| `{{ @all : helper }}` | `data` = the whole data object |
| `{{ address/city }}` | Breadcrumb path into nested data |
| `{{ : helper }}` | No data source; output comes only from the helper |
| `{{ x : a, b }}` | Chain, runs **right to left**: `b` first, then `a` |
| `{{ x : >h }}` | `>` = data action: `h` returns data for the next action, not markup |

Spacing inside braces is free (`{{name}}` = `{{ name }}`). This skill writes
`{{ name }}`, the same as the morph skill.

## Helpers

### Kinds

How the plugin classifies each top-level declaration in `<script>`:

| Declaration | Kind |
| --- | --- |
| `function f({ data }) { … }` | function helper |
| `const f = function ({ data }) { … }` | function helper |
| `const f = ({ data }) => { return …; }` | function helper |
| `const f = ({ data }) => data.trim()` | function helper (expression body that is not a template literal) |
| `` const f = `<li>{{ text }}</li>` `` | string helper template |
| `const f = '<li>{{ text }}</li>'` | string helper template |
| `` const f = ({ data }) => `<li>${data}</li>` `` | **string helper template**: `${data}` is dropped |

A string helper template renders plain `{{ key }}` placeholders against `data`
(for a list of strings, the item is `{{ text }}`). Placeholders **with
actions** inside it are left as literal text, and nothing in it is escaped. Use it
only for static or trusted markup.

### Context

Every function helper receives one object:

| Key | Value |
| --- | --- |
| `data` | The placeholder's value (in a list: the current item) |
| `full` | Morph's `full` context (see the morph skill's `references/helpers.md`) |
| `dependencies` | Third argument of the render call, plus `styles` |
| `styles` | This file's scoped class map (`styles.card` → `Card_card_x7k2p`) |
| `useHelper` | `useHelper(name, value?)` calls another helper, or the built-in `escape` |
| `memory` | Values saved with `^name` actions in the same render |

### Isolation

The plugin compiles each helper separately and attaches it to the template. So:

- A helper can't see other helpers, other functions or variables in `<script>`.
  Calling `other()` throws `ReferenceError: other is not defined` at render time.
  Use `useHelper('other', value)`.
- Functions and constants declared **inside** a helper's body are fine.
- `<script>` must not contain `import`/`export`. External services come in
  through `dependencies`: `Card('render', data, { t: translate })`.

## Patterns

**Conditional markup**: return `''` when the condition fails:

```html
<!-- Badge.morph -->
<span>{{ name : escape }}{{ count : badge }}</span>

<script>
function badge({ data }) {
  return data > 0 ? ` <b class="count">${Number(data)}</b>` : '';
}
</script>

<script type="application/json">{ "name": "Inbox", "count": 3 }</script>
```

**List of objects**: a function helper gets one item as `data`:

```html
<!-- UserList.morph -->
<ul>{{ users : [], userRow }}</ul>

<script>
function userRow({ data, useHelper }) {
  const name = useHelper('escape', data.name);
  return `<li title="${name}">${name} <small>${useHelper('escape', data.role)}</small></li>`;
}
</script>

<script type="application/json">
{ "users": [{ "name": "Ada", "role": "admin" }, { "name": "Linus", "role": "dev" }] }
</script>
```

**Variant class**: map a value to a scoped class. Unknown values yield `''`,
so hostile input can't inject a class:

```html
<!-- Button.morph -->
<button class="btn {{ variant : variantClass }}">{{ label : escape }}</button>

<script>
function variantClass({ data, styles }) {
  return styles[data] || '';
}
</script>

<style>
.btn { padding: var(--btn-padding, 0.5rem 1rem); }
.primary { background: var(--color-primary, #0060df); color: #fff; }
</style>

<script type="application/json">{ "label": "Save", "variant": "primary" }</script>
```

**Calling one helper from another, and a URL in a helper**:

```html
<!-- DocsLink.morph -->
<p>{{ topic : link }}</p>

<script>
function slug({ data }) {
  return encodeURIComponent(String(data).toLowerCase());
}

function link({ data, useHelper }) {
  return `<a href="https://example.com/docs/${useHelper('slug', data)}">${useHelper('escape', data)}</a>`;
}
</script>

<script type="application/json">{ "topic": "Getting Started" }</script>
```

**Render-time dependencies**:

```js
Card('render', data, { t: (key) => dictionary[key] ?? key });
// in a helper: function label({ data, dependencies }) { return dependencies.t(data); }
```

## Wrong vs right

Each ✗ file below is wrong in the way its comment says. The repo's test suite
checks that `check-morph.mjs` reports each one.

```html
<!-- ✗ WrongData.morph — helper reads data.name, but data IS the name -->
<h3>{{ name : capitalize }}</h3>
<script>
function capitalize({ data }) { return data.name.toUpperCase(); }
</script>
<script type="application/json">{ "name": "ada" }</script>
```

```html
<!-- ✗ WrongCall.morph — helpers can't call each other directly -->
<p>{{ x : outer }}</p>
<script>
function inner({ data }) { return `[${data}]`; }
function outer({ data }) { return inner({ data }); }
</script>
<script type="application/json">{ "x": "a" }</script>
```

```html
<!-- ✗ WrongStringHelper.morph — actions inside a string helper never render -->
<ul>{{ users : [], row }}</ul>
<script>
const row = `<li>{{ name : escape }}</li>`;
</script>
<script type="application/json">{ "users": [{ "name": "Ada" }] }</script>
```

```html
<!-- ✗ WrongUnescaped.morph — user data inserted raw (XSS) -->
<p class="bio">{{ bio }}</p>
<script type="application/json">{ "bio": "Hello" }</script>
```

```html
<!-- ✗ WrongListSyntax.morph — third segment is a placeholder NAME, so itemTpl never runs -->
<ul>{{ items : [] : itemTpl }}</ul>
<script>
const itemTpl = `<li>{{ text }}</li>`;
</script>
<script type="application/json">{ "items": ["a", "b"] }</script>
```

The fixes, in order: `data.toUpperCase()`; `useHelper('inner', data)`; a
function helper with `useHelper('escape', data.name)`; `{{ bio : escape }}`;
`{{ items : [], itemTpl }}`.

## Handshake

- Demo data for `Component('render', 'demo')` and for the `handshake` export.
- Strict JSON, plus `//` and `/* */` comments, single-quoted strings and trailing
  commas.
- It is shipped in the JS bundle. Never put real data, IDs, tokens or emails of
  real people in it.
- `production.removeHandshake: true` strips it from `vite build` output (the dev
  server keeps it). The `handshake` export then becomes `{}`, and
  `Component('render', 'demo')` returns `Error: No handshake data.`

## Compiled module

| Export | When | Value |
| --- | --- | --- |
| `default` | always | Render function `(command, data?, dependencies?)` |
| `template` | always | The description passed to `morph.build()` |
| `styles` | always | `{ authoredClass: scopedClass }` (`{}` without CSS) |
| `handshake` | file has a handshake | Demo data object |
| `css` | file has `<style>` | Scoped CSS wrapped in `@layer modules` (`@layer libs` for files under `node_modules`) |
| `componentsCSS` | file has `<style>` | Per-class CSS rules |

Importing the module injects its CSS as a `<style id="morph-css-<Name>">`
element when a `document` exists. No `applyStyles()` call is needed for the
component's own CSS.

Commands of the render function: `render` (default), `debug`, `snippets`, `set`,
`curry`. See the morph skill's `references/commands.md`.

## CSS-only files

A `.morph` file with only a `<style>` block exports `styles` (the CSS string)
and injects it on import. This exists for backward compatibility. For global
styles and tokens, use plain `.css` files (see `css-system.md`).

## Common mistakes

| Symptom | Cause → fix |
| --- | --- |
| Output contains literal `{{ name }}` | Key missing, `null` or `undefined` → pass every key (`''` for empty) |
| Output contains literal `{{ name : escape }}` inside a list item | Action inside a string helper template → use a function helper |
| `( Error: Helper 'x' is not available )` | Helper not declared in `<script>` |
| `Error: Wrong command "view"…` | First argument must be a command → `'render'` |
| `TypeError: Cannot read properties of undefined` | Helper reads `data.key`, but `data` is the value itself |
| `ReferenceError: x is not defined` | Helper calls another function directly → `useHelper('x', value)` |
| Class from `{{ variant }}` has no styling | Placeholders in `class` aren't scoped → helper returning `styles[data]` |
| Arrow helper outputs `${…}` parts as empty | Template-literal arrow is a string helper → use a block body |
