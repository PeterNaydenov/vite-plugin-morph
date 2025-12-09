# Implementation Plan: Morph Composition and Theme System

**Branch**: `002-morph-composition-theme` | **Date**: 2025-12-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-morph-composition-theme/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add build-time component composition and CSS theme system to the existing morph plugin, enabling developers to create UI variations through configuration files and switch themes at runtime without application rebuilds.

## Technical Context

**Language/Version**: JavaScript (ES2022) with JSDoc types, compiled to d.ts  
**Primary Dependencies**: @peter.naydenov/morph v3.1.5, Vite 4.x plugin API, parse5 for HTML AST parsing  
**Storage**: File system (morph files, configuration files), CSS files for themes  
**Testing**: Vitest with Vite test utilities for comprehensive plugin testing  
**Target Platform**: Node.js 16+ build tools (development and production)  
**Project Type**: Enhanced Vite plugin library with composition and theme capabilities  
**Performance Goals**: <100ms theme switching, <50ms hot module replacement, <2s build for 100+ files  
**Constraints**: Must integrate seamlessly with Vite dev server, support ES2020+ browsers, maintain backward compatibility  
**Scale/Scope**: Support projects with 100+ morph files and 20+ themes, handle complex composition hierarchies

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Vite Plugin API Compliance ✅

- Plugin will follow Vite plugin API specifications
- TypeScript types will be properly implemented
- Configuration validation with meaningful error messages

### Git Integration Safety ⚠️ NOT APPLICABLE

- This plugin doesn't involve git operations
- Constitution principle not relevant to this feature

### Performance Optimization ✅

- <100ms theme switching goal aligns with minimizing runtime impact
- <50ms hot module replacement for development experience
- <2s build time for large projects maintains developer productivity

### Configuration Simplicity ✅

- morph.config.js follows standard JavaScript module pattern
- Theme naming convention provides clear defaults
- Error messages for configuration and theme issues

### Error Handling ✅

- Clear error messages for missing components and invalid configurations
- Graceful handling of theme inheritance conflicts
- Build failure prevention for critical errors

**GATE STATUS**: ✅ PASS - All applicable constitution principles addressed

### Post-Design Constitution Check ✅

After completing Phase 1 design, all constitution principles remain properly addressed:

- **Vite Plugin API Compliance**: Design follows Vite plugin patterns with proper hooks and TypeScript types
- **Performance Optimization**: Selective regeneration, caching, and efficient theme switching address performance requirements
- **Configuration Simplicity**: Clear configuration options with sensible defaults and naming conventions
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
│   ├── composer.js         # NEW: Component composition using morph curry
│   ├── themer.js           # NEW: Theme discovery and CSS generation
│   └── errors.js          # Error handling and reporting
├── plugin/
│   ├── index.js           # Main Vite plugin entry point
│   ├── hooks.js           # Vite plugin hooks implementation
│   ├── config.js          # Plugin configuration and validation
│   ├── hmr.js             # NEW: Hot module replacement for compositions/themes
│   └── runtime/            # NEW: Runtime plugins for theme/component management
│       ├── theme-manager.js   # Theme switching API
│       ├── component-registry.js # Composition metadata API
│       └── dev-info.js       # Development information helpers
├── utils/
│   ├── cache.js           # File processing cache
│   ├── logger.js          # Debug and error logging
│   ├── helpers.js         # Utility functions
│   └── file-watcher.js    # NEW: File watching for HMR
├── types/
│   ├── index.js           # JSDoc type definitions
│   ├── plugin.js          # Plugin-specific types
│   ├── processing.js      # Processing pipeline types
│   ├── composition.js     # NEW: Composition system types
│   └── theme.js           # NEW: Theme system types
└── index.js              # Package entry point

dist/
├── types/                 # Compiled d.ts files from JSDoc
└── runtime/               # Packaged runtime plugins for distribution

