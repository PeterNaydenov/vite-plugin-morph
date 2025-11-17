# @peter.naydenov/vite-plugin-morph

A Vite plugin for processing `.morph` files with HTML-like syntax, CSS modules, and JavaScript helpers. Built on top of `@peter.naydenov/morph` v3.1.5.

## Features

- 🎨 **HTML-like Syntax** - Write components with familiar HTML/CSS/JS structure
- 📦 **CSS Modules** - Automatic CSS scoping and global variable support
- 🔥 **Hot Module Replacement** - Instant development updates
- 🛠️ **TypeScript Support** - Full type definitions included
- ⚡ **Vite Integration** - Seamless Vite 4.x plugin API integration
- 🎯 **Zero Config** - Works out of the box with sensible defaults
- 🔄 **Morph Syntax** - Full support for `@peter.naydenov/morph` template syntax and helpers

## Installation

```bash
npm install @peter.naydenov/vite-plugin-morph --save-dev
```

## Quick Start

### 1. Configure Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default defineConfig({
  plugins: [morphPlugin()],
});
```

### 2. Create a Morph Component

```html
<!-- src/components/Button.morph -->
<button class="btn {{variant}}" data-click="{{action}}">{{text}}</button>

<script>
  function handleClick(event) {
    console.log('Button clicked:', event);
  }

  function getVariantClass(variant) {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
    };
    return variants[variant] || variants.primary;
  }
</script>

<style>
  .btn {
    padding: var(--btn-padding, 0.5rem 1rem);
    border: none;
    border-radius: var(--btn-radius, 4px);
    cursor: pointer;
  }

  .btn.primary {
    background: var(--primary-color, #007bff);
    color: white;
  }
</style>

<script type="application/json">
  {
    "text": "Click me",
    "variant": "primary",
    "action": "handleClick"
  }
</script>
```

### 3. Use in Your Application

```javascript
import Button, { styles } from './components/Button.morph';

// Render with demo/handshake data
const buttonHTML = Button('render', 'demo');

// Render with custom data
const customButton = Button('render', {
  text: 'Save Changes',
  variant: 'primary',
  action: 'handleClick',
});

document.body.innerHTML = customButton;
```

## Morph File Structure

A `.morph` file contains four main sections:

### Template (HTML)

```html
<div class="card">
  <h2>{{title : formatTitle}}</h2>
  <p>{{description : truncate}}</p>
  <button data-click="save">Save</button>
  {{items : [], #, [], renderItem}}
</div>
```

### Script (JavaScript)

```javascript
<script>
function formatTitle(title) {
  return title.toUpperCase();
}

function truncate(text, length = 100) {
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function renderItem(item) {
  return `<li>${item.name}</li>`;
}

function save(event) {
  console.log('Saving data...');
}
</script>
```

### Style (CSS)

```css
<style>
.card {
  background: var(--card-bg, #fff);
  padding: 1rem;
  border-radius: 8px;
}
</style>
```

### Handshake (JSON)

```javascript
<script type="application/json">
{
  "title": "Card Title",
  "description": "Card description",
  "items": []
}
</script>
```

## Configuration

### Global CSS Variables

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      globalCSS: {
        directory: 'src/styles',
        include: ['**/*.css'],
      },
    }),
  ],
});
```

### Production Optimization

```javascript
export default defineConfig({
  plugins: [
    morphPlugin({
      production: {
        removeHandshake: true,
        minifyCSS: true,
      },
    }),
  ],
});
```

## CSS Modules

The plugin automatically generates CSS module exports:

```javascript
import Button, { styles } from './components/Button.morph';

console.log(styles.btn); // "btn_a1b2c3"
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build
npm run build
```

## Requirements

- Node.js 16+
- Vite 4.x
- @peter.naydenov/morph v3.1.5

## License

MIT

## Documentation

- [Quickstart Guide](./specs/001-morph-plugin/quickstart.md)
- [Transformation Examples](./docs/morph-transformation.md)
- [API Reference](./specs/001-morph-plugin/spec.md)

## Examples

See the [examples](./examples/) directory for complete component examples.
