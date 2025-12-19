# Component Library Setup Guide: Building with Vite-Plugin-Morph

This guide provides a comprehensive workflow for building a scalable component library using `vite-plugin-morph`. It covers setup, configuration, specific CSS strategies (General, Theme, Component), and implementing variation logic.

## 1. Installation & Setup

Ensure you have a Vite project initialized. Install the morph plugin:

```bash
npm install --save-dev @peter.naydenov/vite-plugin-morph @peter.naydenov/morph
```

Update your `vite.config.js`:

```javascript
import morphPlugin from '@peter.naydenov/vite-plugin-morph';

export default {
  plugins: [
    morphPlugin({
      // 1. Theme Configuration
      themes: {
        enabled: true,
        directories: ['src/themes'], // Store theme definitions here
        defaultTheme: 'default',
        watch: true,
        outputDir: 'dist/themes',
      },
      // 2. CSS Output Configuration
      css: {
        outputDir: 'dist/components', 
        chunking: {
          enabled: true,         // Enable chunking for performance
          strategy: 'size',      // 'size', 'category', or 'manual'
          maxChunkSize: 50 * 1024
        }
      }
    })
  ]
}
```

## 2. Directory Structure

Organize your library to separate global styles, themes, and components.

```
src/
├── components/          # Individual .morph components
│   ├── Button.morph
│   ├── Card.morph
│   └── Input.morph
├── styles/              # General/Global CSS (Reset, Typography)
│   └── main.css
├── themes/              # Theme Definitions
│   ├── default.css         # Default theme variables
│   └── dark.css            # Dark theme override
└── index.js             # Library entry point
```

## 3. General CSS (Resets & Typography)

Use standard CSS files for global styles that apply everywhere.

**`src/styles/main.css`**
```css
@layer reset, global, components, themes;

@layer reset {
  * { box-sizing: border-box; margin: 0; padding: 0; }
}

@layer global {
  body { font-family: sans-serif; }
}
```
*Import this file in your main entry point or application root.*

## 4. Global Themes

Themes define CSS variables that your components will consume. They act as the "design tokens".

**`src/themes/default.css`** (Default Theme)
```css
:root {
  --color-primary: #3b82f6;
  --color-text: #1f2937;
  --spacing-md: 1rem;
  --radius-sm: 0.25rem;
}
```

**`src/themes/dark.css`** (Dark Theme)
```css
:root {
  --color-primary: #60a5fa;
  --color-text: #f3f4f6;
}
```
*The plugin will process these into `dist/themes/default.css` and `dist/themes/dark.css`.*


## 5. Component-Based CSS

Each `.morph` file encapsulates its own structure, logic, and style. Styles are **scoped** automatically (hashed) to prevent leaks.

**`src/components/Button.morph`**
```html
<template>
  <button class="{{ variant : getClass }}">{{ label }}</button>
</template>

<script>
// Helper to manage dynamic classes based on variant
function getClass({ data, styles }) {
  const baseClass = styles.btn; // Access scoped class '.btn'
  
  // Handle variations
  if (data === 'primary') return `${baseClass} ${styles.primary}`;
  if (data === 'outline') return `${baseClass} ${styles.outline}`;
  
  return baseClass; // Default
}
</script>

<style>
.btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm); /* Use theme variable */
  border: none;
  cursor: pointer;
  background-color: #eee;
  color: var(--color-text);
  font-weight: 500;
}

/* Variations */
.primary {
  background-color: var(--color-primary);
  color: white;
}

.outline {
  background-color: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}
</style>

<script type="application/json">
{
  "label": "Click Me",
  "variant": "primary"
}
</script>
```

### Key Concept: The `styles` Argument
As shown above, helper functions receive a `styles` object in their props.
-   **`styles.btn`** maps to the unique, scoped class name (e.g., `Button_btn_x9z2a`).
-   **`styles.btn`** maps to the unique, scoped class name (e.g., `Button_btn_x9z2a`).
-   This allows you to write logic in JS while keeping CSS class names dynamic and collision-free.

### Usage of CSS Variables
You can freely use CSS variables (custom properties) inside your `.morph` files.
-   Variables defined in your **Global Themes** (e.g., `:root { --color-primary: ... }`) are available everywhere.
-   You typically **define** variables in your theme files (`src/themes/*.css`) and **consume** them in your component styles (`var(--color-primary)`), as shown in the button example above.

## 6. Using Internal Component Classes for Variations

