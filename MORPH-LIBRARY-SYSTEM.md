# Morph Library CSS Processing - Phase 1 Implementation Guide

## Overview

The morph library system enables component libraries to share CSS with CSS variables across host projects. When a host project imports components from a morph library, the library's CSS (with variables from multiple files) is automatically processed and made available to the browser.

## Problem Statement

1. Library has `main.css` with `@import` statements referencing other CSS files
2. Browser cannot resolve these imports directly
3. CSS variables are defined across multiple files and must be available together

## Solution Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Host Project  │     │ Morph Plugin    │     │   Library       │
│   (design-use)  │     │                 │     │ (my-components) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Import library    │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │  2. Detect libraries  │
         │                       │  (isMorphLibrary: true)
         │                       │───────────────────────>
         │                       │                       │
         │                       │  3. Process CSS       │
         │                       │  (PostCSS + import)   │
         │                       │  4. Cache result      │
         │                       │                       │
         │  5. Dev server        │                       │
         │  serves CSS           │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  6. Runtime loads     │                       │
         │  processed CSS        │                       │
         │───────────────────────│                       │
```

## Key Components

### 1. Library Detection (`library-css-processor.js`)

**Function:** `detectMorphLibraries(rootDir)`

Scans `node_modules` for packages with `isMorphLibrary: true` in `package.json`.

```javascript
// Detection algorithm
for each package in node_modules:
  read package.json
  if packageJson.isMorphLibrary:
    add to morphLibraries array
```

### 2. CSS Processing (`library-css-processor.js`)

**Function:** `processLibraryMainCSS(library, cacheDir, postcssConfig)`

1. Read library's `assets/main.css`
2. Process with PostCSS using `postcss-import` plugin
3. Add host project's PostCSS plugins
4. Create MD5 hash of processed CSS
5. Write to cache with hash-based filename

```javascript
// Processing algorithm
css = readFile(library.path + '/assets/main.css');
result = postcss([
  postcssImport({ path: [library.path + '/assets'] }),
  ...hostPostcssPlugins,
]).process(css, { from: mainCssPath });

hash = md5(result.css);
filename = `${safeName}-${hash}.css`;
writeFile(cacheDir + '/' + filename, result.css);
```

### 3. CSS Serving Middleware (`plugin/index.js`)

**Route:** `/@morph-processed/<libraryName>`

Serves cached CSS with prefix matching:

```javascript
// Middleware algorithm
urlPath = req.url.replace('/', '')
cachePath = cacheDir + '/' + urlPath

// Try exact match first
if not exists(cachePath):
  // Try prefix match (for URLs without hash)
  for file in cacheDir:
    if file.startsWith(urlPath):
      cachePath = file

if exists(cachePath):
  serve css
else:
  next()
```

### 4. Runtime Initialization (`client/runtime.js`)

**Flow:**

```
1. Library's index.mjs imports client.mjs
2. client.mjs calls setMorphConfig(config)
3. applyStyles() is called
4. Detects environment from config.environment
5. Calls applyStylesLibrary()
6. Fetches processed CSS from /@morph-processed/<libraryName>
7. Injects CSS directly into <style> tag
8. Falls back to raw CSS URLs if fetch fails
```

```javascript
// Runtime algorithm
const config = getConfig()
const env = config.environment || detectEnvironment()

switch (env) {
  case 'library':
    // Try processed CSS first
    const response = await fetch('/@morph-processed/' + libraryName)
    if (response.ok) {
      css = await response.text()
      injectStyleTag(css, 'morph-processed')
    } else {
      // Fallback to raw CSS URLs
      for url in config.cssUrls:
        createStyleLink(url)
    }
}
```

### 5. Library Builder (`library-builder.js`)

**Responsibilities:**

- Build library with Vite in library mode
- Generate `client.mjs` with config
- Add `import './client.mjs'` to `index.mjs`
- Copy runtime.js
- Set `isMorphLibrary: true` in package.json

**Generated client.mjs:**

```javascript
import { setMorphConfig, applyStyles } from './runtime.js';

const config = {
  environment: 'library',
  themes: ['dark', 'light'],
  defaultTheme: 'dark',
  cssUrls: ['assets/variables.css', 'assets/style.css', 'assets/main.css'],
  libraryName: '@myorg/my-components',
};

setMorphConfig(config);
applyStyles();
```

## File Structure

```
git-morph-plugin/
├── src/
│   ├── plugin/
│   │   └── index.js              # Vite plugin, hooks, middleware
│   ├── services/
│   │   ├── library-css-processor.js  # Detection, PostCSS processing
│   │   └── library-builder.js        # Library build orchestration
│   └── client/
│       └── runtime.js            # Browser runtime, CSS loading
├── dist/
│   └── lib/                      # Built library output
└── tests/
```

## Configuration

**Library package.json:**

```json
{
  "name": "@myorg/my-components",
  "isMorphLibrary": true, // Required for detection
  "exports": {
    ".": { "import": "./index.mjs" },
    "./client": "./client.mjs"
  }
}
```

**Library assets structure:**

```
dist/lib/
├── index.mjs          # Main entry (imports client.mjs)
├── client.mjs         # Runtime initialization
├── runtime.js         # Runtime functions
├── assets/
│   ├── main.css       # Entry CSS with @imports
│   ├── variables.css  # CSS variables
│   └── style.css      # Component styles
└── themes/
    ├── light.css
    └── dark.css
```

## Algorithm Summary

### Dev Mode Flow

```
1. Vite starts with morph plugin
2. Plugin's buildStart() hook runs
3. Scan node_modules for isMorphLibrary: true
4. For each library:
   a. Read assets/main.css
   b. Process with PostCSS (imports resolved)
   c. Hash result, write to .vite/cache/morph-processed/
5. Dev server starts
6. Browser loads page, imports library
7. Library's index.mjs imports client.mjs
8. setMorphConfig() called with environment: 'library'
9. applyStyles() called
10. applyStylesLibrary() fetches /@morph-processed/<name>
11. CSS injected, variables available globally
```

### Build Mode Flow

```
1. npm run build runs on host project
2. morph plugin's buildEnd() runs
3. Process library CSS (same as dev mode)
4. generateBundle() copies CSS to dist/assets/
5. Production build includes processed CSS
```

## Known Issues & Limitations

1. **Timing Issue:** `transformIndexHtml` runs before `buildStart`, so CSS injection via HTML transform doesn't work. Solution: Runtime fetches CSS dynamically.

2. **Environment Detection:** Browser's `import.meta.hot` causes `detectEnvironment()` to return `'development'`. Solution: Use `config.environment` from library config.

3. **Cache Invalidation:** CSS cache uses MD5 hash, but only updated on server restart. Hot reloading not yet implemented.

## Future Enhancements (Phase 2+)

- HMR for library CSS changes
- Theme injection via CSS custom properties
- CSS tree-shaking per component
- Source maps for processed CSS
- Production build optimization

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14  
**Phase:** 1 - Library CSS Processing
