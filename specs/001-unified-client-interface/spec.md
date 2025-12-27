# Feature Specification: Unified Client Interface

**Feature Branch**: `001-unified-client-interface`  
**Created**: 2025-12-25  
**Status**: Draft  
**Input**: User description: "Implementation Plan: Unified Svelte-like Experience Executive Summary This plan bridges the gaps identified in the gap analysis to create a truly unified "Svelte-like" development experience where @peter.naydenov/vite-plugin-morph/client provides identical APIs across all environments (development, build, and library modes). Current State Issues 1. Fragmented APIs: Three different applyStyles() implementations 2. Environment-specific code: Different behavior in dev vs library modes 3. Import inconsistencies: Different import paths and behaviors 4. No runtime unification: Code must be aware of execution context Target State Vision // This exact code works identically in ALL environments: import { applyStyles, themesControl } from '@peter.naydenov/vite-plugin-morph/client'; applyStyles(); // Creates links for general, theme, and component styles themesControl.set('dark'); // Switches theme via <link> manipulation Implementation Strategy Phase 1: Unified Runtime Architecture Goal: Create a single runtime that auto-detects environment and adapts behavior Changes: 1. Enhance src/client/runtime.js: - Add environment detection logic - Make applyStyles() environment-aware - Implement real themesControl with theme switching - Remove placeholder implementations 2. Add environment detection: function detectEnvironment() { if (typeof import.meta.hot !== 'undefined') return 'development'; if (typeof window !== 'undefined' && window.__MORPH_LIBRARY_MODE__) return 'library'; return 'build'; } 3. Update applyStyles(): export function applyStyles() { const env = detectEnvironment(); switch(env) { case 'development': return applyStylesDev(); case 'library': return applyStylesLibrary(); case 'build': return applyStylesBuild(); } } Phase 2: Virtual Module Refactoring Goal: Replace mode-specific client generation with configuration data Changes: 1. Modify src/plugin/index.js generateClientModule(): - Instead of overriding functions, provide configuration data - Return environment-specific config that runtime can consume 2. Update virtual module: // Instead of generating functions, provide data: export const __morphConfig__ = { environment: 'development', css: collectedCss, themes: availableThemes, themeUrls: { /* theme name -> URL mapping */ } }; 3. Update runtime to consume config: import { __morphConfig__ } from 'virtual:morph-client'; export function applyStyles() { // Use __morphConfig__ instead of generating different code } Phase 3: Theme System Unification Goal: Create consistent theme switching across all environments Changes: 1. Implement themesControl in runtime: export const themesControl = { list() { return __morphConfig__.themes || []; }, getCurrent() { return getCurrentThemeFromDOM(); }, getDefault() { return __morphConfig__.defaultTheme; }, set(themeName) { const url = __morphConfig__.themeUrls[themeName]; return createStyleLink(url, 'morph-theme'); } }; 2. DOM-based theme tracking: - Track current theme via <link id="morph-theme"> href - Provide consistent API regardless of environment Phase 4: Library Builder Integration Goal: Make library builder use unified runtime instead of separate implementation Changes: 1. Update src/services/library-builder.js: - Remove custom generateClientModule() - Use unified runtime with library-specific config 2. Library client generation: // Generate config for library mode export const __morphConfig__ = { environment: 'library', css: [], // URLs for library assets themes: ['default', 'dark'], themeUrls: { default: './themes/default.css', dark: './themes/dark.css' } }; Phase 5: CSS Layer Management Goal: Standardize CSS layer application across all environments Changes: 1. Define CSS layers consistently: // Always apply in this order: // 1. General/Global styles // 2. Component styles // 3. Theme styles 2. Environment-specific layer sources: - Dev: Embedded CSS in <style> tags - Build: Asset URLs in <link> tags - Library: Library bundle URLs in <link> tags Phase 6: Import Path Unification Goal: Ensure @peter.naydenov/vite-plugin-morph/client works everywhere Changes: 1. Update package.json exports: { ./client: { import: ./src/client/runtime.js, types: ./dist/types/index.d.ts } } 2. Library package.json generation: - Ensure library packages export client interface - Maintain compatibility with current library examples Phase 7: Testing and Validation Goal: Ensure unified experience works across all scenarios Changes: 1. Update tests: - Test unified runtime in all environments - Validate consistent API behavior - Test library consumption matches development usage 2. Update examples: - Ensure examples demonstrate unified usage - Update documentation to reflect unified interface Implementation Order 1. ✅ Phase 1: Unified Runtime Architecture 2. 🔄 Phase 2: Virtual Module Refactoring 3. ⏳ Phase 3: Theme System Unification 4. ⏳ Phase 4: Library Builder Integration 5. ⏳ Phase 5: CSS Layer Management 6. ⏳ Phase 6: Import Path Unification 7. ⏳ Phase 7: Testing and Validation Success Criteria - ✅ import { applyStyles, themesControl } from '@peter.naydenov/vite-plugin-morph/client' works identically in dev/library modes - ✅ applyStyles() creates appropriate CSS links for all layers without parameters - ✅ themesControl.set('dark') switches themes via DOM manipulation in all environments - ✅ No environment-specific code required from developers - ✅ Framework-free bundles with pure JS component functions - ✅ Same developer experience for framework development and library consumption This plan will fulfill the spec's vision of a unified Svelte-like experience where the development and library consumption experiences are indistinguishable."

