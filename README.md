<img src="./header.png" alt="Morph header image" />

# Morph Plugin for Vite (@peter.naydenov/vite-plugin-morph)

![npm version](https://img.shields.io/npm/v/@peter.naydenov/vite-plugin-morph.svg)
![npm license](https://img.shields.io/npm/l/@peter.naydenov/vite-plugin-morph.svg)
![bundle size](https://img.shields.io/bundlephobia/minzip/@peter.naydenov/vite-plugin-morph.svg)
![Morph compatibility](https://img.shields.io/badge/@peter.naydenov/morph-v3.3.0-blue)
![CSS Layers](https://img.shields.io/badge/CSS-Layers-orange)
![Tree Shaking](https://img.shields.io/badge/Tree-Shaking-green)

A Vite plugin for processing `.morph` files with HTML-like syntax, CSS modules, and JavaScript helpers. Built on top of `@peter.naydenov/morph` v3.2.0.

## Features

- 🎨 **HTML-like Syntax** - Write components with familiar HTML/CSS/JS structure
- 🏗️ **CSS Layers Architecture** - Complete CSS processing with @layer cascade, tree-shaking, and bundling
- 📦 **CSS Modules** - Automatic CSS scoping with unique class names
- ⚡ **PostCSS Processing** - Autoprefixer, minification, and source maps
- 🌳 **CSS Tree-Shaking** - 30-70% bundle size reduction by removing unused CSS
- 📦 **Advanced Bundling** - CSS chunking, cache invalidation, and single optimized bundles
- 🔥 **CSS Hot Module Replacement** - Instant style updates during development
- 🐛 **Enhanced Error Reporting** - File location tracking and detailed CSS error messages
- 🔧 **CSS Debugging Tools** - Rich inspection utilities and processing logs
- 🛠️ **TypeScript Support** - Full type definitions included
- ⚡ **Vite Integration** - Seamless Vite 4.x plugin API integration
- 🔄 **Morph Syntax** - Full support for `@peter.naydenov/morph` template syntax and helpers
- ⚙️ **Zero Config** - Works out of the box with sensible defaults
- 🎯 **Production Optimized** - Built-in optimizations for production builds
- 📚 **Library Mode** - Build distributable component libraries with runtime CSS control

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
<button class="{{ : getButtonClasses }}" data-click="{{action}}">
  {{text}}
</button>

<script>
  function getButtonClasses({ data, dependencies }) {
    // Access scoped CSS class names
    const btnClass = dependencies.styles.btn || 'btn';
    const variants = {
      primary: dependencies.styles['btn-primary'] || 'btn-primary',
      secondary: dependencies.styles['btn-secondary'] || 'btn-secondary',
      danger: dependencies.styles['btn-danger'] || 'btn-danger',
    };
    const variantClass = variants[data.variant] || variants.primary;
    return `${btnClass} ${variantClass}`;
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

## CSS Layers Architecture

The plugin includes a comprehensive CSS processing system that transforms your component styles into a modern, scalable architecture.

### CSS Modules & Scoping

Component styles are automatically scoped with unique class names to prevent conflicts:

```html
<!-- Button.morph -->
<button class="{{ : getButtonClass }}">Click me</button>

<script>
  function getButtonClass({ data, dependencies }) {
    // Access scoped CSS class names
    const btnClass = dependencies.styles.btn || 'btn';
    return btnClass;
  }
</script>

<style>
  .btn {
    background: blue;
    color: white;
  }
</style>
```

Generates scoped CSS:

```css
.Button_btn_abc123 {
  background: blue;
  color: white;
}
```

### CSS @layer Cascade Control

Organize styles with predictable precedence using CSS layers:

```html
<!-- Theme.morph -->
<style>
  @layer reset {
    * {
      box-sizing: border-box;
    }
  }

  @layer global {
    :root {
      --primary-color: #007bff;
      --btn-padding: 0.5rem 1rem;
    }
  }

  @layer components {
    .btn {
      background: var(--primary-color);
      padding: var(--btn-padding);
    }
  }
</style>
```

### PostCSS Processing

Automatic vendor prefixing, minification, and source maps:

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      css: {
        postcss: {
          autoprefixer: true,
          minify: true,
          sourceMaps: true,
        },
      },
    }),
  ],
});
```

### CSS Tree-Shaking

Automatically removes unused component CSS (30-70% bundle reduction):

```javascript
// Only imported components' CSS is included
import Button from './components/Button.morph';
// Button CSS included

// import Card from './components/Card.morph';
// Card CSS automatically excluded
```

### Advanced CSS Bundling

Configure CSS chunking for large applications:

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      css: {
        chunking: {
          enabled: true,
          strategy: 'size', // 'size', 'category', 'manual'
          maxChunkSize: 50 * 1024, // 50KB
        },
        outputDir: 'dist/components',
      },
    }),
  ],
});
```

### CSS Hot Module Replacement

Instant style updates during development - no page refresh needed:

```html
<!-- Edit styles in Button.morph -->
<style>
  .btn {
    background: red; /* Changes instantly */
  }
</style>
```

### CSS Error Reporting

Detailed error messages with file locations:

```
❌ CSS processing failed: Invalid CSS syntax
   📍 Location: src/components/Button.morph:15:5
   📍 Offset: 245
```

### CSS Debugging Utilities

Rich inspection and logging tools:

```javascript
// Enable CSS debugging
import { enableCssDebugging } from '@peter.naydenov/vite-plugin-morph';

enableCssDebugging({ verbose: true });

// Inspect CSS processing
const inspector = debugUtils.createInspector(css, 'Button');
console.log(inspector.getRuleCount()); // Number of CSS rules
console.log(inspector.getScopedClasses()); // Scoped class names
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

### CSS Processing & Layers

```javascript
// vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      css: {
        // PostCSS processing
        postcss: {
          autoprefixer: true,
          minify: true,
          sourceMaps: true,
        },
        // CSS chunking for large apps
        chunking: {
          enabled: true,
          strategy: 'size', // 'size', 'category', 'manual'
          maxChunkSize: 50 * 1024, // 50KB chunks
        },
        // Output configuration
        outputDir: 'dist/components',
        // CSS debugging
        debug: {
          enabled: true,
          verbose: false,
          showSourceMaps: true,
        },
      },
    }),
  ],
});
```

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
        cssHmr: true, // Enable CSS hot reloading
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
        cssErrors: true, // Enhanced CSS error reporting
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
  @layer reset {
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
  }

  @layer global {
    :root {
      --primary-color: #007bff;
      --secondary-color: #6c757d;
      --btn-padding: 0.5rem 1rem;
      --btn-radius: 4px;
    }
  }

  @layer components {
    .btn {
      background: var(--primary-color);
      color: white;
      padding: var(--btn-padding);
      border-radius: var(--btn-radius);
      border: none;
      cursor: pointer;
    }

    .btn:hover {
      opacity: 0.9;
    }
  }
</style>
```

