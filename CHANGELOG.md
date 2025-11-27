# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2025-11-27

### 🐛 Fixed

- **Handshake data availability**: Fixed `template.handshake` to always contain handshake data instead of being empty in development mode
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
