# Data Model: Unified Client Interface

**Date**: 2025-12-25
**Feature**: specs/001-unified-client-interface/spec.md
**Phase**: 1 - Design & Contracts

## Entities

### CSS Layers
Hierarchical CSS application system organizing styles into ordered layers.

**Fields**:
- `general`: Global/base styles (fonts, resets, utilities)
- `components`: Component-specific styles from morph files
- `themes`: Theme-specific overrides and variations

**Relationships**:
- CSS Layers → Environment Context (applies differently per environment)
- CSS Layers → Theme Configuration (themes override component styles)

**Validation Rules**:
- Must apply in order: general → components → themes
- Each layer must be independently loadable
- Layers must not conflict in specificity

**State Transitions**: N/A (static hierarchy)

### Theme Configuration
Runtime theme switching data containing available themes and their resources.

**Fields**:
- `name`: String identifier (e.g., "default", "dark", "ocean")
- `url`: CSS file URL for the theme
- `isDefault`: Boolean flag for default theme

**Relationships**:
- Theme Configuration → Environment Context (URLs differ by environment)
- Theme Configuration → CSS Layers (themes layer source)

**Validation Rules**:
- Name must be non-empty string
- URL must be valid relative/absolute path
- Only one theme can be marked as default

**State Transitions**:
- Inactive → Active (when `themesControl.set()` called)
- Active → Inactive (when another theme becomes active)

### Environment Context
Auto-detected execution context determining behavior and resource loading.

**Fields**:
- `type`: Enum ("development", "build", "library")
- `hasHotReload`: Boolean (Vite dev mode indicator)
- `isLibraryMode`: Boolean (library consumption indicator)

**Relationships**:
- Environment Context → CSS Layers (determines loading strategy)
- Environment Context → Theme Configuration (determines URL patterns)

**Validation Rules**:
- Type must be one of the three valid environments
- Cannot have conflicting indicators (e.g., hot reload + library mode)

**State Transitions**: N/A (detected at runtime, doesn't change during execution)

## Data Flow

1. **Detection Phase**: Environment Context auto-detected on module load
2. **Configuration Phase**: Theme Configuration loaded based on environment
3. **Application Phase**: CSS Layers applied using environment-specific strategies
4. **Runtime Phase**: Theme switching manipulates active Theme Configuration

## Constraints

- All entities must work in both browser and server environments
- Theme switching must be DOM-manipulation only (no CSS-in-JS)
- CSS loading must be non-blocking and fault-tolerant
- Entity relationships must support both development and production bundles</content>
<parameter name="filePath">specs/001-unified-client-interface/data-model.md