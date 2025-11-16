# Vite Morph Plugin Quickstart

**Version**: 1.0.0  
**Date**: 2025-11-16  

## Overview

The Vite Morph Plugin processes `.morph` files and converts them to reusable ES modules. The plugin handles ALL CSS processing since `@peter.naydenov/morph` doesn't support CSS at all. It supports HTML-like templates with placeholders, JavaScript helper functions, CSS modules with global variables, and JSON handshake data.

## Installation

```bash
npm install vite-plugin-morph --save-dev
# or
yarn add vite-plugin-morph --dev
# or
pnpm add vite-plugin-morph --dev
```

## Basic Setup

### 1. Configure Vite

Add the plugin to your `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import morphPlugin from 'vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin()
  ]
});
```

### 2. Create Your First Morph File

Create a file `src/components/Button.morph`:

```html
<div class="container {{variant}}">
  <button class="btn {{size}}" onclick="{{onClick}}">
    {{text}}
  </button>
</div>

<script>
function onClick(event) {
  console.log('Button clicked:', event);
  // Emit custom event or call parent function
  if (window.buttonClickHandler) {
    window.buttonClickHandler(event);
  }
}

function getVariantClass(variant) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  };
  return variants[variant] || variants.primary;
}
</script>

<style>
.container {
  display: inline-block;
  margin: 0.5rem;
}

.btn {
  padding: var(--btn-padding, 0.5rem 1rem);
  border: none;
  border-radius: var(--btn-radius, 4px);
  font-family: var(--font-family, sans-serif);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: var(--btn-hover-bg, #f0f0f0);
}

.btn.small {
  padding: var(--btn-small-padding, 0.25rem 0.5rem);
  font-size: var(--btn-small-font, 0.875rem);
}

.btn.large {
  padding: var(--btn-large-padding, 0.75rem 1.5rem);
  font-size: var(--btn-large-font, 1.125rem);
}
</style>

<script type="application/json">
{
  "text": "Click me",
  "variant": "primary",
  "size": "medium",
  "onClick": "onClick"
}
</script>
```

### 3. Use the Component

Import and use the component in your application:

```javascript
import Button from './components/Button.morph';

// Render the button with default data
const buttonHTML = Button();

// Render with custom data
const customButton = Button({
  text: "Save Changes",
  variant: "primary",
  size: "large",
  onClick: (event) => console.log("Save clicked:", event)
});

// Add to DOM
document.body.innerHTML = customButton;
```

## Advanced Configuration

### Global CSS Variables

Create a global CSS file with variables:

```css
/* src/styles/globals.css */
:root {
  --btn-padding: 0.5rem 1rem;
  --btn-radius: 4px;
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --btn-hover-bg: #f0f0f0;
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --danger-color: #dc3545;
}
```

Configure the plugin to use global variables:

```javascript
import { defineConfig } from 'vite';
import morphPlugin from 'vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin({
      globalCSS: {
        directory: 'src/styles',
        include: ['**/*.css'],
        exclude: ['**/*.min.css']
      }
    })
  ]
});
```

### Production Optimization

Configure production settings:

```javascript
import { defineConfig } from 'vite';
import morphPlugin from 'vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin({
      production: {
        removeHandshake: true,  // Remove JSON handshake data
        minifyCSS: true         // Minify generated CSS
      },
      development: {
        sourceMaps: true,        // Include source maps
        hmr: true               // Enable hot module replacement
      },
      errorHandling: {
        failOnError: true,      // Fail build on errors
        showLocation: true,      // Show error locations
        maxErrors: 10           // Max errors to report
      }
    })
  ]
});
```

## Morph File Structure

### Template Section

The HTML template uses morph placeholder syntax:

```html
<!-- Basic placeholder -->
<div>{{message}}</div>

<!-- With data source and actions -->
<div>{{user : formatName, uppercase}}</div>

<!-- With output name -->
<div>{{user : formatName : displayName}}</div>

<!-- Multiple actions -->
<div>{{data : validate, transform, format : result}}</div>
```

### Script Section

JavaScript helper functions go in `<script>` tags:

```javascript
<script>
function formatName(user) {
  return `${user.firstName} ${user.lastName}`;
}

function uppercase(text) {
  return text.toUpperCase();
}

function validate(data) {
  if (!data) throw new Error('Data is required');
  return data;
}
</script>
```

### Style Section

CSS with module support and global variables:

