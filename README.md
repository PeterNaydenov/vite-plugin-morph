<img src="morph-head.png" alt="Morph header image"  />

# Morph Plugin for Vite (@peter.naydenov/vite-plugin-morph)

![npm version](https://img.shields.io/npm/v/@peter.naydenov/vite-plugin-morph.svg)
![npm license](https://img.shields.io/npm/l/@peter.naydenov/vite-plugin-morph.svg)
![bundle size](https://img.shields.io/bundlephobia/minzip/@peter.naydenov/vite-plugin-morph.svg)
![Morph compatibility](https://img.shields.io/badge/@peter.naydenov/morph-v3.1.5-blue)

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

### 2. VS Code Extension

For the best development experience with `.morph` files, install the **Morph Template Syntax Highlighter** extension:

- **Extension Name**: `PeterNaydenov.morph-template-syntax-highlighting`
- **Marketplace Link**: https://marketplace.visualstudio.com/items?itemName=PeterNaydenov.morph-template-syntax-highlighting
- **Features**:
  - 🎨 Full syntax highlighting for `.morph` files
  - 📦 HTML-like template support
  - 🎯 JavaScript helper function highlighting
  - 🎭 CSS style section support
  - 📋 JSON handshake data highlighting
  - 🔧 Auto-completion for morph syntax
  - 🚀 Error checking and validation
  - 🌙 Dark/light theme support

This extension provides **professional editing experience** with syntax highlighting, IntelliSense, and real-time error detection for your `.morph` files.

### 2. Create a Morph Component

```html
<!-- src/components/Button.morph -->
<button class="btn {{variant: getVariantClass}}" data-click="{{action}}">
  {{text}}
</button>

<script>
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
  {{ items : ul, [], renderItem }}
  <button data-click="save">Save</button>
</div>
```

### Script (JavaScript)

```javascript
<script>
function formatTitle({data}) {
      return data.toUpperCase();
  }

function truncate({data}) {
      const length = 100;
      return data.length > length ? data.substring(0, length) + '...' : data;
  }

function renderItem(item) {
      return `<li>${item.name}</li>`;
  }

const ul = `<ul>{{text}}</ul>`;
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
  "items": [
              { "name": "Item 1" },
              { "name": "Item 2" },
              { "name": "Item 3" }
          ]
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



## CSS-Only Morph Files

For global styles and design systems, you can create CSS-only morph files:

```html
<!-- src/styles/global.morph -->
<style>
  :root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
  }

  .btn {
    background: var(--primary-color);
    color: white;
    padding: 0.5rem 1rem;
  }
</style>
```

CSS-only files export styles without a component function:

```javascript
import { styles } from './styles/global.morph';

// styles contains CSS class definitions
// No component function is exported
```

### CSS-Only vs Component Files

- **CSS-only files**: Export `export const styles`, preserve class names, used for global styles
- **Component files**: Export `export default function`, scoped CSS, used for components

## Development

![Node.js support](https://img.shields.io/badge/Node.js-16%2B-blue) ![Vite support](https://img.shields.io/badge/Vite-4.x-green) d

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Build
npm run build
```

## Test Coverage

The project includes comprehensive test coverage:

- **68.36%** statement coverage
- **58.11%** branch coverage
- **66.66%** function coverage
- **68.47%** line coverage

Run `npm run test:coverage` to generate detailed HTML reports in `./coverage/`.

## Requirements

- Node.js 16+
- Vite 4.x
- @peter.naydenov/morph v3.1.5

## Links

- [CHANGELOG.md](./CHANGELOG.md) - Version history and changes
- [Quickstart Guide](./specs/001-morph-plugin/quickstart.md)
- [Transformation Examples](./docs/morph-transformation.md)
- [API Reference](./specs/001-morph-plugin/spec.md)
- See the [examples](./examples/) directory for complete component examples.
- [Morph Documentation](https://github.com/peter-naydenov/morph)
- [Morph vscode extension](https://marketplace.visualstudio.com/items?itemName=peter-naydenov.morph)




## Credits
'@peter.naydenov/vite-plugin-morph' was created and supported by Peter Naydenov.


## License
'@peter.naydenov/vite-plugin-morph' is released under the [MIT License](https://github.com/peter-naydenov/vite-plugin-morph/blob/main/LICENSE).
