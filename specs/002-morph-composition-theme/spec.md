# Feature Specification: Morph Composition and Theme System

**Feature Branch**: `002-morph-composition-theme`  
**Created**: 2025-12-08  
**Status**: Draft  
**Input**: Build-time Composition and Theme System for morph files - configuration-driven component assembly using morph curry command, CSS theme system with automatic discovery and runtime switching, backward compatibility, hot module replacement

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configuration-Driven Component Composition (Priority: P1)

As a developer, I want to create new component variations by combining existing morph components through a configuration file, so that I can rapidly prototype and create UI variations without writing duplicate code.

**Why this priority**: This is the core functionality that enables the entire composition system - without configuration-driven composition, no other composition features can function.

**Independent Test**: Can be fully tested by creating a `morph.config.js` file with component compositions and verifying that the build process generates the expected composed components.

**Acceptance Scenarios**:

1. **Given** a `morph.config.js` file with component composition definitions, **When** the build process runs, **Then** new composed components are generated as ES modules
2. **Given** a composition definition specifies a host component and placeholder mappings, **When** the composition is generated, **Then** the placeholders in the host component are replaced with the specified components using morph curry
3. **Given** an existing component has a composition definition with the same name, **When** the build process runs, **Then** the composition definition takes precedence over the original file
4. **Given** a composition references a non-existent component, **When** the build process runs, **Then** the build fails with a clear error message indicating the missing component

---

### User Story 2 - CSS Theme System with Naming Convention (Priority: P1)

As a developer, I want to create CSS themes using a standardized naming convention, so that themes are automatically discovered and can be switched at runtime without manual configuration.

**Why this priority**: Theme system is essential for providing flexible styling options and enabling runtime theme switching capabilities.

**Independent Test**: Can be fully tested by creating CSS-only morph files with the `_css.{themeName}.morph` naming convention and verifying they are processed as themes.

**Acceptance Scenarios**:

1. **Given** a CSS-only morph file named `_css.dark.morph`, **When** the build process runs, **Then** a `dark.css` file is generated in the themes directory
2. **Given** a CSS-only morph file named `_css.dark.default.morph`, **When** the build process runs, **Then** the dark theme is marked as the default theme
3. **Given** multiple theme files exist with one marked as default, **When** the application starts, **Then** the default theme is automatically loaded
4. **Given** multiple files are marked as default themes, **When** the build process runs, **Then** the build fails with an error indicating only one default theme is allowed

---

### User Story 3 - Runtime Theme Switching (Priority: P2)

As a developer, I want to switch themes at runtime using a simple API, so that users can change the application's appearance without page reload or rebuild.

**Why this priority**: Runtime theme switching provides immediate user feedback and enhances user experience by allowing dynamic appearance changes.

**Independent Test**: Can be fully tested by importing the theme manager plugin and calling its methods to verify theme switching functionality.

**Acceptance Scenarios**:

1. **Given** the theme manager plugin is imported and initialized, **When** `themeControl.load('dark')` is called, **Then** the dark theme CSS is loaded and applied to the page
2. **Given** multiple themes are available, **When** `themeControl.list()` is called, **Then** an array of available theme names is returned
3. **Given** a theme is currently active, **When** `themeControl.getCurrent()` is called, **Then** the name of the currently active theme is returned
4. **Given** `themeControl.default()` is called, **Then** the application switches to the default theme defined during build time

---

### User Story 4 - Hot Module Replacement for Compositions and Themes (Priority: P2)

As a developer, I want changes to composition configurations and theme files to be automatically reflected during development, so that I can iterate quickly without manual rebuilds.

**Why this priority**: Hot module replacement is essential for productive development workflow and rapid iteration.

**Independent Test**: Can be fully tested by modifying composition configurations and theme files during development and verifying that changes are automatically applied.

**Acceptance Scenarios**:

1. **Given** a `morph.config.js` file is modified during development, **When** the change is saved, **Then** only the affected compositions are regenerated and hot-reloaded
2. **Given** a theme file is modified during development, **When** the change is saved, **Then** the corresponding CSS file is regenerated and the page reflects the changes
3. **Given** a base component used in compositions is modified, **When** the change is saved, **Then** all dependent compositions are regenerated and hot-reloaded
4. **Given** multiple files are changed simultaneously, **When** the build process runs, **Then** only the currently used compositions are regenerated, not all possible compositions

---

### User Story 5 - Component Registry and Development Information (Priority: P3)

As a developer, I want to query component metadata and composition information during development, so that I can debug composition issues and understand the component structure.

**Why this priority**: Development information and debugging tools are important for developer productivity but not essential for basic functionality.

**Independent Test**: Can be fully tested by importing the component registry plugin and verifying it provides accurate metadata about compositions and their sources.

**Acceptance Scenarios**:

