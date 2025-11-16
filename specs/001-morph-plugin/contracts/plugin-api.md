# Vite Morph Plugin API Contracts

**Date**: 2025-11-16  
**Purpose**: Define plugin interfaces and API contracts

## Plugin Configuration Interface

```javascript
/**
 * Configuration options for the Vite Morph Plugin
 * @typedef {Object} MorphPluginOptions
 * @property {Object} [globalCSS] - Global CSS configuration
 * @property {string} globalCSS.directory - Directory containing global CSS files with variables
 * @property {string[]} [globalCSS.include=['**/*.css']] - File patterns to include
 * @property {string[]} [globalCSS.exclude=[]] - File patterns to exclude
 * @property {Object} [production] - Production optimization settings
 * @property {boolean} [production.removeHandshake=true] - Remove handshake data in production builds
 * @property {boolean} [production.minifyCSS=true] - Minify generated CSS
 * @property {Object} [development] - Development settings
 * @property {boolean} [development.sourceMaps=true] - Include source maps for debugging
 * @property {boolean} [development.hmr=true] - Enable hot module replacement
 * @property {Object} [errorHandling] - Error handling configuration
 * @property {boolean} [errorHandling.failOnError=true] - Fail build on errors
 * @property {boolean} [errorHandling.showLocation=true] - Show detailed error locations
 * @property {number} [errorHandling.maxErrors=10] - Maximum number of errors to report
 */
```

## Plugin Hook Contracts

### Transform Hook

```javascript
/**
 * Transform hook interface for processing .morph files
 * @typedef {Object} TransformHook
 * @property {Function} transform - Transform .morph file content to ES module
 */

/**
 * Transform result from processing .morph file
 * @typedef {Object} TransformResult
 * @property {string} code - Generated JavaScript code
 * @property {Object} [map] - Source map for debugging
 * @property {Object} [meta] - Additional metadata
 * @property {string} meta.type - Original file type ('morph')
 * @property {TransformWarning[]} [meta.warnings] - Processing warnings
 * @property {number} [meta.processingTime] - Processing time in milliseconds
 */

/**
 * Transform warning information
 * @typedef {Object} TransformWarning
 * @property {string} message - Warning message
 * @property {SourceLocation} [location] - Warning location
 * @property {'info'|'warning'|'error'} severity - Warning severity
 */
```

### Load Hook

```typescript
interface LoadHook {
  // Load virtual modules for CSS and helper functions
  load(
    id: string
  ): Promise<LoadResult> | LoadResult | null;
}

interface LoadResult {
  // Module code
  code: string;
  // Module format
  map?: SourceMap;
  // Module dependencies
  dependencies?: string[];
  // Virtual module type
  virtualModuleType?: 'css' | 'helper' | 'handshake';
}
```

### Handle Hot Update Hook

```typescript
interface HandleHotUpdateHook {
  // Handle .morph file changes for HMR
  handleHotUpdate(
    context: HmrContext
  ): Promise<HmrResult> | HmrResult | null;
}

interface HmrContext {
  // Changed file path
  file: string;
  // Change timestamp
  timestamp: number;
  // Affected modules
  modules: ModuleNode[];
  // Read file content
  read(): Promise<string>;
  // Vite server instance
  server: ViteDevServer;
}

interface HmrResult {
  // Modules to update
  modules: ModuleNode[];
  // HMR updates to send
  updates: HmrUpdate[];
}

interface HmrUpdate {
  // Update type
  type: 'js-update' | 'css-update' | 'custom';
  // Module path
  path: string;
  // Update timestamp
  timestamp: number;
  // Custom update data
  customData?: any;
}
```

## Processing Pipeline Contracts

### Morph File Processor

```typescript
interface MorphFileProcessor {
  // Process .morph file content
  processFile(
    content: string,
    filePath: string,
    options: ProcessingOptions
  ): Promise<ProcessingResult>;
}

interface ProcessingOptions {
  // Build mode
  mode: 'development' | 'production';
  // Global CSS variables
  globalVariables: Record<string, string>;
  // Source map generation
  generateSourceMaps: boolean;
  // Error handling options
  errorHandling: ErrorHandlingOptions;
}

interface ProcessingResult {
  // Generated ES module code
  code: string;
  // Source map
  map?: SourceMap;
  // CSS module exports (handled entirely by plugin since morph doesn't support CSS)
  cssExports?: Record<string, string>;
  // Processing metadata
  metadata: ProcessingMetadata;
  // Processing errors
  errors?: ProcessingError[];
  // Processing warnings
  warnings?: ProcessingWarning[];
  // CSS-only file indicator
  isCSSOnly?: boolean;
}

interface ProcessingMetadata {
  // File processing time
  processingTime: number;
  // Extracted components
  components: {
    template: boolean;
    script: boolean;
    style: boolean;
    handshake: boolean;
  };
  // CSS information
  css?: {
    classCount: number;
    variableReferences: number;
    scopedClasses: number;
  };
  // Template information
  template?: {
    placeholderCount: number;
    helperFunctionCount: number;
  };
}
```

### CSS Module Processor

```javascript
/**
 * CSS module processor - handles ALL CSS processing since morph doesn't support CSS
 * @typedef {Object} CSSModuleProcessor
 * @property {Function} processCSS - Process CSS with module support
 */

/**
 * Process CSS with module support (entirely handled by plugin)
 * @param {string} css - Raw CSS from <style> tags
 * @param {string} filePath - Path to .morph file
 * @param {Record<string,string>} globalVariables - Global CSS variables
 * @param {CSSProcessingOptions} options - Processing options
 * @returns {Promise<CSSProcessingResult>} Processing result
 */

interface CSSProcessingOptions {
  // Generate scoped class names
  scopeClasses: boolean;
  // Include source maps
  sourceMaps: boolean;
  // Minify output
  minify: boolean;
  // Class name generator
  generateClassName?: (original: string) => string;
}

interface CSSProcessingResult {
  // Processed CSS code
  css: string;
  // CSS module exports
  exports: Record<string, string>;
  // Source map
  map?: SourceMap;
  // Used global variables
  usedVariables: string[];
  // Generated class names
  scopedClasses: Record<string, string>;
}
```