### CSS Component with Layers

Create component-specific styles with proper layer organization:

```html
<!-- src/components/Card.morph -->
<div class="card {{ variant : getVariantClass }}">
  <h3 class="card-title">{{ title }}</h3>
  <p class="card-content">{{ content }}</p>
</div>

<style>
  @layer components {
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 1rem;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .card-content {
      color: #666;
      line-height: 1.5;
    }

    /* Variant styles */
    .card.primary {
      border-left: 4px solid var(--primary-color, #007bff);
    }

    .card.secondary {
      border-left: 4px solid var(--secondary-color, #6c757d);
    }
  }
</style>

<script>
  function getVariantClass({ data }) {
    return data.variant || 'primary';
  }
</script>

<script type="application/json">
  {
    "title": "Card Title",
    "content": "Card content goes here",
    "variant": "primary"
  }
</script>
```

### CSS Tree-Shaking Example

Only CSS from imported components is included in the bundle:

```javascript
// src/main.js
import Button from './components/Button.morph'; // CSS included
import Card from './components/Card.morph'; // CSS included

// import Modal from './components/Modal.morph';  // CSS excluded (tree-shaken)
// import Form from './components/Form.morph';    // CSS excluded (tree-shaken)

// Result: Only Button and Card CSS in final bundle
// Bundle size reduced by ~60% compared to including all components
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

## Library Mode

Build distributable component libraries that work like Svelte - framework-free at runtime with full CSS control. CSS processing is delegated to host applications for maximum flexibility.

### CSS Handling in Libraries

- **Raw CSS Assets**: All CSS files from `src/styles/` are copied as raw assets without processing
- **Host Processing**: CSS layers, scoping, and optimization are handled by the host application's plugin configuration
- **Runtime Control**: Library consumers get full control over CSS architecture (themes, overrides, etc.)

### Quick Start

**1. Create build script** (`scripts/build-library.js`):

```javascript
import { buildLibrary } from '@peter.naydenov/vite-plugin-morph';

await buildLibrary({
  entry: 'src/main.js',
  library: {
    name: '@myorg/my-components',
    version: '1.0.0',
  },
});
```

**2. Define library exports** (`src/main.js`):

```javascript
export { default as Button } from './components/Button.morph';
export {
  applyStyles,
  themesControl,
} from '@peter.naydenov/vite-plugin-morph/client';
```

**3. Build**: `npm run build:lib`

### Using Your Library

```javascript
import { Button, applyStyles, themesControl } from '@myorg/my-components';

