# Data Model: CSS Layers Architecture

## Core Entities

### CSS Module

**Purpose**: Represents processed component CSS with scoped class names
**Attributes**:

- `componentName`: String - Name of the component (e.g., "Button")
- `originalCss`: String - Raw CSS from component `<style>` tag
- `processedCss`: String - PostCSS-processed CSS with @layer wrapper
- `scopedClasses`: Map<String, String> - Original → Scoped class name mappings
- `sourceFile`: String - Path to source .morph file
- `dependencies`: Array<String> - CSS imports and dependencies

**Validation Rules**:

- `componentName` must be valid JavaScript identifier
- `scopedClasses` must contain all class selectors from `originalCss`
- `processedCss` must include `@layer components` wrapper

**Relationships**:

- Belongs to Component
- References CSS Dependencies

### CSS Bundle

**Purpose**: Collection of all component CSS for production deployment
**Attributes**:

- `filename`: String - Output filename (e.g., "components.css")
- `content`: String - Concatenated CSS with layer organization
- `components`: Array<String> - List of included component names
- `layers`: Object - CSS organized by layer hierarchy
  - `reset`: String - Reset/normalize styles
  - `global`: String - Global variables and utilities
  - `components`: String - All component CSS
  - `themes`: String - Theme overrides
- `stats`: Object - Bundle statistics
  - `originalSize`: Number - Total original CSS size
  - `processedSize`: Number - Final bundle size
  - `componentsCount`: Number - Number of components included
  - `processingTime`: Number - Build time in milliseconds

**Validation Rules**:

- `content` must contain proper @layer declarations
- `layers.components` must include all component CSS
- `stats.processedSize` must be less than `stats.originalSize`

**Relationships**:

- Contains multiple CSS Modules
- References Theme entities

### CSS Layer

**Purpose**: Represents a cascade layer in the CSS architecture
**Attributes**:

- `name`: String - Layer identifier (reset, global, components, themes)
- `priority`: Number - Cascade priority (higher number = higher priority)
- `content`: String - CSS content for this layer
- `source`: String - Source of the CSS (component, theme, global)

**Validation Rules**:

- `name` must be one of: reset, global, components, themes
- `priority` must match layer hierarchy order
- `content` must be valid CSS

**Relationships**:

- Part of CSS Bundle
- Contains CSS from Components or Themes

### Component

**Purpose**: Represents a morph component with CSS
**Attributes**:

- `name`: String - Component name
- `sourceFile`: String - Path to .morph file
- `cssModule`: CSS Module - Associated CSS module
- `imports`: Array<String> - Other components this imports
- `isUsed`: Boolean - Whether component is imported in final build

**Validation Rules**:

- `name` must match file name
- `cssModule` must exist if component has `<style>` tag
- `isUsed` determines CSS inclusion in bundle

**Relationships**:

- Has one CSS Module
- Imports other Components

### Theme

**Purpose**: Represents a CSS theme with variable overrides
**Attributes**:

- `name`: String - Theme name (e.g., "dark", "light")
- `isDefault`: Boolean - Whether this is the default theme
- `variables`: Map<String, String> - CSS variable definitions
- `fullCss`: String - Complete CSS rules (alternative to variables)
- `sourceFile`: String - Path to theme file

**Validation Rules**:

- `name` must be unique across all themes
- Only one theme can have `isDefault: true`
- Either `variables` or `fullCss` must be present

**Relationships**:

- Referenced by CSS Bundle
- May contain full CSS rules

## Data Flow

### Build-Time Processing

1. **Component Discovery**: Scan all .morph files for `<style>` tags
2. **CSS Extraction**: Extract CSS content and parse selectors
3. **Module Generation**: Create scoped class names and CSS modules
4. **Layer Assignment**: Wrap CSS in appropriate @layer declarations
5. **Bundle Creation**: Concatenate all component CSS into final bundle
6. **Optimization**: Apply PostCSS optimizations and minification

### Runtime Loading

1. **Bundle Loading**: Single CSS file loaded for all components
2. **Layer Application**: CSS layers control cascade order
3. **Theme Switching**: CSS variables updated for theme changes
4. **Class Resolution**: Components use scoped class names from modules

## State Transitions

### Component CSS States

- **Unprocessed**: Raw CSS in .morph file
- **Extracted**: CSS extracted from `<style>` tag
- **Processed**: PostCSS transformations applied
- **Scoped**: Class names transformed to scoped versions
- **Layered**: Wrapped in @layer declaration
- **Bundled**: Included in final CSS bundle

### Bundle States

- **Collecting**: Gathering CSS from components
- **Processing**: Applying PostCSS transformations
- **Optimizing**: Minification and deduplication
- **Finalized**: Ready for deployment

## Identity & Uniqueness Rules

### Component Identity

- Primary key: `sourceFile` path
- Natural key: `name` (derived from filename)
- Uniqueness: No two components can have same name in same directory

### CSS Module Identity

- Primary key: `componentName`
- One-to-one relationship with Component
- Uniqueness: One CSS module per component

### Theme Identity

- Primary key: `name`
- Uniqueness: Theme names must be unique across all theme sources
- Special case: Only one theme can be marked as default

### CSS Bundle Identity

- Singleton: Only one bundle per build
- Identity: Build-specific (can vary by environment/configuration)

## Performance Considerations

### Memory Usage

- CSS content stored in memory during processing
- Scoped class mappings maintained for each component
- Bundle concatenation requires full CSS in memory

### Build Time

- PostCSS processing scales with CSS size
- Class scoping requires AST parsing
- Bundle optimization adds final processing step

### Runtime Performance

- Single CSS file reduces network requests
- CSS layers add minimal parsing overhead
- Scoped classes prevent style recalculation conflicts</content>
  <parameter name="filePath">specs/003-css-layers/data-model.md
