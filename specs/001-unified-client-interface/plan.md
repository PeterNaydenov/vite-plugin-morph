# Implementation Plan: Unified Client Interface

**Branch**: `001-unified-client-interface` | **Date**: 2025-12-25 | **Spec**: specs/001-unified-client-interface/spec.md
**Input**: Feature specification from `/specs/001-unified-client-interface/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a unified client interface for vite-plugin-morph that provides `applyStyles()` and `themesControl` functions working identically across development, build, and library modes. This eliminates environment-specific code and provides a Svelte-like developer experience with framework-free bundles containing only pure JavaScript functions.

## Technical Context

**Language/Version**: JavaScript (ES2022) with JSDoc types, compiled to d.ts + @peter.naydenov/morph v3.1.5, Vite 4.x plugin API, parse5 for HTML AST parsing
**Primary Dependencies**: @peter.naydenov/morph v3.1.5, Vite 4.x plugin API, parse5 for HTML AST parsing
**Storage**: File system (morph files), CSS files for global variables
**Testing**: vitest (unit and integration tests)
**Target Platform**: Node.js 16+ (build time), browser environments (runtime)
**Project Type**: Vite plugin (npm package)
**Performance Goals**: Minimal bundle size impact, fast CSS injection (<50ms), non-blocking CSS loading
**Constraints**: Framework-free bundles, unified API across environments, no environment-specific developer code
**Scale/Scope**: Single plugin package supporting unlimited morph components and themes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**✓ I. Vite Plugin API Compliance**: Implementation follows Vite plugin API specifications with proper hooks and configuration validation.

**✓ II. Git Integration Safety**: N/A - No git operations required for this feature.

**✓ III. Performance Optimization**: Focus on minimal bundle impact, fast CSS injection, and non-blocking operations.

**✓ IV. Configuration Simplicity**: Unified client API requires no complex configuration from developers.

**✓ V. Error Handling**: Defined behaviors for CSS loading failures, invalid themes, and multiple calls.

**Post-Design Re-check**: Design phase completed. All architectural decisions maintain constitution compliance. Virtual module approach ensures clean separation without compromising performance or API simplicity.

**Result**: All gates pass - implementation may proceed.

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
├── client/                 # Client runtime interface
│   └── runtime.js          # Unified applyStyles() and themesControl
├── core/                   # Core morph processing
│   ├── processor.js        # Morph file processing
│   ├── css-scoper.js       # CSS scoping logic
│   ├── css-processor.js    # CSS processing
│   └── parser.js           # HTML parsing
├── plugin/                 # Vite plugin implementation
│   ├── index.js            # Main plugin logic
│   ├── hooks.js            # Plugin hooks
│   └── config.js           # Configuration validation
├── services/               # Supporting services
│   ├── css-collection.js   # CSS bundling
│   ├── css-reader.js       # Global CSS reading
│   ├── library-builder.js  # Library building
│   └── theme-discovery.js  # Theme discovery
└── types/                  # TypeScript definitions
    └── index.d.ts

tests/
├── unit/                   # Unit tests
├── integration/            # Integration tests
└── fixtures/               # Test data
```

**Structure Decision**: Single Vite plugin project following the existing codebase structure. Core functionality is organized by responsibility (client interface, core processing, plugin logic, services). This maintains consistency with the current architecture while supporting the unified client interface.

