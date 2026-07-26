# `.morph` file format — full reference

A `.morph` file is a single file with up to four sections. The plugin compiles it to an ES module whose **default export is a render function** and whose **named exports** include `styles` (scoped CSS class map), `handshake` (default data), and (for non-CSS-only files) the metadata.

## 1. Template section (HTML)

Plain HTML at the top of the file (no wrapper tag needed). Use these substitution rules:

- `{{key}}` — direct binding. Resolves `data.key` (or `data['key']`).
- `{{key : helperName}}` — run `data.key` through helper `helperName`. Helper receives `{ data, dependencies }` and returns the substitution value.
- `{{key : helperName : placeholderName}}` — same, with the helper template's placeholder named (only meaningful for helper templates).
- `{{#if key}}…{{/if}}` and `{{#each key}}…{{/each}}` — control flow, like upstream `@peter.naydenov/morph`.
- `{{this}}` inside `{{#each}}` — current item.

> Don't wrap plain text in `{{ }}`. Only the placeholder names go inside braces.

### Helpers — two distinct kinds

Both are declared in the **`<script>`** section, but they are not interchangeable.

**Helper function** — pure JS function returning a string:

```js
<script>
function formatName({data}) {
  return data.name.toUpperCase();
}
</script>
```

Template usage: `{{name : formatName}}` → renders `data.name` uppercased.

**Helper template** — `const name = \`html\``; applied to an array of data:

```js
<script>
const listItem = `<li>{{name}}</li>`;
</script>
```

Template usage: `{{projects : [], listItem}}` → for each item in `data.projects`, render `listItem` with `item` as the data context, concatenate results.

Why the `[]` in `{{projects : [], listItem}}`: the `[]` is the "no data key" marker — when applying a helper template to an array, you don't need a single key. Compare to `{{name : formatName}}` where `name` is the key.

### Accessing scoped CSS from a helper

```js
function getClass({ data, dependencies }) {
  return dependencies.styles['btn-primary'] || '';
}
```

Template: `<button class="btn {{variant : getClass}}">…</button>`.

> The scoper renames CSS selectors but does **not** rewrite `class` attributes in the template. If you interpolate a placeholder directly into `class="…"` — e.g. `<button class="btn {{variant}}">` with the consumer passing `{ variant: 'primary' }` — the rendered class is the literal string `btn primary`, but the CSS selector is now `Button_btn_hash Button_primary_hash`. They don't match.
>
> Always go through a helper that returns the scoped name from `dependencies.styles`.

## 2. `<script>` section (helpers only)

Contains helper function declarations and helper template `const` declarations. **No imports, no top-level `export`, no state.** If you need shared logic, put it in the consumer's `main.js`.

## 3. `<style>` section (CSS)

Plain CSS. Every class selector is automatically scoped by appending a unique hash, e.g. `.btn` becomes `.Button_btn_a1b2c`. To participate in cascade control, wrap rules in `@layer` blocks. To expose themeable values, use `var(--token, fallback)`.

The scoper does **not** rename:

- Tag selectors (`button`, `div`).
- ID selectors (use sparingly).
- Keyframes and `@layer` declarations themselves.
- CSS variables (`--my-token`).

The scoper **does** rename:

- Class selectors (`.foo`).
- Selectors that combine a class with anything else (`.foo.bar`, `button.btn`, `.parent .child` — both classes get renamed consistently so the relationship holds).

To keep a class name **unscoped** (intentionally rare), use `:global(.foo)` syntax inside the style block.

## 4. `<script type="application/json">` (handshake)

The default data object. Rules:

- Valid JSON with extensions:
  - **Single quotes** for keys and string values.
  - **Trailing commas**.
  - **Line comments** (`//`) and **block comments** (`/* */`).
- Accessed by helpers and the template as `data` / `data.key`.
- The named export `handshake` exposes this object to the consumer.
- In production builds, set `production.removeHandshake: true` to strip it.

## What the compiled module exports

```js
// UserCard.morph — compiled output (simplified)
export const styles = { /* scoped class map */ };
export const handshake = { /* default data */ };
export default function UserCard(renderKey, data) { /* returns HTML string */ };
```

The consumer calls the default export as a function: `UserCard('view', { name: 'Ada' })`.

## CSS-only `.morph` files

A file with only a `<style>` block (no template) is treated as a **CSS-only morph file**. It is registered as a side-effect import that injects the styles.

> **Compatibility feature, not recommended.** This exists for backward compatibility, not as the recommended way to write global stylesheets or design tokens — use plain `.css` files instead (see `setup-component-library.md`). Don't reach for this pattern in new code.

## Common mistakes — quick check

| Symptom | Likely cause |
| --- | --- |
| Helper receives `undefined` | Helper name typo, or helper is in a different `<script>` block than the one with the template (some setups have multiple) |
| Scoped class doesn't apply | Template uses a hand-written class that the scoper renamed — read from `dependencies.styles` |
| Modifier class (`{{variant}}` in `class="…"`) doesn't apply | The scoper renames the CSS selector but doesn't rewrite the `class` attribute. Route the modifier through a helper that returns `dependencies.styles[name]`. |
| Helper template renders nothing | Forgot the `[]` in `{{array : [], helper}}` |
| JSON parse error in handshake | Mixed quote styles mid-line, or unbalanced `/* */` |
| `data` is `undefined` in helper | Template references `{{key}}` but key is missing from handshake and the call site |
