# Research: Unified Client Interface

**Date**: 2025-12-25
**Feature**: specs/001-unified-client-interface/spec.md
**Phase**: 0 - Outline & Research

## Research Tasks

### Environment Detection Patterns
**Task**: Research best practices for runtime environment detection in JavaScript/Vite plugins

**Findings**:
- **Decision**: Use combination of `import.meta.hot` and global flags
- **Rationale**: `import.meta.hot` reliably detects Vite dev mode, global flags can signal library mode
- **Alternatives considered**: User-agent detection (too unreliable), build-time injection (adds complexity)
- **Implementation**: `detectEnvironment()` function with clear priority order

### CSS Loading Strategies
**Task**: Research optimal CSS loading patterns for different environments

**Findings**:
- **Decision**: `<style>` tags for dev (immediate), `<link>` tags for production (cacheable)
- **Rationale**: Dev mode needs instant updates, production needs caching and parallel loading
- **Alternatives considered**: Always use `<link>` (slower dev iteration), CSS-in-JS (adds runtime overhead)
- **Implementation**: Environment-aware CSS injection with proper ordering

### Theme Switching Architecture
**Task**: Research DOM manipulation patterns for runtime theme switching

**Findings**:
- **Decision**: Single `<link id="morph-theme">` element with href updates
- **Rationale**: Simple, performant, and compatible with browser caching
- **Alternatives considered**: Multiple theme links (complex management), CSS custom properties (limited scope)
- **Implementation**: `createStyleLink()` and `removeStyleLink()` utilities with id-based management

### Virtual Module Configuration
**Task**: Research Vite virtual module patterns for configuration sharing

**Findings**:
- **Decision**: Export configuration object from virtual module, consumed by runtime
- **Rationale**: Clean separation between build-time config and runtime behavior
- **Alternatives considered**: Global variables (pollution), build-time code generation (complexity)
- **Implementation**: `virtual:morph-client` module providing `__morphConfig__` object

### Error Handling Patterns
**Task**: Research graceful error handling for CSS loading and theme switching

**Findings**:
- **Decision**: Log errors but continue execution with partial functionality
- **Rationale**: CSS failures shouldn't break application, theme failures should be non-destructive
- **Alternatives considered**: Throw errors (breaks app), silent failures (hard to debug)
- **Implementation**: Console warnings with descriptive messages, fallback behaviors

## Technical Approach Validation

All research confirms the proposed implementation approach is sound:

1. **Environment Detection**: Clear patterns exist for distinguishing dev/build/library modes
2. **CSS Management**: `<style>` vs `<link>` provides optimal performance per environment
3. **Theme Switching**: DOM link manipulation is the standard approach
4. **Virtual Modules**: Vite's virtual module system supports clean config sharing
5. **Error Handling**: Logging without breaking is the expected UX pattern

## No Unresolved Questions

All technical unknowns from the specification have been resolved through research. The implementation approach is validated and ready to proceed to design phase.</content>
<parameter name="filePath">specs/001-unified-client-interface/research.md