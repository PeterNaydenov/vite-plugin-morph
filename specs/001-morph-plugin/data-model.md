# Data Model: Vite Morph Plugin

**Date**: 2025-11-16  
**Purpose**: Define data structures and entities for morph file processing

## Core Entities

### MorphFile
Represents a .morph file with its parsed components. CSS is handled entirely by the plugin since morph doesn't support CSS.

```javascript
/**
 * Represents a parsed .morph file with all its components
 * @typedef {Object} MorphFile
 * @property {string} filePath - Absolute path to .morph file
 * @property {string} content - Raw file content
 * @property {Document} ast - Parsed HTML AST (parse5 Document)
 * @property {TemplateContent} [template] - Optional template content (morph processes this)
 * @property {ScriptContent} [script] - Optional JavaScript helper functions (morph processes this)
 * @property {StyleContent} [style] - Optional CSS styles (plugin processes this entirely)
 * @property {HandshakeContent} [handshake] - Optional JSON handshake data
 * @property {FileMetadata} metadata - File processing metadata
 * @property {boolean} isCSSOnly - True if file contains only CSS (no template/script for morph)
 */
```

**Validation Rules**:
- filePath must end with .morph extension
- content must be valid HTML-like structure
- at least template content must be present
- script content must be valid JavaScript if present
- style content must be valid CSS if present
- handshake must be valid JSON if present

### TemplateContent
Represents main HTML template with placeholders.

```javascript
/**
 * Represents main HTML template with placeholders
 * @typedef {Object} TemplateContent
 * @property {string} html - HTML content with {{ }} placeholders
 * @property {Placeholder[]} placeholders - Extracted placeholder information
 * @property {SourceLocation} sourceLocation - Location in original file
 */
```

**Validation Rules**:
- html must contain valid HTML structure
- placeholders must follow morph syntax: {{ data : action1, action2 : name }}
- sourceLocation must be accurate for error reporting

### ScriptContent
Represents JavaScript helper functions from <script> tags.

```javascript
/**
 * Represents JavaScript helper functions from <script> tags
 * @typedef {Object} ScriptContent
 * @property {string} code - Raw JavaScript code
 * @property {FunctionInfo[]} functions - Parsed function definitions
 * @property {SourceLocation} sourceLocation - Location in original file
 */
```

**Validation Rules**:
- code must be valid JavaScript
- functions must be properly defined
- no circular dependencies between functions