To make your components robust, use internal classes for state or variations rather than exposing raw CSS classes to the consumer.

**Pattern:**
1.  Define the class logic in a **Helper Function** (e.g., `getClass`).
2.  Use **props definition** in the `styles` object to find the right class.
3.  Inject the result into the template.

**Example: Alert Component**
```html
<!-- src/components/Alert.morph -->
<div class="{{ type : getAlertClass }}">
  {{ message }}
</div>

<script>
function getAlertClass({ data, styles }) {
  // Map 'type' prop to internal styling classes
  const map = {
    info: styles.info,
    success: styles.success,
    warning: styles.warning,
    error: styles.error
  };
  
  // Combine base class + variant class
  return `${styles.alert} ${map[data] || styles.info}`;
}
</script>

<style>
.alert { padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
.info { background: #e0f2fe; color: #0369a1; }
.success { background: #dcfce7; color: #15803d; }
.warning { background: #fef9c3; color: #854d0e; }
.error { background: #fee2e2; color: #991b1b; }
</style>
```

## 7. Build & Output

Run your build command (`vite build`).

**Output:**
-   **JS Modules**: `dist/components/Button.js`, `Alert.js` (logic & templates)
-   **CSS Bundles**: `dist/components/components.css` (or chunks based on config)
-   **Theme CSS**: `dist/themes/default.css`, `dark.css`

Consumers of your library will import the JS components and link the CSS files they need (global styles + selected theme + component CSS).

## 8. Theme Switching (Dynamic Runtime)

You can enable dynamic theme switching in your application using the `ThemeRuntime` API provided by the plugin.

### Setup
Import the runtime helper and initialize it with your available themes.

```javascript
import { getThemeRuntime } from '@peter.naydenov/vite-plugin-morph/services/theme-runtime';

const runtime = getThemeRuntime({
  defaultTheme: 'default'
});

// Initialize with available themes (if using dynamic loading)
// or just use it to switch classes/variables if CSS is already loaded.
```

### Switching Themes
To switch the active theme:

```javascript
// Switch to 'dark' theme
await runtime.switchTheme('dark');
```

This will:
1.  Load the theme's CSS variables if not present.
2.  Update the document root styles.
3.  Notify any subscribers of the change.


## 9. Integration: The "Source Library" Pattern (Recommended)

Instead of pre-building your library into a complex `dist/` folder structure, you can treat your component library as **source code** that your application compiles. This provides a workflow similar to frameworks like Svelte or Vue, where everything is bundled by the consumer application.

**Advantages:**
-   **No "Double Build"**: No need to run `vite build --watch` in the library.
-   **Direct Debugging**: Debug source files directly in dev tools.
-   **Single Output**: Your application produces a single, optimized bundle.

### 1. Library Configuration
In your library's `package.json`, point `main` or `exports` to your source entry point (e.g., `src/index.js`), not `dist`.

```json
{
  "name": "my-component-library",
  "version": "1.0.0",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./themes/*": "./src/themes/*"
  }
}
```

Ensure your `src/index.js` exports your `.morph` components:
```javascript
export { default as Button } from './components/Button.morph';
export { default as Card } from './components/Card.morph';
```

### 2. Application Configuration
In your **consumer application's** `vite.config.js`:
1.  Add `vital-plugin-morph`.
2.  Add your library to `optimizeDeps.exclude`. **This is critical.** It forces Vite to treat your library as source code (compiling `.morph` files) rather than trying to pre-bundle it as a raw JS dependency.

```javascript
// vite.config.js in your APP
import { createMorphPlugin } from '@peter.naydenov/vite-plugin-morph';

export default {
  plugins: [
    createMorphPlugin({
      // Application-level config
      css: { outputDir: 'dist/assets' }
    })
  ],
  optimizeDeps: {
    // CRITICAL: Tells Vite to transpile this lib's source files
    exclude: ['my-component-library'] 
  }
}
```

### 3. Usage
Import directly from the package. No `dist` paths required.

```javascript
import { Button } from 'my-component-library';

// Import CSS variables (source file)
import 'my-component-library/src/themes/default.css';
```

### 4. Development Workflow
simply run `npm run dev` in your **consumer application**.
-   When you edit a file in `node_modules/my-component-library` (or a linked local folder), Vite detects the change, recompiles the `.morph` file, and HMR updates your app instantly.
-   You do **not** need to run any build command in the library folder.