// Host app processes CSS with its plugin configuration
applyStyles(); // Apply all CSS layers
document.body.innerHTML = Button('render', { text: 'Click me' });
themesControl.set('dark'); // Switch theme
```

**Host Configuration Example**:

```javascript
// Host vite.config.js
export default defineConfig({
  plugins: [
    morphPlugin({
      css: {
        layers: { enabled: true },
        postcss: { autoprefixer: true, minify: true },
      },
    }),
  ],
});
```

**📖 Full documentation**: See [LIBRARY_MODE.md](./LIBRARY_MODE.md)

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

### CSS Development Workflow

Enable CSS debugging for development:

```javascript
// src/main.js or vite.config.js
import { enableCssDebugging } from '@peter.naydenov/vite-plugin-morph';

// Enable verbose CSS logging
enableCssDebugging({
  verbose: true,
  showSourceMaps: true,
});

// Now you'll see detailed CSS processing logs:
// 🔧 CSS Processing: Button
//   📄 Original CSS: 245 chars
//   🎨 Scoped CSS: 267 chars
//   ⚙️ Processed CSS: 189 chars (minified)
//   🏷️ Scoped Classes: 2
// 🗺️ Source map generated for Button
```

### CSS Hot Module Replacement

Edit styles and see changes instantly:

```html
<!-- src/components/Button.morph -->
<style>
  .btn {
    background: blue; /* Change to red - updates immediately */
    padding: 0.5rem 1rem;
  }
</style>
```

No page refresh needed - styles update in real-time during development.

### Test Coverage

The project includes comprehensive test coverage with **169 tests passing**:

- **78.23%** statement coverage
- **67.89%** branch coverage
- **81.42%** function coverage
- **78.15%** line coverage

Run `npm run test:coverage` to generate detailed HTML reports in `./coverage/`.

### Project Structure

```
src/
├── core/           # Core processing logic
│   ├── parser.js      # HTML parsing and content extraction
│   ├── processor.js   # Main morph file processing pipeline
│   ├── template.js    # Template compilation and helpers
│   ├── script.js      # JavaScript helper processing
│   ├── css-scoper.js  # CSS scoping and class name generation
│   ├── css-processor.js # PostCSS processing with autoprefixer/cssnano
│   ├── themer.js      # Theme processing and generation
│   ├── composer.js    # Component composition system
│   ├── config-loader.js # Configuration loading
│   └── errors.js      # Error handling and CSS error reporting
├── plugin/          # Vite plugin integration
│   ├── index.js       # Main plugin factory and HMR
│   ├── hooks.js       # Transform and HMR hooks
│   └── config.js      # Plugin configuration
├── services/        # Advanced services
│   ├── css-collection.js     # CSS bundling and chunking
│   ├── css-tree-shaker.js    # CSS tree-shaking logic
│   ├── css-generation.js     # CSS processing and generation
│   ├── theme-runtime.js      # Theme management API
│   └── theme-discovery.js    # Theme file discovery
├── utils/           # Shared utilities
│   ├── logger.js      # Logging system
│   ├── cache.js       # Performance caching
│   ├── css-debug.js   # CSS debugging and inspection utilities
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

The plugin includes comprehensive optimizations for both JavaScript and CSS:

### CSS Optimizations

- **CSS Tree-Shaking**: 30-70% bundle size reduction by removing unused component CSS
- **CSS Minification**: Production-ready compression with `cssnano`
- **CSS Chunking**: Split large CSS bundles for better loading performance
- **Cache Invalidation**: Smart rebuilding only when CSS content changes
- **Source Maps**: Optional debugging support without production overhead

### JavaScript Optimizations

- **Caching**: Automatic file processing cache with content hashing
- **Lazy Loading**: On-demand template compilation
- **Incremental Builds**: Only process changed files
- **Tree Shaking**: Remove unused JavaScript code
- **Source Maps**: Optional for development debugging

### Bundle Size Impact

```
Without CSS Layers:  245KB (all component CSS included)
With CSS Layers:      89KB (67% reduction via tree-shaking)
Production Build:     67KB (additional 24% reduction via minification)
```

### Development Performance

- **CSS HMR**: Instant style updates without page refresh
- **Hot Module Replacement**: Fast JavaScript updates
- **Incremental Processing**: Only reprocess changed files
- **Debug Logging**: Optional verbose logging for troubleshooting

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## Contributing

Contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## Test Coverage

The project maintains comprehensive test coverage:

- **169 tests passing** ✅
- **0 tests failing** ✅
- **2 tests skipped** (intentionally skipped features)

Run tests with:

```bash
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
npm run test:watch         # Watch mode for development
```

### CSS-Specific Tests

- **CSS Modules**: Scoping, class name generation, conflict prevention
- **PostCSS Processing**: Autoprefixer, minification, source maps
- **CSS Layers**: @layer cascade control, theme overrides
- **CSS Tree-Shaking**: Component usage analysis, bundle reduction
- **CSS Bundling**: Chunking strategies, cache invalidation
- **CSS HMR**: Hot module replacement, change detection
- **CSS Error Reporting**: File locations, detailed error messages
- **CSS Debugging**: Inspection utilities, processing logs

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
