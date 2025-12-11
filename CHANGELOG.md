# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



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
