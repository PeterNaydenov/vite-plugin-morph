# Research Summary: Vite Morph Plugin

**Date**: 2025-11-16  
**Purpose**: Resolve technical unknowns for implementing the Vite Morph Plugin

## @peter.naydenov/morph Library

### Decision: Use @peter.naydenov/morph v3.1.5
**Rationale**: Latest stable version with full TypeScript support and comprehensive API.

**Key API Findings**:
- `build(tpl: Template, extra?: boolean, buildDependencies?: object): Function | tupleResult`
- Template object structure: `{ template: string, helpers?: object, handshake?: object }`
- Placeholder syntax: `{{ data : action1, action2 : name }}`
- Built-in storage system with `add()`, `get()`, `list()` methods

**Template Conversion Process**:
1. Parse HTML-like .morph file structure
2. Extract template content from HTML body
3. Extract helper functions from `<script>` tags
4. Extract CSS from `<style>` tags (handled entirely by plugin - morph doesn't support CSS)
5. Extract handshake data from `<script type='application/json'>` tags
6. Convert to morph Template object format (template + helpers only)
7. Use `morph.build()` to create render function
8. Process CSS separately through plugin's CSS module system
9. Export as ES module with both render function and CSS exports

**Integration Patterns**:
- ESM and CommonJS support
- External dependency injection during build
- Post-processing functions support
- Storage system for template management

## HTML AST Parser Selection

### Decision: Use parse5 as primary parser
**Rationale**: Best balance of spec compliance, performance, and TypeScript support for .morph file processing.

**Parser Comparison**:
- **parse5**: 9.7ms/file, spec-compliant, excellent TypeScript support ✅
- **htmlparser2**: 2.17ms/file (fastest), forgiving parsing, good TypeScript support
- **Cheerio**: jQuery-like API, built on parse5/htmlparser2, excellent DX
- **jsdom**: Full browser environment, overkill for this use case

**parse5 Advantages**:
- WHATWG HTML Living Standard compliant
- Preserves whitespace and formatting (important for .morph files)
- Excellent location info for source mapping
- Used by major frameworks (Angular, Lit)
- Great Vite integration

**Implementation Approach**:
```javascript
import { parseDocument } from 'parse5';

/**
 * Parse morph file content and extract components
 * @param {string} morphContent - Raw morph file content
 * @returns {Document} Parsed HTML document
 */
const document = parseDocument(morphContent);
// Extract script/style/json tags with location info
```

## Vite Plugin Testing Strategy

### Decision: Use Vitest with Vite's test utilities
**Rationale**: Native Vite integration, Jest-compatible API, and comprehensive testing capabilities.

**Testing Framework**: Vitest
- Native Vite integration (same config, plugins, transformers)
- Jest-compatible API with `expect`, `test`, `describe`
- Built-in mocking, coverage, and watch mode
- Perfect for testing Vite plugins

**Key Testing Patterns**:
1. **Plugin Hook Testing**: Test transform and load hooks directly
2. **Mock Server Context**: Create mock Vite server for testing
3. **HMR Testing**: Test hot module replacement functionality
4. **Integration Testing**: End-to-end testing with temporary projects
5. **Error Boundary Testing**: Verify error handling and location reporting

**Test Structure**:
```typescript
// Unit tests for individual components
describe('transform hook', () => { ... })
describe('CSS processing', () => { ... })
describe('error handling', () => { ... })

// Integration tests
describe('plugin integration', () => { ... })
describe('E2E scenarios', () => { ... })
```

## Resolved Technical Context

**Language/Version**: JavaScript (ES2022) with JSDoc types, compiled to d.ts ✅  
**Primary Dependencies**: @peter.naydenov/morph v3.1.5, Vite 4.x plugin API, parse5 ✅  
**Storage**: File system (morph files), CSS files for global variables ✅  
**Testing**: Vitest with Vite test utilities ✅  
**Target Platform**: Node.js build tools (development and production) ✅  
**Project Type**: Single Vite plugin library ✅  
**Performance Goals**: <100ms compilation time, <50ms hot module replacement, 10% bundle size reduction ✅  
**Constraints**: Must integrate seamlessly with Vite dev server, support both ESM and CommonJS, minimal bundle impact ✅  
**Scale/Scope**: Support projects with 100+ morph files, handle complex CSS variable hierarchies ✅

## Implementation Architecture

### Core Processing Pipeline
1. **File Detection**: Identify .morph files in Vite's module graph
2. **AST Parsing**: Use parse5 to extract HTML structure and content
3. **Content Extraction**: Separate template, script, style, and handshake content
4. **Template Conversion**: Convert to @peter.naydenov/morph Template object format (template + helpers only)
5. **CSS Processing**: Handle ALL CSS processing through plugin (morph doesn't support CSS)
6. **Function Compilation**: Use morph.build() to create render functions
7. **Module Generation**: Export as ES module with both render function and CSS exports

### Error Handling Strategy
- Parse-time error detection with location information
- Graceful degradation for missing optional components
- Clear error messages with file, line, and column information
- Build failure prevention for critical errors

### Performance Optimizations
- AST parsing caching for unchanged files
- Asynchronous processing for large files
- Selective recompilation for HMR
- Minimal bundle impact through tree-shaking

### CSS Processing (Plugin Responsibility)
Since @peter.naydenov/morph doesn't handle CSS at all, the plugin must:
- Parse CSS from `<style>` tags independently
- Implement CSS module scoping from scratch
- Handle global CSS variable resolution
- Generate CSS module exports
- Inject CSS into Vite's build process
- Manage CSS source maps and optimization
- Handle CSS-only .morph files (no template/script)

## Next Steps

With all technical unknowns resolved, proceed to Phase 1:
1. Design data models for morph file processing
2. Define API contracts for plugin interfaces
3. Create quickstart documentation
4. Update agent context with new technology stack