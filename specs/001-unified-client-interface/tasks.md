# Implementation Tasks: Unified Client Interface

**Date**: 2025-12-25
**Feature**: specs/001-unified-client-interface/spec.md
**Plan**: specs/001-unified-client-interface/plan.md

## Overview

Implementation of unified client interface for vite-plugin-morph providing identical `applyStyles()` and `themesControl` APIs across development, build, and library environments.

## Task Phases

### Phase 1: Environment Detection & Runtime Architecture

#### 1.1 Enhance Runtime Environment Detection ✅
- **ID**: ENV_DETECT
- **Description**: Implement automatic environment detection in `src/client/runtime.js`
- **Files**: `src/client/runtime.js`
- **Type**: Implementation
- **Dependencies**: None
- **Acceptance**: `detectEnvironment()` returns correct environment type

#### 1.2 Update applyStyles() with Environment Awareness ✅
- **ID**: APPLY_STYLES_ENV
- **Description**: Make `applyStyles()` adapt behavior based on detected environment
- **Files**: `src/client/runtime.js`
- **Type**: Implementation
- **Dependencies**: ENV_DETECT
- **Acceptance**: Different CSS injection strategies per environment

#### 1.3 Implement Real themesControl with Theme Switching ✅
- **ID**: THEMES_CONTROL_IMPL
- **Description**: Replace placeholder `themesControl` with DOM-manipulation theme switching
- **Files**: `src/client/runtime.js`
- **Type**: Implementation
- **Dependencies**: ENV_DETECT
- **Acceptance**: `themesControl.set()` updates `<link>` elements

### Phase 2: Virtual Module Refactoring ✅

#### 2.1 Modify generateClientModule() for Configuration ✅
- **ID**: VIRTUAL_MODULE_REFACTOR
- **Description**: Change plugin client generation to provide config data instead of code
- **Files**: `src/plugin/index.js`
- **Type**: Implementation
- **Dependencies**: APPLY_STYLES_ENV, THEMES_CONTROL_IMPL
- **Acceptance**: Virtual module exports `__morphConfig__` object

#### 2.2 Update Runtime to Consume Virtual Config ✅
- **ID**: RUNTIME_CONFIG_CONSUMPTION
- **Description**: Modify runtime to import and use `__morphConfig__` from virtual module
- **Files**: `src/client/runtime.js`
- **Type**: Implementation
- **Dependencies**: VIRTUAL_MODULE_REFACTOR
- **Acceptance**: Runtime uses config data for environment-specific behavior

### Phase 3: Theme System Unification ✅

#### 3.1 Implement DOM-based Theme Tracking ✅
- **ID**: DOM_THEME_TRACKING
- **Description**: Track current theme via DOM `<link id="morph-theme">` inspection
- **Files**: `src/client/runtime.js`
- **Type**: Implementation
- **Dependencies**: THEMES_CONTROL_IMPL
- **Acceptance**: `getCurrent()` reads from DOM link href

#### 3.2 Ensure Theme Controller Works Across Environments ✅
- **ID**: THEME_CONTROLLER_VALIDATION
- **Description**: Validate theme switching works in dev, build, and library modes
- **Files**: `src/client/runtime.js`, tests
- **Type**: Testing
- **Dependencies**: DOM_THEME_TRACKING
- **Acceptance**: Theme switching works consistently across environments

### Phase 4: Library Builder Integration

#### 4.1 Update Library Builder Client Generation
- **ID**: LIBRARY_BUILDER_UPDATE
- **Description**: Modify library builder to use unified runtime instead of custom generation
- **Files**: `src/services/library-builder.js`
- **Type**: Implementation
- **Dependencies**: VIRTUAL_MODULE_REFACTOR
- **Acceptance**: Library builds use same runtime as development

#### 4.2 Generate Library-Specific Config
- **ID**: LIBRARY_CONFIG_GENERATION
- **Description**: Create `__morphConfig__` for library mode with asset URLs
- **Files**: `src/services/library-builder.js`
- **Type**: Implementation
- **Dependencies**: LIBRARY_BUILDER_UPDATE
- **Acceptance**: Libraries export proper config for their assets

### Phase 5: CSS Layer Management

#### 5.1 Standardize CSS Layer Application Order
- **ID**: CSS_LAYER_ORDERING
- **Description**: Ensure CSS layers apply in consistent order: general → components → themes
- **Files**: `src/client/runtime.js`
- **Type**: Implementation
- **Dependencies**: APPLY_STYLES_ENV
- **Acceptance**: CSS injection follows guaranteed ordering

#### 5.2 Validate Environment-Specific Layer Sources
- **ID**: CSS_LAYER_SOURCES_VALIDATION
- **Description**: Verify correct CSS sources per environment (embedded vs URLs)
- **Files**: `src/client/runtime.js`, tests
- **Type**: Testing
- **Dependencies**: CSS_LAYER_ORDERING
- **Acceptance**: Dev uses `<style>`, production uses `<link>`

### Phase 6: Import Path Unification

#### 6.1 Verify Package Export Configuration
- **ID**: PACKAGE_EXPORTS_VERIFICATION
- **Description**: Ensure `./client` export points to correct runtime file
- **Files**: `package.json`
- **Type**: Configuration
- **Dependencies**: None
- **Acceptance**: Import path works in all consumption scenarios

#### 6.2 Update Library Package Generation
- **ID**: LIBRARY_PACKAGE_EXPORTS
- **Description**: Ensure built libraries export client interface correctly
- **Files**: `src/services/library-builder.js`
- **Type**: Implementation
- **Dependencies**: LIBRARY_BUILDER_UPDATE
- **Acceptance**: Built libraries provide unified client interface

### Phase 7: Testing and Validation

#### 7.1 Test Unified Runtime Across Environments
- **ID**: UNIFIED_RUNTIME_TESTS
- **Description**: Create tests validating runtime works identically in dev/build/library
- **Files**: `tests/integration/`, `tests/unit/`
- **Type**: Testing
- **Dependencies**: All implementation tasks
- **Acceptance**: Runtime passes all environment scenarios

#### 7.2 Validate Developer Experience Unification
- **ID**: DEVELOPER_EXPERIENCE_VALIDATION
- **Description**: Test that same import/code works across all environments
- **Files**: `examples/`, integration tests
- **Type**: Testing
- **Dependencies**: UNIFIED_RUNTIME_TESTS
- **Acceptance**: No environment-specific code required

#### 7.3 Performance and Bundle Size Validation
- **ID**: PERFORMANCE_VALIDATION
- **Description**: Ensure minimal bundle impact and fast CSS injection
- **Files**: Build outputs, performance tests
- **Type**: Testing
- **Dependencies**: All tasks
- **Acceptance**: Bundle size remains minimal, CSS injection <50ms

## Execution Flow

1. **Sequential Phases**: Complete each phase before moving to next
2. **Dependencies**: Respect task dependencies (e.g., ENV_DETECT before APPLY_STYLES_ENV)
3. **Testing Integration**: Run tests after implementation tasks in same phase
4. **Validation**: Phase 7 validates all previous work

## Completion Criteria

- ✅ All tasks marked complete in this file
- ✅ Tests pass for unified client interface
- ✅ Same code works across dev, build, and library environments
- ✅ Framework-free bundles with minimal size impact
- ✅ CSS layers apply in correct order
- ✅ Theme switching works via DOM manipulation</content>
<parameter name="filePath">specs/001-unified-client-interface/tasks.md