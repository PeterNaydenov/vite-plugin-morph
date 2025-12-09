<img src="./header.png" alt="Morph header image" />

# Morph Plugin for Vite (@peter.naydenov/vite-plugin-morph)

![npm version](https://img.shields.io/npm/v/@peter.naydenov/vite-plugin-morph.svg)
![npm license](https://img.shields.io/npm/l/@peter.naydenov/vite-plugin-morph.svg)
![bundle size](https://img.shields.io/bundlephobia/minzip/@peter.naydenov/vite-plugin-morph.svg)
![Morph compatibility](https://img.shields.io/badge/@peter.naydenov/morph-v3.2.0-blue)

A Vite plugin for processing `.morph` files with HTML-like syntax, CSS modules, and JavaScript helpers. Built on top of `@peter.naydenov/morph` v3.2.0.

## Features

- 🎨 **HTML-like Syntax** - Write components with familiar HTML/CSS/JS structure
- 📦 **CSS Modules** - Automatic CSS scoping and global variable support
- 🔥 **Hot Module Replacement** - Instant development updates
- 🛠️ **TypeScript Support** - Full type definitions included
- ⚡ **Vite Integration** - Seamless Vite 4.x plugin API integration
- 🔄 **Morph Syntax** - Full support for `@peter.naydenov/morph` template syntax and helpers
- ⚙️ **Zero Config** - Works out of the box with sensible defaults
- 🎯 **Production Optimized** - Built-in optimizations for production builds

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

**Features**:

- 🎨 Full syntax highlighting for `.morph` files
- 📦 HTML-like template support
- 🎯 JavaScript helper function highlighting
- 🎭 CSS style section support
- 📋 JSON handshake data highlighting
- 🧠 Auto-completion for morph syntax
- 🚀 Error checking and validation
- 🌙 Dark/light theme support

This extension provides a **professional editing experience** with syntax highlighting, IntelliSense, and real-time error detection for your `.morph` files.

### 3. Create a Morph Component

```html
<!-- src/components/Button.morph -->
<button class="btn {{ variant : getVariantClass }}" data-click="{{action}}">
  {{text}}
</button>

<script>
  function getVariantClass ({ data }) {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      danger: 'btn-danger',
    };
    return variants[data] || variants.primary;
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

### 4. Use in Your Application

```javascript
import Button, { styles } from './components/Button.morph';

// Render with custom data
const customButton = Button({
  text: 'Save Changes',
  variant: 'primary',
  action: 'handleClick',
});

document.body.innerHTML = customButton;

// Access typed handshake data
console.log(handshake.text); // string
console.log(handshake.variant); // string

// Use typed CSS module classes
const className = styles.btn; // string
```

## TypeScript Support

The plugin includes full TypeScript definitions. Import morph files directly in TypeScript:

```typescript
// TypeScript usage
import Button, { styles, handshake } from './components/Button.morph';

// Type-safe component rendering
const buttonHtml = Button({
  text: 'Submit',
  variant: 'primary',
  action: 'handleSubmit',
});

// Access typed handshake data
console.log(handshake.text); // string
console.log(handshake.variant); // string

// Use typed CSS module classes
const className = styles.btn; // string
```

## Morph File Structure

A `.morph` file contains four main sections:

### Template (HTML)

```html
<div class="card">
  <h2>{{ title }}</h2>
  <p>{{ description }}</p>
  {{ items : [], renderItem }}
  <button data-click="save">Save</button>
</div>
```

### Script (JavaScript)

```javascript
<script>
function formatTitle({data}) {
  return data.title.toUpperCase()
}

function renderItem ({ data }) {
  return `<li>${data.name}</li>`;
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

.btn {
  padding: var(--btn-padding, 0.5rem 1rem);
  border-radius: var(--btn-radius, 4px);
}
</style>
```

### Handshake (JSON-like)

```javascript
<script type="application/json">
{
  "title": "Card Title",
  "description": "Card description", // Comments are allowed
  "items": [
    { 'name' : "Item 1"}, // Single quotes are allowed
    { "name" : "Item 2"},
    { "name" : "Item 3"}
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
        exclude: ['**/*.min.css'],
      },
    }),
  ],
});
```

### Production Optimization

```javascript
// vite.config.js
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

### Development Settings

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      development: {
        sourceMaps: true,
        hmr: true,
      },
    }),
  ],
});
```

### Error Handling

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      errorHandling: {
        failOnError: true,
        showLocation: true,
        maxErrors: 10,
      },
    }),
  ],
});
```

## Advanced Features

### CSS-Only Morph Files

For global styles and design systems, create CSS-only morph files:

```html
<!-- src/styles/theme.morph -->
<style>
  :root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --btn-padding: 0.5rem 1rem;
    --btn-radius: 4px;
  }

  .btn {
    background: var(--primary-color);
    color: white;
    padding: var(--btn-padding);
    border-radius: var(--btn-radius);
  }
</style>
```