1. **Given** a component is generated through composition, **When** `registry.isComposed('component-name')` is called, **Then** true is returned
2. **Given** a composed component exists, **When** `registry.getCompositionInfo('component-name')` is called, **Then** metadata about the host component and placeholder mappings is returned
3. **Given** multiple compositions exist, **When** `registry.getAllCompositions()` is called, **Then** an array of all composed component names is returned
4. **Given** development information is requested, **When** `dev.getComponentSource('component-name')` is called, **Then** information about whether the component comes from a file or configuration is returned

---

### Edge Cases

- What happens when composition definitions create circular dependencies?
- How does the system handle theme inheritance conflicts?
- What occurs when multiple themes define conflicting CSS variables?
- How are missing helper functions handled in compositions?
- What happens when theme files contain invalid CSS syntax?
- How does the system handle version mismatches between runtime plugins and generated files?
- What occurs when the configuration file contains invalid JavaScript syntax?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST parse `morph.config.js` configuration files for component composition definitions
- **FR-002**: System MUST generate composed components using morph curry command based on configuration definitions
- **FR-003**: System MUST follow resolution priority: configuration definition → original file → create from configuration
- **FR-004**: System MUST discover CSS-only morph files matching `_css.{themeName}.morph` pattern
- **FR-005**: System MUST identify default themes from `_css.{themeName}.default.morph` files
- **FR-006**: System MUST generate CSS files from theme morph files in a themes directory
- **FR-007**: System MUST provide runtime theme management plugin with getCurrent(), list(), load(), and default() methods
- **FR-008**: System MUST implement theme switching by changing CSS links in the document head
- **FR-009**: System MUST provide component registry plugin for querying composition metadata
- **FR-010**: System MUST support hot module replacement for configuration changes during development
- **FR-011**: System MUST support hot module replacement for theme file changes during development
- **FR-012**: System MUST regenerate only affected compositions when configuration changes
- **FR-013**: System MUST support theme inheritance through CSS imports in theme files
- **FR-014**: System MUST validate that only one default theme exists per theme family
- **FR-015**: System MUST provide development information helpers for debugging compositions and themes

### Non-Functional Requirements

- **NFR-001**: Build process MUST fail with clear error messages when composition references missing components
- **NFR-002**: Build process MUST fail when multiple default themes are detected for the same theme family
- **NFR-003**: System MUST maintain full backward compatibility with existing morph projects
- **NFR-004**: Generated compositions MUST work identically to manually created components
- **NFR-005**: Theme switching MUST complete within 100ms for optimal user experience
- **NFR-006**: Hot module replacement MUST update compositions within 50ms during development
- **NFR-007**: System MUST support projects with 100+ morph files and 20+ themes without performance degradation
- **NFR-008**: Generated CSS files MUST be optimized for production use
- **NFR-009**: Runtime plugins MUST be included in the main library for easier maintenance
- **NFR-010**: System MUST provide clear error messages with file locations for configuration syntax errors

### Key Entities _(include if feature involves data)_

- **Composition Definition**: Configuration entry specifying host component and placeholder mappings
- **Theme File**: CSS-only morph file following `_css.{themeName}.morph` naming convention
- **Default Theme**: Theme marked with `.default` suffix that loads automatically
- **Generated Component**: ES module created through morph curry composition process
- **Theme Registry**: Runtime metadata about available themes and their properties
- **Component Registry**: Runtime metadata about composed components and their sources
- **Configuration File**: `morph.config.js` file containing composition definitions
- **Hot Module Replacement**: Development feature for automatic regeneration and reloading

## Clarifications

### Session 2025-12-08

- Q: What are technical constraints for build system, runtime environment, and target platforms that could influence architecture decisions? → A: Target modern browsers (ES2020+) and Node.js 16+ with Vite as primary build tool

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can create new component variations through configuration in under 5 minutes
- **SC-002**: Theme switching completes in under 100ms for all supported themes
- **SC-003**: Hot module replacement updates compositions within 50ms during development
- **SC-004**: Build process generates compositions for projects with 100+ morph files in under 2 seconds
- **SC-005**: 95% of composition configurations generate successfully without syntax errors
- **SC-006**: Theme discovery and processing completes with 100% accuracy for properly named theme files
- **SC-007**: Runtime plugins provide accurate metadata for 100% of generated compositions and themes
- **SC-008**: Error messages provide specific location information in 95% of build failures
- **SC-009**: Existing morph projects continue to work without any modifications when upgrading
- **SC-010**: Theme inheritance works correctly for 100% of themes that use CSS imports

## Assumptions

- Developers are familiar with JavaScript ES6 modules and import/export syntax
- Projects use Vite as primary build system with hot module replacement support
- Target browsers support ES2020+ and CSS custom properties (variables)
- Morph library version supports curry command functionality
- Node.js 16+ runtime environment for build processes
- File system permissions allow reading configuration files and writing generated files
- Development environment supports file watching for hot module replacement

## Dependencies

- Existing morph plugin infrastructure for file processing and compilation
- Morph library curry command for component composition
- CSS processing capabilities for theme generation
- File watching system for hot module replacement
- Runtime plugin architecture for theme and component management