```css
<style>
/* Local styles (will be scoped) */
.container {
  background: var(--container-bg, #fff);
  padding: 1rem;
}

/* Global variable usage */
.title {
  color: var(--primary-color, #000);
  font-size: var(--title-font-size, 1.5rem);
}

/* Media queries */
@media (max-width: 768px) {
  .container {
    padding: var(--container-padding-mobile, 0.5rem);
  }
}
</style>
```

### Handshake Section

Optional JSON for development reference:

```javascript
<script type="application/json">
{
  "message": "Hello World",
  "user": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "data": {
    "id": 123,
    "name": "Example"
  }
}
</script>
```

## CSS Module Usage

The plugin handles ALL CSS processing and automatically generates CSS module exports:

```javascript
import Button, { styles } from './components/Button.morph';

// Access generated class names
console.log(styles.container); // "container_a1b2c3"
console.log(styles.btn);       // "btn_d4e5f6"

// Use in other CSS
.other-component {
  composes: container from './components/Button.morph';
}
```

**Important**: Since @peter.naydenov/morph doesn't support CSS, all CSS processing (scoping, variables, modules) is handled entirely by this plugin.

## Hot Module Replacement

During development, changes to `.morph` files trigger automatic updates:

```javascript
// The component will automatically update when the .morph file changes
import Button from './components/Button.morph';

// HMR preserves component state
let currentData = { text: "Initial" };

setInterval(() => {
  currentData.text = `Updated at ${new Date().toLocaleTimeString()}`;
  document.body.innerHTML = Button(currentData);
}, 1000);
```

## Error Handling

The plugin provides detailed error messages:

```javascript
// Syntax errors in template
// Error: Invalid placeholder syntax in Button.morph:3:15
//   <div>{{invalid syntax}}</div>
//                ^^^^^^

// CSS errors
// Error: Invalid CSS property in Button.morph:8:5
//   .container { invalid-prop: value; }
//              ^^^^^^^^^^^^^

// JavaScript errors
// Error: Function 'undefinedFunction' not found in Button.morph:12:3
//   return undefinedFunction(data);
//          ^^^^^^^^^^^^^^^^
```

## Best Practices

### 1. Organize Components

```
src/
├── components/
│   ├── Button.morph
│   ├── Card.morph
│   └── Form.morph
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── themes.css
└── pages/
    ├── Home.morph
    └── About.morph
```

### 2. Use Global Variables Effectively

```css
/* Define design tokens */
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  
  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

### 3. Keep Helpers Focused

```javascript
<script>
// Good: Single responsibility
function formatDate(date) {
  return new Intl.DateTimeFormat().format(date);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Avoid: Complex functions with multiple concerns
function processComplexData(data) {
  // Too many responsibilities
}
</script>
```

### 4. Use Handshake for Documentation

```javascript
<script type="application/json">
{
  "description": "User profile card component",
  "props": {
    "user": {
      "type": "object",
      "required": true,
      "properties": {
        "name": "string",
        "email": "string",
        "avatar": "string"
      }
    },
    "showEmail": {
      "type": "boolean",
      "default": true
    }
  },
  "example": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "/avatar.jpg"
    },
    "showEmail": false
  }
}
</script>
```

## Troubleshooting

### Common Issues

1. **Global Variables Not Working**
   - Ensure global CSS directory is correctly configured
   - Check CSS file names match include patterns
   - Verify variable names use `--` prefix

2. **Build Failures**
   - Check for syntax errors in template, script, or style sections
   - Ensure all JavaScript functions are properly defined
   - Validate JSON handshake syntax

3. **HMR Not Working**
   - Ensure development mode is enabled
   - Check that HMR is not disabled in configuration
   - Verify file permissions and watch capabilities

### Debug Mode

Enable debug logging:

```javascript
import { defineConfig } from 'vite';
import morphPlugin from 'vite-plugin-morph';

export default defineConfig({
  plugins: [
    morphPlugin({
      // Enable debug logging
      debug: true
    })
  ]
});
```

## Next Steps

- Explore advanced template syntax in the [@peter.naydenov/morph documentation](https://github.com/peter-naydenov/morph)
- Learn about CSS-in-JS patterns with morph components
- Set up testing for your morph components
- Optimize build performance for large projects

## Support

- GitHub Issues: [vite-plugin-morph issues](https://github.com/your-repo/vite-plugin-morph/issues)
- Documentation: [Full API documentation](./docs/api.md)
- Examples: [Example projects](./examples/)