### Template Helpers

Use powerful template helpers for dynamic content:

```html
<div class="user-card">
  <h2>{{user.name}}</h2>
  <p>{{user.email}}</p>
  {{#if user.isAdmin}}
  <button class="admin-btn">Admin Panel</button>
  {{/if}} {{#each user.roles}}
  <span class="role-{{this}}">{{this}}</span>
  {{/each}}
</div>
```

### JavaScript Helpers

Define reusable helper functions:

```javascript
<script>
function formatDate({data}) {
  return new Date(data.timestamp).toLocaleDateString();
}

function calculateTotal({data}) {
  return data.items.reduce((sum, item) => sum + item.price, 0);
}

function validateEmail({data}) {
  const email = data.email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
</script>
```

## Development

### Requirements

- Node.js 16+
- Vite 4.x
- @peter.naydenov/morph v3.1.5

### Setup Development Environment

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Build for production
npm run build
```

### Test Coverage

The project includes comprehensive test coverage with **137 tests passing**:

- **76.05%** statement coverage
- **64.57%** branch coverage
- **78.15%** function coverage
- **76.01%** line coverage

Run `npm run test:coverage` to generate detailed HTML reports in `./coverage/`.

### Project Structure

```
src/
├── core/           # Core processing logic
│   ├── parser.js      # HTML parsing and content extraction
│   ├── processor.js   # Main morph file processing pipeline
│   ├── template.js    # Template compilation and helpers
│   ├── script.js      # JavaScript helper processing
│   ├── themer.js      # Theme processing and generation
│   ├── composer.js    # Component composition system
│   ├── config-loader.js # Configuration loading
│   └── errors.js      # Error handling utilities
├── plugin/          # Vite plugin integration
│   ├── index.js       # Main plugin factory
│   ├── hooks.js       # Transform and HMR hooks
│   └── config.js      # Plugin configuration
├── services/        # Advanced services
│   ├── css-generation.js    # CSS processing and generation
│   ├── theme-runtime.js      # Theme management API
│   └── theme-discovery.js   # Theme file discovery
├── utils/           # Shared utilities
│   ├── logger.js      # Logging system
│   ├── cache.js       # Performance caching
│   ├── file-watcher.js # File watching for HMR
│   └── shared.js      # Common utilities
└── types/           # TypeScript type definitions
    └── index.js       # Complete type definitions
```

## API Reference

### Core Functions

#### `processMorphFile(content, filePath, options)`

Process a morph file and return compiled result.

**Parameters:**

- `content` (string): Raw morph file content
- `filePath` (string): File path for error reporting
- `options` (MorphPluginOptions): Plugin configuration options

**Returns:** `Promise<ProcessingResult>`

#### `isProductionMode(options)`

Check if running in production mode.

**Parameters:**

- `options` (MorphPluginOptions): Plugin configuration

**Returns:** `boolean`

### Configuration Options

See `src/types/index.js` for complete type definitions.

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for complete version history and migration information.

## Performance

The plugin includes built-in optimizations:

- **Caching**: Automatic file processing cache
- **Lazy Loading**: On-demand template compilation
- **Incremental Builds**: Only process changed files
- **Source Maps**: Optional for development debugging

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Contributing

Contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## Test Coverage

The project maintains comprehensive test coverage:

- **137 tests passing** ✅
- **0 tests failing** ✅
- **2 tests skipped** (intentionally skipped features)

Run tests with:

```bash
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
npm run test:watch         # Watch mode for development
```

## Requirements

- Node.js 16+
- Vite 4.x
- @peter.naydenov/morph v3.1.5

## Links

- [CHANGELOG.md](./CHANGELOG.md) - Version history and changes
- [Quickstart Guide](./specs/001-morph-plugin/quickstart.md) - Getting started tutorial
- [API Reference](./specs/001-morph-plugin/spec.md) - Complete API documentation
- [Transformation Examples](./docs/morph-transformation.md) - Advanced usage examples
- [Examples](./examples/) directory - Complete component examples
- [Morph Documentation](https://github.com/peter-naydenov/morph) - Morph syntax and features
- [Morph VS Code Extension](https://marketplace.visualstudio.com/items?itemName=PeterNaydenov.morph-template-syntax-highlighting) - Editor support
- [Report Issues](https://github.com/peter-naydenov/vite-plugin-morph/issues) - Bug reports and feature requests

## Credits

'@peter.naydenov/vite-plugin-morph' was created and is maintained by Peter Naydenov.

## License

'@peter.naydenov/vite-plugin-morph' is released under the [MIT License](https://github.com/peter-naydenov/vite-plugin-morph/blob/main/LICENSE).
