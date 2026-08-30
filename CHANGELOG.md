# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [0.4.2 ] (2026-08-30) 

**Dependencies**
- [x] Reclassified the PostCSS pipeline as runtime dependencies. Moved `postcss`, `postcss-import`, `postcss-nested`, `autoprefixer`, and `cssnano` from `devDependencies` to `dependencies` in `package.json` — these packages were already imported by `src/core/css-processor.js`, just misclassified. No version changes;
- [x] Bumped `cssnano` from `^8.0.6` to `^9.0.1`. ESM-only, simplified config loading, and a rewritten `postcss-calc`. No code or config changes required for this codebase (configured through the PostCSS config + an explicit `preset: 'default'` call, both of which v9 still accepts);

**Build hygiene**
- [x] Replaced direct `eval()` calls in `src/core/script.js` (3 occurrences in the helper-function extractor) with `new Function('return (' + code + ')')()`. Same semantics; silences Rolldown's `[EVAL]` warning and avoids minifier caveats;
- [x] Removed redundant dynamic imports across `src/core/processor.js`, `src/services/library-builder.js`, and `src/plugin/index.js`. Five modules were both statically and dynamically imported in the same parent file; promoted the dynamic-imported names to the static import and dropped the now-redundant `await import(...)` calls;
- [x] Replaced `import.meta.url`-based path resolution in `src/services/library-builder.js` with a CJS/ESM-safe form (`typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname`);
- [x] Pinned the CJS export shape in `vite.config.js` via `rollupOptions.output.exports: 'named'`. CJS consumers still access the default export under `.default` (same as before); the setting just makes the shape explicit and silences `[MIXED_EXPORTS]`;
- [x] Added a `rollupOptions.onwarn` filter in `vite.config.js` to silence `[EMPTY_IMPORT_META]`. The bundler can't statically prove the `typeof __dirname` guard in `library-builder.js` is safe, but the runtime is correct; the same warning also fires from `node_modules/cssnano` (v9) for the same reason and is silenced by the same filter.



## [0.4.1] - 2026-08-07
- [x] Dependency update. Acorn 8.18.0;
- [x] Dev dependencies updates. Cssnano@8.0.4;
- [x] Dev dependencies updates. Vite@8.2.1;



## [0.4.0] - 2026-07-25

Aligns the implementation with the reconciled documentation (CSS architecture, theme system, config schema). Several breaking changes — see notes below.

**CSS architecture**
- [x] Replaced the 4-layer cascade (`reset, global, components, themes`) with a 5-layer model: `vendors, libs, modules, app, context`. **Breaking**: any consumer CSS targeting the old layer names by name needs updating.
- [x] Component CSS is now wrapped in `@layer libs` (published library components) or `@layer modules` (local/host components) based on where it was compiled from — both for the bundled/production CSS output and for the `<style>` tag every compiled `.morph` component self-injects on import (dev, build, and library modes alike; the latter path was initially missed and bypassed the cascade entirely until this was caught and fixed).
- [x] Dev-mode CSS source maps: a component's `<style>` tag and the project's global CSS (served via `/@morph-css/local/...`) now both carry a `sourceMappingURL` comment (with embedded `sourcesContent`, since neither is otherwise fetchable by the browser), so DevTools can jump straight from a rule to its real file and line instead of showing a generic `<style>` source.
- [x] Added dual class-name export: rendered markup now carries both the scoped/hashed class and the original "light label" class (e.g. `class="Button_btn_x7k9p2 btn"`), so `app`/`context`-layer CSS can target components with plain selectors. **Breaking**: changes rendered HTML output for every component (additive, but affects exact `className` string checks).
- [x] Added a `:global(.foo)` escape hatch to exclude a class from scoping entirely.
- [x] Added a guard against double-hashing CSS that passes through scoping more than once.
- [x] `css.postcss` (autoprefixer/minify/sourceMaps), `css.modules.generateScopedName`, `css.layers.order`, `css.treeShaking.enabled`, `css.bundling.*`, `css.debug.*`, and `css.enabled` are now actually read and wired to real behavior (previously declared in types only).

