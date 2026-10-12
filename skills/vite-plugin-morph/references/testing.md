# Testing `.morph` components

## Quick check while writing

```bash
node <this-skill-dir>/scripts/check-morph.mjs src/components/Card.morph
node <this-skill-dir>/scripts/check-morph.mjs src/components/Card.morph --data fixtures/card.json
```

Exit code 0 means no errors (warnings may remain), 1 means errors, 2 means the check
couldn't run. Run it from the project root, where the plugin is installed. Use
`--data` when the handshake doesn't cover every branch (empty lists, missing
optional fields, every variant).

## Vitest

Vitest runs Vite plugins, so `.morph` imports work once the plugin is in the
config. The default Node environment is enough because render functions return
strings. Use `environment: 'jsdom'` only to test DOM behaviour.

```js
// vitest.config.js (or add `test` settings to vite.config.js)
import { defineConfig } from 'vitest/config';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
  plugins: [morphPlugin({ logLevel: 'silent' })],
});
```

```js
// src/components/Card.test.js
import { describe, it, expect } from 'vitest';
import Card, { styles } from './Card.morph';

const HOSTILE = '"><img src=x onerror=alert(1)>';

describe('Card', () => {
  it('renders data with scoped classes', () => {
    const html = Card('render', { title: 'Hello' });
    expect(html).toContain('Hello');
    expect(html).toContain(styles.card);
  });

  it('renders its handshake', () => {
    expect(Card('render', 'demo')).not.toContain('{{');
  });

  it('escapes user data', () => {
    const html = Card('render', { title: HOSTILE });
    expect(html).not.toMatch(/<img|<script/i);
    expect(html).not.toContain('{{');
  });
});
```

Write the hostile test for every field that can hold user input, including
fields inside list items and fields that end up in attributes.

`logLevel: 'silent'` keeps test and CI output clean. Use `'debug'` to see what
the plugin does with each file.