## Clarifications

### Session 2025-12-25

- Q: What should happen when applyStyles() is called multiple times? → A: Each call adds new CSS links/styles, potentially causing duplicates
- Q: What should happen when an invalid theme name is passed to themesControl.set()? → A: System logs a warning and keeps the current theme unchanged
- Q: How should the system handle CSS loading failures (e.g., broken URLs, network issues)? → A: System logs errors but continues execution with partial functionality
- Q: How should the system behave in server-side rendering environments? → A: There is no difference between server side rendering and browser rendering in this system. Components does not support event handling.

## User Scenarios & Testing

### User Story 1 - Unified Client API Usage (Priority: P1)

As a developer using vite-plugin-morph, I want to import `applyStyles` and `themesControl` from a single path that works identically whether I'm developing an app or consuming a library, so that my code doesn't need to change based on the environment.

**Why this priority**: This is the core value proposition - eliminating environment-specific code and providing a consistent developer experience.

**Independent Test**: Can be fully tested by importing and using the API in both development and library consumption scenarios, verifying identical behavior.

**Acceptance Scenarios**:

1. **Given** a vite-plugin-morph development project, **When** I import `{ applyStyles, themesControl }` from `'@peter.naydenov/vite-plugin-morph/client'`, **Then** the API works identically to library consumption
2. **Given** a vite-plugin-morph built library, **When** I import `{ applyStyles, themesControl }` from the library package, **Then** the API works identically to development usage
3. **Given** any vite-plugin-morph environment, **When** I call `applyStyles()` without parameters, **Then** all CSS layers are applied in correct order
4. **Given** any vite-plugin-morph environment, **When** I call `themesControl.set('dark')`, **Then** the theme switches via DOM link manipulation

---

### User Story 2 - CSS Layer Management (Priority: P2)

As a developer, I want CSS to be applied in a consistent order (general → components → themes) across all environments, so that styling works predictably.

**Why this priority**: CSS ordering is critical for proper styling and visual consistency.

**Independent Test**: Can be fully tested by verifying CSS link order in DOM across different environments.

**Acceptance Scenarios**:

1. **Given** CSS layers are defined, **When** `applyStyles()` is called, **Then** general styles load first, followed by component styles, then theme styles
2. **Given** development mode, **When** `applyStyles()` is called, **Then** CSS is embedded in `<style>` tags
3. **Given** build/library mode, **When** `applyStyles()` is called, **Then** CSS is loaded via `<link>` tags to URLs

---

### User Story 3 - Theme Runtime Switching (Priority: P3)

As a developer, I want runtime theme switching that manipulates DOM links rather than requiring build-time configuration, so that themes can change dynamically.

**Why this priority**: Runtime theme switching enables dynamic user preferences and accessibility features.

**Independent Test**: Can be fully tested by calling theme API methods and verifying DOM link updates.

**Acceptance Scenarios**:

1. **Given** available themes, **When** I call `themesControl.list()`, **Then** I get the complete list of available themes
2. **Given** a current theme, **When** I call `themesControl.getCurrent()`, **Then** I get the currently active theme name
3. **Given** a theme name, **When** I call `themesControl.set('dark')`, **Then** the `<link id="morph-theme">` href updates to point to the dark theme CSS

---

### Edge Cases

- **Multiple `applyStyles()` calls**: Each call adds new CSS links/styles, potentially causing duplicates
- **CSS loading failures**: System logs errors but continues execution with partial functionality
- **Invalid theme names**: System logs a warning and keeps the current theme unchanged
- **Server-side rendering**: There is no difference between server side rendering and browser rendering in this system. Components does not support event handling.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a unified import path `@peter.naydenov/vite-plugin-morph/client` that exports `applyStyles` and `themesControl` functions
- **FR-002**: System MUST auto-detect execution environment (development, build, library) without requiring developer configuration
- **FR-003**: System MUST apply CSS in consistent order: general styles → component styles → theme styles
- **FR-004**: System MUST support runtime theme switching via DOM link manipulation
- **FR-005**: System MUST provide identical API behavior across all environments
- **FR-006**: System MUST generate framework-free JavaScript bundles containing only pure functions
- **FR-007**: System MUST support both development mode (embedded CSS) and production mode (URL-based CSS loading)

### Key Entities

- **CSS Layers**: Hierarchical CSS application system (general, components, themes)
- **Theme Configuration**: Runtime theme switching data (names, URLs, current state)
- **Environment Context**: Auto-detected execution context (dev/build/library)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can use identical import and API calls in 100% of development and library consumption scenarios
- **SC-002**: CSS layers are applied in correct order in 100% of test cases across all environments
- **SC-003**: Theme switching works correctly in 100% of runtime scenarios
- **SC-004**: No environment-specific code required in user applications (0 instances of conditional logic based on environment)
- **SC-005**: Bundle size remains minimal with no framework runtime code included</content>
<parameter name="filePath">specs/001-unified-client-interface/spec.md