tests/
├── unit/
│   ├── parser.test.js
│   ├── processor.test.js
│   ├── template.test.js
│   ├── composer.test.js     # NEW: Composition system tests
│   ├── themer.test.js       # NEW: Theme system tests
│   └── runtime/            # NEW: Runtime plugin tests
│       ├── theme-manager.test.js
│       ├── component-registry.test.js
│       └── dev-info.test.js
├── integration/
│   ├── plugin.test.js
│   ├── composition.test.js  # NEW: End-to-end composition testing
│   ├── theme.test.js       # NEW: End-to-end theme testing
│   └── hmr.test.js         # NEW: Hot module replacement testing
├── fixtures/
│   ├── basic.morph
│   ├── complex.morph
│   ├── composition-config.morph # NEW: Test composition scenarios
│   ├── theme-config.morph      # NEW: Test theme scenarios
│   └── error-cases.morph
└── setup.js              # Test configuration and utilities
```

**Structure Decision**: Enhanced Vite plugin with clear separation of concerns - existing core processing, new composition and theme systems, runtime plugins, comprehensive testing structure, and JSDoc-to-d.ts compilation for TypeScript compatibility.

**Build Process**: JavaScript source files with JSDoc annotations will be compiled to d.ts files using jsdoc-to-typescript or similar tool, providing TypeScript compatibility while maintaining JavaScript codebase.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations identified. All applicable principles are addressed in the implementation plan.

**Complexity Justification**:

| Component                       | Why Needed                                                             | Simpler Alternative Rejected Because                            |
| ------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Component Composition System    | Required for configuration-driven component assembly using morph curry | Manual composition would be error-prone and not scalable        |
| Theme Discovery & Processing    | Required for automatic theme detection and CSS generation              | Manual theme management would be cumbersome and error-prone     |
| Runtime Plugin Architecture     | Required for theme switching and component metadata without rebuild    | Static-only approach would not provide runtime flexibility      |
| Hot Module Replacement          | Required for productive development workflow with compositions/themes  | Manual rebuilds would significantly slow development            |
| Configuration File Parsing      | Required for morph.config.js composition definitions                   | Hard-coded compositions would not be flexible                   |
| CSS Link Switching              | Required for fast runtime theme changes (<100ms)                       | Full page reloads would provide poor UX                         |
| Error Handling for Compositions | Required for clear developer feedback on missing components            | Silent failures would be difficult to debug                     |
| Theme Inheritance Support       | Required for extensible theme system                                   | Flat theme structure would limit reusability                    |
| Selective Regeneration          | Required for performance with large projects                           | Regenerating all compositions on every change would be too slow |

## Phase 0: Outline & Research

### Extracted Unknowns from Technical Context

All technical context items are resolved based on specification clarifications:

- **Target Environment**: ES2020+ browsers, Node.js 16+, Vite build system
- **Performance Targets**: <100ms theme switching, <50ms HMR, <2s build for 100+ files
- **Scale Requirements**: 100+ morph files, 20+ themes
- **Compatibility**: Full backward compatibility with existing morph projects

### Research Tasks

Since all technical context is clarified from specification, no additional research is needed. The implementation can proceed directly to Phase 1 design.

**Research Status**: ✅ COMPLETE - No NEEDS CLARIFICATION items remain

## Phase 1: Design & Contracts

### Data Model

Based on functional requirements and key entities from specification:

#### Core Entities

**Composition Definition**

```javascript
{
  name: string,           // Component name
  host: string,           // Host component file path
  placeholders: {          // Placeholder to component mappings
    [placeholderName]: string  // Component file path
  },
  helpers?: {             // Optional helper function mappings
    [helperName]: string   // Helper function reference
  },
  handshake?: object        // Optional handshake data merge
}
```

**Theme Metadata**

```javascript
{
  name: string,           // Theme name (e.g., "dark", "light")
  isDefault: boolean,      // Whether this is the default theme
  filePath: string,        // Source file path
  extends?: string,        // Parent theme for inheritance
  cssVariables: object,     // CSS custom properties defined
  generatedPath: string     // Output CSS file path
}
```

**Component Registry Entry**

```javascript
{
  name: string,           // Component name
  isComposed: boolean,    // Whether generated through composition
  source: 'file' | 'config', // Source type
  host?: string,          // Host component (if composed)
  placeholders?: object,   // Placeholder mappings (if composed)
  generatedPath: string     // Generated file path
}
```

#### Configuration Schema

```javascript
// morph.config.js
export default {
  components: {
    [componentName]: CompositionDefinition
  },
  themes?: {
    // Future: Theme-specific configuration
  }
}
```

### API Contracts

#### Theme Manager Runtime API

```javascript
interface ThemeManager {
  getCurrent(): string | null;     // Returns current theme name
  list(): string[];               // Returns available theme names
  load(themeName: string): void;   // Switches to specified theme
  default(): void;                 // Switches to default theme
}
```

#### Component Registry Runtime API

```javascript
interface ComponentRegistry {
  isComposed(componentName: string): boolean;
  getCompositionInfo(componentName: string): CompositionDefinition | null;
  getAllCompositions(): string[];
  getComponentSource(componentName: string): 'file' | 'config' | null;
}
```

#### Development Information API

```javascript
interface DevInfo {
  getComponentSource(componentName: string): string;
  getAllCompositions(): string[];
  getThemeInfo(themeName: string): ThemeMetadata;
}
```

### Quickstart Guide

#### Basic Composition Setup

1. Create `morph.config.js` in project root
2. Define component compositions using host/placeholder mappings
3. Run build process - composed components generated automatically
4. Import and use composed components like regular morph components

#### Theme System Setup

1. Create CSS-only morph files with `_css.{themeName}.morph` naming
2. Mark default theme with `_css.{themeName}.default.morph`
3. Build process generates CSS files in `dist/themes/`
4. Use runtime theme manager for dynamic switching

#### Development Workflow

1. Modify composition configurations or theme files
2. Changes automatically detected and applied via HMR
3. Use development information helpers for debugging
4. Build fails fast with clear error messages

### Agent Context Update

The implementation will add these new technologies to the agent context:

- **Component Composition**: Build-time assembly using morph curry
- **Theme System**: CSS discovery, generation, and runtime switching
- **Runtime Plugins**: Theme manager and component registry APIs
- **Hot Module Replacement**: Selective regeneration for compositions and themes

## Next Steps

With Phase 1 design complete, the implementation is ready for task generation. The next step would be to run `/speckit.tasks` to break down this plan into specific implementation tasks.

**Ready for Task Generation**: All design decisions made, contracts defined, and architecture planned.
