# Implementation Plan: Vite Morph Plugin

**Branch**: `001-morph-plugin` | **Date**: 2025-11-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-morph-plugin/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a Vite plugin that processes .morph files by converting them to @peter.naydenov/morph templates using AST parsing, then compiling to ES modules via the morph library's build method. The plugin will handle HTML-like templates, script functions, CSS modules with global variable support, and JSON handshake data with production optimization.

## Technical Context

**Language/Version**: JavaScript (ES2022) with JSDoc types, compiled to d.ts  
**Primary Dependencies**: @peter.naydenov/morph v3.1.5, Vite 4.x plugin API, parse5 for HTML AST parsing  
**Storage**: File system (morph files), CSS files for global variables  
**Testing**: Vitest with Vite test utilities for comprehensive plugin testing  
**Target Platform**: Node.js build tools (development and production)  
**Project Type**: Single Vite plugin library  
**Performance Goals**: <100ms compilation time, <50ms hot module replacement, 10% bundle size reduction in production  
**Constraints**: Must integrate seamlessly with Vite dev server, support both ESM and CommonJS, minimal bundle impact  
**Scale/Scope**: Support projects with 100+ morph files, handle complex CSS variable hierarchies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Vite Plugin API Compliance ✅
- Plugin will follow Vite plugin API specifications
- TypeScript types will be properly implemented
- Configuration validation with meaningful error messages

### Git Integration Safety ⚠️ NOT APPLICABLE
- This plugin doesn't involve git operations
- Constitution principle not relevant to this feature

### Performance Optimization ✅
- <100ms compilation time goal aligns with minimizing build impact
- Asynchronous processing for non-blocking operations
- Hot module replacement support maintained

### Configuration Simplicity ✅
- Global CSS directory configuration approach
- Default behavior for common use cases
- Clear error messages for configuration issues

### Error Handling ✅
- Specific error location information (file, line, column)
- Build failure prevention for malformed modules
- Graceful handling of missing dependencies

**GATE STATUS**: ✅ PASS - All applicable constitution principles addressed

### Post-Design Constitution Check ✅

After completing Phase 1 design, all constitution principles remain properly addressed:

- **Vite Plugin API Compliance**: Design follows Vite plugin patterns with proper hooks and TypeScript types
- **Performance Optimization**: Caching system, async processing, and selective recompilation address performance requirements
- **Configuration Simplicity**: Clear configuration options with sensible defaults
- **Error Handling**: Comprehensive error reporting with location information and graceful degradation
- **Git Integration Safety**: Not applicable to this feature

**FINAL GATE STATUS**: ✅ PASS - Ready for implementation

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── parser.js           # HTML AST parsing with parse5
│   ├── processor.js        # Main morph file processing pipeline
│   ├── template.js         # Template compilation with @peter.naydenov/morph
│   ├── css.js             # Complete CSS processing (morph doesn't handle CSS)
│   └── errors.js          # Error handling and reporting
├── plugin/
│   ├── index.js           # Main Vite plugin entry point
│   ├── hooks.js           # Vite plugin hooks implementation
│   ├── hmr.js             # Hot module replacement handling
│   └── config.js          # Plugin configuration and validation
├── utils/
│   ├── cache.js           # File processing cache
│   ├── logger.js          # Debug and error logging
│   └── helpers.js         # Utility functions
├── types/
│   ├── index.js           # JSDoc type definitions
│   ├── plugin.js          # Plugin-specific types
│   └── processing.js      # Processing pipeline types
└── index.js              # Package entry point

dist/
└── types/                 # Compiled d.ts files from JSDoc

tests/
├── unit/
│   ├── parser.test.js
│   ├── processor.test.js
│   ├── template.test.js
│   ├── css.test.js
│   └── plugin.test.js
├── integration/
│   ├── plugin.test.js
│   ├── hmr.test.js
│   └── build.test.js
├── fixtures/
│   ├── basic.morph
│   ├── complex.morph
│   └── error-cases.morph
└── setup.js              # Test configuration and utilities
```

**Structure Decision**: Single Vite plugin library with clear separation of concerns - core processing logic, plugin integration, utilities, comprehensive testing structure, and JSDoc-to-d.ts compilation for TypeScript compatibility.

**Build Process**: JavaScript source files with JSDoc annotations will be compiled to d.ts files using jsdoc-to-typescript or similar tool, providing TypeScript compatibility while maintaining JavaScript codebase.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations identified. All applicable principles are addressed in the implementation plan.

**Complexity Justification**:

| Component | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| HTML AST Parsing (parse5) | Required to parse .morph file structure with script/style tags | Simple regex parsing would be fragile and error-prone for complex HTML |
| Complete CSS Processing | Required since @peter.naydenov/morph doesn't support CSS at all | No CSS support would make .morph files unusable for styling |
| CSS Module Processing | Required for scoped styling and global variable support | Plain CSS would cause style conflicts between components |
| Error Location Tracking | Required for helpful developer experience | Generic errors would make debugging difficult |
| HMR Support | Required for good development experience | Manual rebuilds would significantly slow development |
| Caching System | Required for performance with many files | Reprocessing all files on every change would be too slow |
| JSDoc with d.ts compilation | Required for TypeScript compatibility while maintaining JavaScript codebase | Pure JavaScript would lose type safety; TypeScript would increase complexity |
