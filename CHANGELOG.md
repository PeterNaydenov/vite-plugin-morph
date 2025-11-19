# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