### Template Compiler

```typescript
interface TemplateCompiler {
  // Compile morph template to function
  compileTemplate(
    template: string,
    helpers?: Record<string, Function>,
    handshake?: object,
    options: CompilationOptions
  ): Promise<CompilationResult>;
}

interface CompilationOptions {
  // Include handshake in output
  includeHandshake: boolean;
  // Optimize for production
  optimize: boolean;
  // Generate source maps
  sourceMaps: boolean;
}

interface CompilationResult {
  // Compiled render function
  renderFunction: Function;
  // Function source code
  sourceCode: string;
  // Source map
  map?: SourceMap;
  // Compilation metadata
  metadata: CompilationMetadata;
}

interface CompilationMetadata {
  // Compilation time
  compilationTime: number;
  // Function size in bytes
  size: number;
  // Handshake included
  handshakeIncluded: boolean;
  // Helper functions used
  helperFunctions: string[];
}
```

## Error Handling Contracts

### Error Types

```typescript
interface MorphPluginError extends Error {
  // Error code
  code: string;
  // Error location
  location?: SourceLocation;
  // Error severity
  severity: 'error' | 'warning' | 'info';
  // File path
  filePath?: string;
  // Original error
  originalError?: Error;
}

// Specific error types
interface ParseError extends MorphPluginError {
  code: 'PARSE_ERROR';
  parseErrorType: 'html' | 'css' | 'javascript' | 'json';
}

interface CompilationError extends MorphPluginError {
  code: 'COMPILATION_ERROR';
  compilationStage: 'template' | 'helpers' | 'css';
}

interface ValidationError extends MorphPluginError {
  code: 'VALIDATION_ERROR';
  validationType: 'syntax' | 'semantic' | 'dependency';
}

interface ConfigurationError extends MorphPluginError {
  code: 'CONFIGURATION_ERROR';
  configurationPath: string;
}
```

### Error Reporting

```typescript
interface ErrorReporter {
  // Report processing error
  reportError(error: MorphPluginError): void;
  // Report processing warning
  reportWarning(warning: MorphPluginError): void;
  // Get all reported issues
  getIssues(): MorphPluginError[];
  // Clear reported issues
  clearIssues(): void;
}

interface ErrorFormatter {
  // Format error for console output
  formatError(error: MorphPluginError): string;
  // Format error for file output
  formatErrorForFile(error: MorphPluginError): FormattedError;
}

interface FormattedError {
  // Formatted message
  message: string;
  // Error location
  location?: SourceLocation;
  // Error code
  code: string;
  // Suggested fix
  suggestion?: string;
  // Related documentation
  documentation?: string;
}
```

## Integration Contracts

### Vite Plugin Interface

```typescript
interface MorphPlugin extends Plugin {
  // Plugin name
  name: 'vite-plugin-morph';
  // Plugin configuration
  options: MorphPluginOptions;
  // Plugin hooks
  transform: TransformHook['transform'];
  load?: LoadHook['load'];
  handleHotUpdate?: HandleHotUpdateHook['handleHotUpdate'];
  // Plugin API
  api: {
    // Get processing statistics
    getStats(): PluginStats;
    // Clear processing cache
    clearCache(): void;
    // Get global CSS variables
    getGlobalVariables(): Record<string, string>;
    // Reload global CSS files
    reloadGlobalCSS(): Promise<void>;
  };
}

interface PluginStats {
  // Number of processed files
  processedFiles: number;
  // Total processing time
  totalProcessingTime: number;
  // Cache hit rate
  cacheHitRate: number;
  // Error count
  errorCount: number;
  // Warning count
  warningCount: number;
}
```

### Build Integration

```typescript
interface BuildIntegration {
  // Pre-build setup
  setupBuild(options: BuildOptions): Promise<void>;
  // Post-build cleanup
  cleanupBuild(): Promise<void>;
  // Get build artifacts
  getBuildArtifacts(): BuildArtifact[];
}

interface BuildOptions {
  // Build mode
  mode: 'development' | 'production';
  // Output directory
  outDir: string;
  // Asset handling
  assetsDir: string;
  // Source map generation
  sourcemap: boolean;
}

interface BuildArtifact {
  // Artifact type
  type: 'js' | 'css' | 'map';
  // File path
  path: string;
  // File size
  size: number;
  // Additional metadata
  metadata?: Record<string, any>;
}
```

## Testing Contracts

### Test Utilities

```typescript
interface TestUtilities {
  // Create test plugin instance
  createTestPlugin(options?: MorphPluginOptions): MorphPlugin;
  // Create mock Vite server
  createMockServer(): MockViteServer;
  // Process test file
  processTestFile(
    content: string,
    filePath: string,
    options?: ProcessingOptions
  ): Promise<ProcessingResult>;
  // Generate test CSS
  generateTestCSS(variables?: Record<string, string>): string;
  // Generate test template
  generateTestTemplate(placeholders?: string[]): string;
}

interface MockViteServer {
  // Mock module graph
  moduleGraph: ModuleGraph;
  // Mock WebSocket
  ws: WebSocket;
  // Transform mock
  transform(code: string, id: string): Promise<TransformResult>;
  // Load mock
  load(id: string): Promise<LoadResult>;
}
```

These contracts define the complete API surface for the Vite Morph Plugin, ensuring consistent interfaces across all components and enabling comprehensive testing and integration.