### StyleContent
Represents CSS styles from <style> tags, processed entirely by the plugin (morph doesn't support CSS).

```javascript
/**
 * Represents CSS styles from <style> tags, processed entirely by the plugin
 * @typedef {Object} StyleContent
 * @property {string} css - Raw CSS code from <style> tags
 * @property {ClassInfo[]} classes - CSS class definitions to be processed by plugin
 * @property {VariableReference[]} variables - Global variable references to resolve
 * @property {ScopedClass[]} scopedClasses - Generated scoped class names by plugin
 * @property {SourceLocation} sourceLocation - Location in original file
 * @property {boolean} isCSSOnly - True if .morph file contains only CSS (no template)
 */
```

**Validation Rules**:
- css must be valid CSS syntax
- classes must have valid selectors
- variable references must resolve to global definitions
- scoped classes must be unique within project

### HandshakeContent
Represents JSON handshake data for development reference.

```javascript
/**
 * Represents JSON handshake data for development reference
 * @typedef {Object} HandshakeContent
 * @property {string} json - Raw JSON string
 * @property {Object} data - Parsed JSON object
 * @property {Object} [schema] - Optional schema validation
 * @property {SourceLocation} sourceLocation - Location in original file
 */
```

**Validation Rules**:
- json must be valid JSON
- data must be serializable
- schema must validate data if present

## Supporting Entities

### Placeholder
Represents a morph template placeholder.

**Fields**:
- `raw: string` - Raw placeholder text (e.g., "{{ user : name }}")
- `dataSource: string` - Data source (e.g., "user")
- `actions: string[]` - Processing actions (e.g., ["name"])
- `outputName?: string` - Optional output name
- `location: SourceLocation` - Location in template

### FunctionInfo
Represents a JavaScript function definition.

**Fields**:
- `name: string` - Function name
- `params: string[]` - Parameter names
- `body: string` - Function body
- `isAsync: boolean` - Whether function is async
- `dependencies: string[]` - Other functions this one calls

### ClassInfo
Represents a CSS class definition.

**Fields**:
- `name: string` - Original class name
- `selector: string` - Full CSS selector
- `properties: CSSProperty[]` - CSS properties
- `mediaQueries: string[]` - Media query conditions
- `isGlobal: boolean` - Whether class is global

### VariableReference
Represents a CSS variable usage.

**Fields**:
- `name: string` - Variable name (e.g., "--primary-color")
- `property: string` - CSS property using the variable
- `fallback?: string` - Fallback value
- `source: 'global' | 'local' | 'framework'` - Variable source

### SourceLocation
Represents location information for error reporting.

**Fields**:
- `file: string` - File path
- `line: number` - Line number (1-based)
- `column: number` - Column number (1-based)
- `offset: number` - Character offset from start

### FileMetadata
Represents processing metadata for a morph file.

**Fields**:
- `lastModified: number` - File modification timestamp
- `processedAt: number` - When file was last processed
- `hash: string` - Content hash for change detection
- `dependencies: string[]` - Files this one depends on
- `dependents: string[]` - Files that depend on this one

## State Transitions

### MorphFile Processing States

1. **DISCOVERED** → **PARSING**: File detected by Vite, begin AST parsing
2. **PARSING** → **PARSED**: AST successfully parsed, content extracted
3. **PARSED** → **COMPILING**: Converting to morph template format
4. **COMPILING** → **COMPILED**: Successfully compiled to render function
5. **COMPILED** → **EXPORTED**: ES module generated and exported
6. **Any** → **ERROR**: Error occurred, state set to ERROR with details

### Error Recovery States

- **ERROR** → **PARSING**: Retry parsing after fix
- **ERROR** → **COMPILING**: Retry compilation after fix
- **ERROR** → **DISCOVERED**: File changed, restart processing

## Relationships

### Composition Relationships
- MorphFile → 1 TemplateContent (required)
- MorphFile → 0..1 ScriptContent (optional)
- MorphFile → 0..1 StyleContent (optional)
- MorphFile → 0..1 HandshakeContent (optional)

### Reference Relationships
- TemplateContent → 0..* Placeholder
- ScriptContent → 0..* FunctionInfo
- StyleContent → 0..* ClassInfo
- StyleContent → 0..* VariableReference
- HandshakeContent → 0..1 schema

### Dependency Relationships
- FunctionInfo → 0..* FunctionInfo (circular dependencies allowed but tracked)
- VariableReference → 1 GlobalCSSFile (for variable resolution)
- MorphFile → 0..* MorphFile (for dependency tracking)

## Data Validation Rules

### Template Validation
- All placeholders must have valid morph syntax
- Data sources must be accessible in render context
- Actions must be valid morph operations

### Script Validation
- All functions must be syntactically valid
- No undefined function references
- No prohibited JavaScript operations

### Style Validation
- All CSS must be syntactically valid
- Global variable references must resolve
- Scoped class names must be unique

### Handshake Validation
- JSON must be valid and parseable
- Schema validation if schema provided
- Handshake data must match expected structure

## Performance Considerations

### Caching Strategy
- Cache parsed AST for unchanged files
- Cache compiled templates for repeated use
- Cache CSS variable resolution results

### Memory Management
- Release AST after compilation
- Limit in-memory template cache size
- Clean up unused CSS variable references

### Processing Optimization
- Parallel processing of independent files
- Incremental updates for changed files
- Selective recompilation for HMR