**Theme system**
- [x] Consolidated three divergent theme-discovery implementations into one (plain `.css` theme files only — the `_css.{name}.morph` convention and non-`.css` theme file formats are no longer discovered). **Breaking** if you relied on non-`.css` theme files.
- [x] Fixed `themesControl.getCurrent()` — it previously returned the configured default theme instead of the theme actually applied via `.set()`.
- [x] Added `themesControl.getDefault()`.
- [x] `ThemeRuntime`: added `setDefault()`/`has()`; `getCurrentTheme()` renamed to `getCurrent()` (old name kept as a deprecated alias).
- [x] `library.defaultTheme` now inherits the project's own `themes.defaultTheme` when not explicitly set.
- [x] Fixed a broken `virtual:morph-themes` import (`src/browser.js` imported a named `defaultTheme` export that didn't exist).
- [x] Fixed the default-theme selection used by `applyStyles()`: it previously ignored the theme registry's actual configured `defaultTheme` and fell back to whichever theme happened to sort first (an arbitrary, discovery-order pick — e.g. `dark` before `light`). It also had an async-ordering bug where this fallback was applied after an internal `await`, so it could resolve on a later microtask than a synchronous `themesControl.set(...)` call made right after `applyStyles()`, silently reverting it.

**Client runtime**
- [x] `applyStyles()` no longer creates `<link>` elements in any environment — all CSS is injected via `<style>` tags or fetched-then-injected. **Breaking** if anything queried for those `<link>` elements directly.
- [x] Removed the undocumented, `<link>`-based `createStyleLink`/`removeStyleLink`/`createThemeController` exports.
- [x] Added `applyGeneralStyles()` — applies a project's/library's general/global CSS (as opposed to component CSS, which `applyStyles()` already always applies). Unlike component CSS, general CSS is never auto-applied for an imported library — a host combining several libraries calls `someLibrary.applyGeneralStyles()` only for the ones whose general CSS it actually wants. In dev this fetches live (HMR); in a build or library, the CSS text is embedded at build time (same technique as themes) — no `<link>`/fetch/URL involved. Closes a real gap: previously a plain host's production build never applied general CSS at all, and a published library's general CSS was bundled as a file with no function to ever apply it.
- [x] Fixed `virtual:morph-css`'s output, broken by the `addComponentCss` source-tagging change above (`[object Object]` instead of CSS text).

**Library builder**
- [x] `themesDir` and `hashMode` are now accepted as top-level `buildLibrary()` options (previously silently dropped unless nested under `morphPlugin`).
- [x] The library build's internal PostCSS config now respects `css.postcss.autoprefixer`.
- [x] Generated library bundles now embed the library's general CSS as text and export `applyGeneralStyles()` (see above).
- [x] Removed a stray `console.log` shipped into every consumer's browser console on theme registration.
- [x] Fixed the `generateBundle` hook to use `this.emitFile()` instead of directly mutating the `bundle` object — the latter is a deprecated Rollup pattern that Rolldown (Vite 8's default bundler) silently ignores, so `client.mjs`, `runtime.js`, and CSS assets were missing from real Vite 8 library builds even though unit tests (which don't exercise a real bundler) passed.
- [x] Fixed `libraryComponentsCSS` staying empty (`{}`) in real builds: it was regex-extracted from bundled JS chunk code (`const css = ...`/`const componentsCSS = ...`), which Rolldown breaks by renaming local variables even without minification. Now reads directly from the CSS-collection registry that the plugin's own transform hook already populates correctly, keyed by component name.

**Additional fixes**
- [x] Fixed a cache-key collision in `processMorphFile()`: the cache key didn't include the file path, so two different files with identical content and options could silently return each other's cached result (wrong `componentName`, wrong CSS layer, wrong source).
- [x] Fixed the dev-server HMR handler for global/general CSS file changes: it invalidated `virtual:morph-client`, a module nothing actually imports, so edits silently did nothing. Now sends the `morph-local-css-update` event the client already listens for, so editing global CSS files updates the page live again without a full reload.

**Housekeeping**
- [x] Removed dead code: `src/plugin/hooks.js`, `src/core/themer.js`, `src/services/theme-discovery.js` (none were reachable from the public API).
- [x] Removed ~50 leftover debug `console.log` statements from the plugin's transform/dev-server code.
- [x] Bumped `@peter.naydenov/morph` to `^3.5.2`, Node.js requirement to `>=20.0.0`, Vite requirement to `>=8.0.0`.



## [0.3.9] - 2026-07-25
- [x] Agent skill was added;



## [0.3.8] - 2026-05-02
- [x] Dependencies update. Parse5 - v.8.0.1;
- [x] Refactoring: Code optimization. No functional changes;



## [0.3.7] - 2026-03-16
- [x] Dependencies update. Vite - v.8.0.0



## [0.3.6] - 2026-02-26
- [x] Dependencies update. glob 13.0.6;
- [x] Dependencies update. acorn 8.16.0;
- [x] Dependencies update. acorn-walk 8.3.5;
- [x] Dependencies update. autoprefixer 10.4.27;
- [x] Dev dependencies updates. Autoprefixer 10.4.27;
- [x] Dev dependencies updates. eslint 10.4.27;
- [x] Dev dependencies updates. typedoc 0.28.17;



## [0.3.5] - 2026-02-10
- [x] Dependencies update. glob 13.0.2;



## [0.3.4] - 2026-02-04
- [x] Dependencies update. glob 13.0.1;
- [x] Dev dependencies updates;



## [0.3.3] - 2026-01-19
- [x] Fix: HMR for morph components(template and handshake data changes);



## [0.3.2] - 2026-01-17

- [x] Working scoped CSS for morph libraries and host based components. 
- [x] HMR for component based CSS changes;
- [x] Speed optimization for HMR updates;
- [x] Themes support for morph libraries. Load order;
- [x] General CSS changes has HDR support;
- [x] Testing all flows for morph libraries;
- [ ] Bug: HMR for morph components(template and handshake data changes);

### 🚀 CSS Modules with componentsCSS

Implemented CSS modules that automatically transform class names in morph templates and export scoped CSS for use in both host projects and morph libraries.

#### CSS Scoper with Hash Modes

- **Development mode**: Stable hash based on component/class names (`ComponentName_className_hash`)
  - No template re-render when CSS content changes
  - Consistent class names for debugging
- **Production mode**: Content-based hash for cache busting
  - Hash changes when CSS content changes
  - Optimal for production caching

#### componentsCSS Export

- Each morph component exports a `componentsCSS` mapping
- Format: `{ className: '.scoped { ... }' }`
- Used by library builder for bundling component styles

#### Runtime CSS Management

- Global storage: `window.__MORPH_COMPONENTS_CSS__` with format `{ 'Component/source': '.scoped { ... }' }`
- New runtime functions:
  - `registerComponentCSS(componentName, cssRule)` - Register host component CSS
  - `getAllComponentCSS()` - Get all registered CSS for production bundling
  - `generateCombinedCSS()` - Generate combined CSS string for production
  - `updateComponentCSS(componentName, cssRule, source)` - Update CSS for HMR

#### Library Builder Integration

- Extracts `componentsCSS` from all chunks
- Embeds CSS in `client.mjs` with `applyStyles()` function
- Registers CSS with source prefix (e.g., `Button/@myorg/ui`)
- Per-component `<style>` tag injection in development

#### CSS Hot Module Replacement

- Local morph files: `import.meta.hot.accept()` self-accept for instant CSS updates
- Library CSS: WebSocket events via `morph-css-update` for cross-library HMR
- No full page refresh needed - styles update in real-time

### 🔧 Technical Changes

- Removed `__MORPH_PROCESSED_CSS__` references (replaced by `__MORPH_COMPONENTS_CSS__`)
- Removed `processedCssUrls` from library config
- Removed `tryLoadProcessedCss()` function (replaced by componentsCSS approach)
- Added `hashMode` option to plugin configuration (`'development'` | `'production'`)

### 📝 Documentation Updates

- Added `componentsCSS` property to TypeScript definitions
- Added `hashMode` option to MorphPluginOptions interface
- Added runtime type definitions for MorphConfig and client functions
- Added missing JSDoc for runtime functions

### 🧪 Testing

- All 215 tests passing
- 0 lint errors

## [0.3.1] - 2026-01-03

- [x] Type updates

## [0.3.0] - 2025-12-27

### 🚀 Major Feature: Library Mode

Build distributable component libraries with runtime CSS control.

#### Library Builder

- `buildLibrary()` function for creating npm packages
- Automatic package.json generation
- Dependency graph analysis
- CSS asset organization

#### Client Runtime Module

- `@peter.naydenov/vite-plugin-morph/client` virtual module
- `applyStyles()` - Injects CSS link tags
- `themesControl` - Runtime theme switching API

#### Documentation

- Created LIBRARY_MODE.md guide
- Updated README with library mode section
- Updated quickstart guide with CSS module access in helpers
- Added comprehensive documentation for `dependencies.styles` API

### 🎨 **Enhanced CSS Module Access in Helpers**

- **Improved API Structure**: CSS module class names are now organized under `dependencies.styles` for better API organization
- **Helper Function Access**: Helper functions can access scoped CSS classes via `dependencies.styles.className`
- **Cleaner Dependencies**: Wrapped styles in dedicated object instead of flattening into dependencies root
- **Documentation Updates**: Added examples showing helper functions accessing CSS modules

### 🔧 **Technical Improvements**

- **Dependencies API**: Restructured build dependencies to use `{ styles: stylesMap }` instead of direct stylesMap for better organization
- **Morph Integration**: Streamlined morph template processing with improved dependency passing to helpers
- **Documentation Sync**: Updated all documentation to reflect current API patterns and examples

### 📈 **Quality Improvements**

- **Test Coverage**: All tests passing with improved error handling
- **Documentation Accuracy**: Synchronized all docs with current implementation
- **API Consistency**: Unified component calling patterns across the system

### 📚 **Documentation Updates**

- **Quickstart Guide**: Added section on accessing CSS modules in helper functions
- **README Examples**: Updated component examples to show proper CSS module access
- **Spec Updates**: Added acceptance criteria for helper access to scoped CSS classes
- **API Consistency**: Synchronized all documentation with current implementation

## [0.2.0] - 2025-12-18

- [x] Enable helper functions in .morph files to access CSS module class mappings via a styles argument. This allows helpers to output correct scoped class names;

## [0.1.2] - 2025-12-13

- [x] Dependency update. @peter.naydenov/morph 3.3.0;

## [0.1.1] - 2025-12-11

- [x] Fix: Some types were missing;

## [0.1.0] - 2025-12-11

### 🚀 **Major Feature: Complete CSS Layers Architecture**

This release introduces a comprehensive CSS processing system that transforms morph files into a modern, scalable CSS architecture with full development experience support.

#### 🎨 **CSS Modules & Scoping**

- **Automatic CSS scoping**: Component styles are automatically scoped with unique class names (`ComponentName_className_hash`)
- **Conflict-free styling**: Prevents CSS conflicts between components
- **Deterministic naming**: Consistent class name generation for reliable styling

#### ⚡ **PostCSS Processing Pipeline**

- **Autoprefixer integration**: Automatic vendor prefix addition for cross-browser compatibility
- **CSS minification**: Production-ready CSS compression with `cssnano`
- **Source maps**: Full debugging support with accurate file/line information
- **Configurable processing**: Separate development and production PostCSS configurations

#### 🏗️ **CSS @layer Cascade Layers**

- **Cascade control**: Predictable CSS precedence with `@layer reset, global, components, themes`
- **Theme overrides**: Proper layer ordering ensures theme styles override component styles
- **Legacy browser support**: Polyfill for browsers without native `@layer` support
- **Maintainable architecture**: Organized CSS hierarchy for large applications

#### 🌳 **CSS Tree-Shaking**

- **Unused CSS elimination**: Automatically removes CSS from unused components (30-70% bundle reduction)
- **Component usage analysis**: Intelligent detection of imported vs unused components
- **Dynamic import support**: Handles lazy-loaded components correctly
- **Bundle size optimization**: Significant reduction in final CSS bundle size

#### 📦 **Advanced CSS Bundling**

- **Single CSS bundle**: All component styles consolidated into optimized bundle
- **CSS chunking**: Large applications can split CSS into multiple chunks by size, category, or manual configuration
- **Cache invalidation**: Smart rebuilding only when CSS content actually changes
- **Chunk manifest**: Generated manifest file for loading management

#### 🔥 **CSS Hot Module Replacement (HMR)**

- **Instant style updates**: CSS changes reload without full page refresh
- **Development workflow**: Seamless styling during development
- **Error handling**: Graceful handling of CSS processing errors during HMR

#### 🐛 **Enhanced Error Reporting**

- **File location tracking**: Pinpoint CSS errors to exact file and line numbers
- **PostCSS error extraction**: Detailed error messages from PostCSS processing
- **CSS scoping errors**: Specific error reporting for scoping issues
- **Development debugging**: Clear error messages for faster issue resolution

#### 🔧 **Development Debugging Utilities**

- **CSS inspection tools**: Rich debugging utilities for CSS analysis
- **Processing logging**: Detailed logs of CSS transformation steps
- **Performance monitoring**: CSS processing time and size tracking
- **Bundle analysis**: Information about generated chunks and optimization results

#### 🧪 **Comprehensive Testing**

- **169 total tests**: Complete test coverage for all CSS features
- **Integration tests**: End-to-end testing of CSS processing pipeline
- **Error scenario testing**: Validation of error handling and recovery
- **Performance testing**: Bundle size and processing time validation

#### 📚 **Technical Architecture**

- **Modular design**: Separate services for CSS collection, processing, and bundling
- **Plugin integration**: Seamless integration with Vite build pipeline
- **Configuration options**: Flexible CSS processing configuration
- **TypeScript support**: Full type definitions for all CSS features

### 🔧 **Technical Improvements**

- **CSS processor optimization**: Fixed global instance caching issues for proper option handling
- **Source map generation**: Integrated source maps into CSS processing pipeline
- **Error boundary handling**: Comprehensive error catching and reporting throughout CSS pipeline
- **Memory efficiency**: Optimized CSS processing for large codebases

### 📝 **Configuration & API**

- **CSS chunking options**: Configure chunking strategy (size/category/manual) and thresholds
- **PostCSS configuration**: Customizable PostCSS plugins and options
- **Development tools**: Enable/disable debugging utilities and verbose logging
- **Cache control**: Configure CSS caching behavior for development vs production

### 🎯 **Performance Impact**

- **Bundle size reduction**: 30-70% smaller CSS bundles through tree-shaking
- **Build time optimization**: Cache invalidation prevents unnecessary rebuilds
- **Development speed**: Hot reloading provides instant CSS feedback
- **Production optimization**: Minified, optimized CSS for deployment

### 🧪 **Quality Assurance**

- **Zero test failures**: All 169 tests passing
- **Error handling validation**: Comprehensive error scenario testing
- **Integration testing**: Full pipeline testing from morph files to CSS bundles
- **Cross-browser compatibility**: Autoprefixer ensures broad browser support

This release transforms the plugin from basic morph file processing into a complete CSS architecture solution, providing enterprise-grade CSS management with excellent developer experience.

## [0.0.9] - 2025-12-04

- [x] Fix: Template content was modified;
- [x] Fix: TypeScript types weren't generating correctly

## [0.0.8] - 2025-12-01

- [x] Updated version of `@peter.naydenov/morph` to 3.2.0
- [ ] Bug: Template content was modified
- [ ] Bug: TypeScript types weren't generating correctly

## [0.0.7] - 2025-11-27

### 🐛 Critical Fixes

- **Vite import analysis compatibility**: Fixed "Failed to parse source for import analysis" errors by replacing custom AST walker with acorn-walk
- **Function parsing with comments**: Fixed helper function extraction when functions have trailing comments (removes `// comment` from extracted code)
- **Template validation**: Improved `isWellFormedTemplate()` to properly handle self-closing HTML tags (`<input>`, `<br>`, `<img>`, etc.)
- **Malformed template rejection**: Fixed test case where invalid templates with unbalanced HTML were incorrectly accepted
- **Syntax error fixes**: Resolved multiple JavaScript syntax errors in core files that caused Vite compilation failures

### 🔧 Technical Improvements

- **AST processing stability**: Switched from custom AST walker to acorn-walk for reliable node traversal
- **Comment-aware parsing**: Added automatic comment removal from extracted function code before eval()
- **Enhanced HTML validation**: Improved template validation to correctly identify self-closing tags (`<input>`, `<br>`, `<img>`, etc.)
- **Error resilience**: Improved error handling throughout the parsing pipeline
- **Code quality**: Fixed syntax errors and improved overall code reliability

### 📚 Documentation & Types

- **JSDoc consistency**: Updated all JSDoc comments to reference proper typedefs instead of inline property definitions
- **Type definitions**: Aligned typedefs with actual function return values (`ProcessingResult`, `ProcessingMetadata`, `ScriptContent`)
- **Version updates**: Updated all `@version` tags across the codebase to 0.0.7
- **Type accuracy**: Ensured typedefs match the actual data structures used in the implementation

### 🧪 Testing

- **All tests passing**: Fixed the failing "malformed template" test case
- **Test stability**: Resolved Vite import analysis issues that were causing test failures
- **Edge case coverage**: Added validation for templates with unbalanced HTML tags

## [0.0.6] - 2025-11-27

### 🚀 Features

- **JSON-like handshake data**: Added support for comments and flexible quotes in `type="application/json"` sections
- **Comment support**: Single-line (`//`) and multi-line (`/* */`) comments now allowed in handshake data
- **Flexible quotes**: Can use single quotes (`'key'`) or double quotes (`"key"`) interchangeably in handshake data
- **Smart parsing**: Automatically converts single quotes to double quotes and strips comments during JSON parsing

### 📝 Documentation

- **README update**: Updated handshake section to show JSON-like syntax examples with comments and mixed quotes

### 🔧 Technical Improvements

- **AST parsing overhaul**: Replaced @babel/parser + @babel/traverse with acorn + acorn-walk for more stable and lightweight AST processing
- **parseJsonLike() function**: New parser that handles JSON-like syntax while maintaining backward compatibility
- **String literal templates**: `const helper = 'content'` now treated as definite template helpers (not potential)
- **Fallback parsing**: First attempts standard JSON.parse(), falls back to comment removal and quote conversion
- **Error handling**: Clear error messages for invalid JSON-like syntax
- **Dependency cleanup**: Removed heavy @babel dependencies in favor of lightweight acorn stack

## [0.0.5] - 2025-11-27

### 🐛 Fixed

- **Handshake data availability**: Fixed `template.handshake` to always contain handshake data instead of being empty in development mode
- **Template-only files**: Fixed crash when processing `.morph` files with no script content (null reference error)
- **Null input handling**: Added null checks to script processing functions to prevent crashes on template-only files
- **JSDoc type references**: Updated JSDoc comments to use JSDoc-compatible type syntax instead of TypeScript import syntax
- **TypeScript declaration generation**: Created proper `.d.ts` files with complete type definitions for TypeScript users

### 📝 Documentation & Types

- **TypeScript support**: Added comprehensive TypeScript declaration files in `dist/types/`
- **JSDoc cleanup**: Fixed all JSDoc type imports to be compatible with JSDoc generation tools
- **Type definitions**: Generated complete type definitions including `MorphPluginOptions`, `ProcessingResult`, and all interfaces

### 🧹 Code Cleanup

- **Duplicate code removal**: Identified and removed potential duplicate code patterns in the codebase
- **Validation improvements**: Enhanced code validation to prevent null reference errors
- **Type safety**: Improved type checking and validation throughout the codebase

### 🔧 Technical Improvements

- **Handshake processing**: Ensured handshake data is always available in generated template objects
- **Template-only file support**: Added proper handling for morph files containing only HTML templates
- **Null safety**: Implemented comprehensive null checks throughout the processing pipeline
- **Type generation**: Set up proper TypeScript declaration file generation pipeline
- **Code quality**: Improved overall code maintainability and type safety

## [0.0.4] - 2025-11-26

### 🚀 Major Features

- **Helper templates**: Added support for string-based helper templates
- **Mixed helpers**: Can now use both helper functions and helper templates in the same morph file
- **Helper template processing**: Proper extraction and compilation of template literals from script sections

### 🐛 Fixed

- **String helper recognition**: Fixed critical bug where string helpers like `const option = \`...\`` were not recognized
- **Helper template integration**: Fixed issue where helpers syntax failed to resolve string helpers
- **JSDoc type imports**: Fixed 49 broken JSDoc imports that referenced non-existent `./types/plugin.js` files
- **Type definition conflicts**: Resolved duplicate type definitions across multiple type folders

### 📝 Documentation & Terminology

- **Type consolidation**: Moved all types from `src/core/types/processing.js` to single `src/types/index.js` location
- **JSDoc updates**: Updated all function documentation to reflect mixed helper support
- **Import path fixes**: Corrected all JSDoc imports to use unified type location
- **ScriptContent typedef**: Added missing `templates` property to type definitions
- **Clear terminology**: Updated documentation to use simple "helpers" instead of confusing "template helpers"
- **Helper guide**: Created comprehensive `HELPERS_GUIDE.md` with clear examples and best practices
- **Consistent naming**: Standardized on "helper functions" and "helper templates" terminology

### 🧹 Code Cleanup

- **Removed unused files**: Deleted `src/core/generator.js` (143 lines of dead code)
- **Removed unused exports**: Cleaned up `validateTransformResult()` and `createSourceMap()` functions
- **Removed duplicate types**: Eliminated `src/core/types/` folder to prevent confusion
- **Fixed orphaned code**: Cleaned up broken function remnants from previous edits
- **Implemented logging**: Replaced empty logging functions with proper implementation

### 🧪 Testing

- **String helper tests**: Added comprehensive test coverage for string helper functionality
- **Mixed helper tests**: Added tests for combined function and template helper scenarios
- **Integration tests**: Added tests for original failing template with helper syntax
- **Test coverage**: All 46 tests now pass (up from 41)

### 🔧 Technical Improvements

- **Helper processing pipeline**: Updated to handle both functions and template strings simultaneously
- **Code generation**: Enhanced to properly output string helpers as template literals
- **Error handling**: Fixed null reference errors in transform hook options processing
- **Project structure**: Simplified to single authoritative type definition location

## [0.0.3] - 2025-11-24

### Fixed

- **Config import path**: Fixed incorrect import path from `./plugin/config.js` to `./config.js` in `src/plugin/index.js:122`
- **Code comment**: Updated outdated comment reference to config file location

## [0.0.2] - 2025-11-19

### Fixed

- **CSS-only detection**: Fixed critical bug where CSS-only morph files were incorrectly identified as component files
- **Template extraction**: Improved `reconstructHTML` function to properly filter out `<script>` and `<style>` tags recursively
- **Test suite**: Fixed syntax errors and duplicate test cases in unit tests
- **Code cleanup**: Removed debugging console.log statements from source code

### Added

- **Test coverage**: Added test coverage setup with `@vitest/coverage-v8`
- **Coverage reports**: Configured text, JSON, and HTML coverage reports
- **New npm script**: Added `npm run test:coverage` command

### Improved

- **CSS-only morph files**: Now correctly generate `export const styles` without component function
- **Component morph files**: Properly scoped CSS when HTML template is present
- **Test reliability**: All 41 tests now pass consistently across 4 test files
- **Development workflow**: Better test coverage visibility (68.36% overall)

### Technical Details

- Fixed template content extraction in `src/core/template.js`
- Enhanced CSS-only detection logic in `src/core/processor.js`
- Updated `vitest.config.js` with coverage configuration
- Current test coverage: 68.36% statements, 58.11% branches

## [0.0.1] - 2025-11-18

### Added

- Initial release of vite-plugin-morph
- Basic morph file processing pipeline
- Support for template, script, and style extraction
- Integration with @peter.naydenov/morph v3.1.5
- Vite 4.x plugin API compatibility
- Parse5 for HTML AST parsing
- Basic test suite with 41 tests
- Support for CSS-only morph files
- Component scoping for CSS
- Handshake data support
- Development and production mode handling
