# Plugin API Contract: CSS Layers Architecture

## Overview

This contract defines the public API for CSS layers functionality in the morph plugin, ensuring consistent integration and usage patterns.

## Configuration API

### Plugin Options

```typescript
interface MorphPluginOptions {
  // CSS processing configuration
  css?: {
    // Enable CSS processing features
    enabled?: boolean;

    // PostCSS configuration
    postcss?: {
      plugins?: PostCSSPlugin[];
      options?: PostCSSOptions;
    };

    // CSS modules configuration
    modules?: {
      enabled?: boolean;
      generateScopedName?: (name: string, filename: string) => string;
      localsConvention?: 'camelCase' | 'dashes';
    };

    // CSS layers configuration
    layers?: {
      enabled?: boolean;
      order?: string[]; // ['reset', 'global', 'components', 'themes']
    };

    // Tree-shaking configuration
    treeShaking?: {
      enabled?: boolean;
      analysis?: 'static' | 'dynamic';
    };

    // Bundling configuration
    bundling?: {
      enabled?: boolean;
      outputDir?: string;
      filename?: string;
      sourceMaps?: boolean;
    };
  };
}
```

### Default Configuration

```typescript
const defaultCssConfig = {
  enabled: true,
  postcss: {
    plugins: ['autoprefixer', 'cssnano'],
  },
  modules: {
    enabled: true,
    generateScopedName: '[name]_[local]_[hash:base64:5]',
  },
  layers: {
    enabled: true,
    order: ['reset', 'global', 'components', 'themes'],
  },
  treeShaking: {
    enabled: true,
    analysis: 'static',
  },
  bundling: {
    enabled: true,
    outputDir: 'dist/components',
    filename: 'components.css',
    sourceMaps: true,
  },
};
```

## Component API

### CSS Module Exports

```typescript
// Generated from Button.morph
export const styles = {
  btn: 'Button_btn_1a2b3c',
  primary: 'Button_primary_4d5e6f',
  disabled: 'Button_disabled_7g8h9i',
};

export const css = '@layer components { .Button_btn_1a2b3c { ... } }';

// Default export (component)
export default ButtonComponent;
```

### Usage in Components

```typescript
// TypeScript/JavaScript usage
import Button, { styles } from './Button.morph';

function MyComponent() {
  return (
    <div>
      <button className={styles.btn}>Click me</button>
      <button className={`${styles.btn} ${styles.primary}`}>Primary</button>
    </div>
  );
}
```

## Build API

### CSS Processing Hooks

```typescript
interface CssProcessingHooks {
  // Called before CSS processing begins
  onCssProcessingStart?: (components: string[]) => void;

  // Called for each component CSS processing
  onComponentCssProcessed?: (
    componentName: string,
    css: string,
    styles: Record<string, string>
  ) => void;

  // Called after all CSS processing completes
  onCssProcessingEnd?: (bundle: CssBundle) => void;

  // Called when CSS errors occur
  onCssError?: (error: CssProcessingError) => void;
}

// Functional API Endpoints (based on user stories)

interface CssModulesAPI {
  // US-1: CSS Modules for Component Scoping
  processComponentCss: (
    componentName: string,
    css: string
  ) => Promise<CssModuleResult>;

  // US-2: PostCSS Processing Pipeline
  applyPostCss: (css: string, plugins: PostCSSPlugin[]) => Promise<string>;

  // US-3: CSS Tree-Shaking
  analyzeComponentUsage: (entryPoints: string[]) => Promise<string[]>;

  // US-4: CSS Layers for Conflict Resolution
  createCssLayers: (css: string, layerName: string) => string;

  // US-5: CSS Bundling and Optimization
  createCssBundle: (components: CssModuleResult[]) => Promise<CssBundle>;

  // US-6: Development Experience Enhancements
  generateSourceMaps: (css: string, originalFile: string) => Promise<SourceMap>;
}
```

### CSS Bundle Interface

```typescript
interface CssBundle {
  filename: string;
  content: string;
  sourceMap?: string;
  components: string[];
  layers: {
    reset?: string;
    global?: string;
    components: string;
    themes?: string;
  };
  stats: {
    originalSize: number;
    processedSize: number;
    componentsCount: number;
    processingTime: number;
  };
}

// Component CSS Processing Result
interface CssModuleResult {
  componentName: string;
  originalCss: string;
  processedCss: string;
  scopedClasses: Record<string, string>;
  sourceMap?: string;
  dependencies: string[];
  layer: string; // 'components'
}

// PostCSS Plugin Configuration
interface PostCSSPlugin {
  name: string;
  plugin: any;
  options?: Record<string, any>;
}

// CSS Processing Options
interface CssProcessingOptions {
  minify?: boolean;
  sourceMaps?: boolean;
  autoprefixer?: boolean;
  cssModules?: boolean;
  layers?: boolean;
}
```

## Runtime API

### CSS Loading API

```typescript
// Automatic CSS loading (default behavior)
import Component from './Component.morph';
// CSS automatically injected

// Manual CSS access
import Component, { css, styles } from './Component.morph';
```

### Theme Integration API

```typescript
import { themeControl } from '@peter.naydenov/vite-plugin-morph';

// CSS layers ensure proper precedence
await themeControl.load('dark');
// Theme CSS loads in @layer themes, overriding component styles
```

## Development API

### Hot Module Replacement

```typescript
// CSS changes trigger HMR automatically
// No additional API needed - works out of the box
```

### Debugging API

```typescript
// Development-only debugging helpers
import { cssDebug } from '@peter.naydenov/vite-plugin-morph';

cssDebug.getComponentStyles('Button'); // Returns processed CSS
cssDebug.getScopedClassName('Button', 'btn'); // Returns scoped name
cssDebug.getCssLayers(); // Returns current layer structure
```

## Error Handling API

### CSS Processing Errors

```typescript
interface CssProcessingError {
  type: 'syntax' | 'import' | 'module' | 'layer' | 'bundling' | 'optimization';
  component?: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  originalError?: Error;
  context?: {
    css?: string;
    selector?: string;
    plugin?: string;
  };
}

// CSS Validation Errors
interface CssValidationError extends CssProcessingError {
  type: 'validation';
  rule: string;
  expected: string;
  actual: string;
}

// Build-time Error Handling
interface CssBuildErrorHandler {
  onSyntaxError: (error: CssProcessingError) => void;
  onImportError: (error: CssProcessingError) => void;
  onModuleError: (error: CssProcessingError) => void;
  onLayerError: (error: CssProcessingError) => void;
  onBundlingError: (error: CssProcessingError) => void;
}
```

### Error Reporting

```typescript
// Errors are reported through Vite's error system
// CSS syntax errors include file location and context
// PostCSS plugin errors are properly formatted

// Runtime CSS Management API
interface RuntimeCssAPI {
  // Load component CSS dynamically
  loadComponentCss: (componentName: string) => Promise<void>;

  // Unload component CSS
  unloadComponentCss: (componentName: string) => void;

  // Get CSS module for component
  getComponentStyles: (componentName: string) => Record<string, string> | null;

  // Check if component CSS is loaded
  isComponentCssLoaded: (componentName: string) => boolean;

  // Get all loaded component CSS
  getLoadedComponents: () => string[];

  // Get CSS bundle statistics
  getCssStats: () => CssRuntimeStats;
}

interface CssRuntimeStats {
  loadedComponents: number;
  totalCssSize: number;
  layersActive: string[];
  themeActive: string;
  lastUpdate: number;
}
```

## Migration API

### Backward Compatibility

```typescript
// Existing components continue to work
import Button, { css } from './Button.morph'; // Still works

// New features are opt-in
const plugin = morphPlugin({
  css: {
    modules: true, // Enable CSS modules
    layers: true, // Enable CSS layers
    treeShaking: true, // Enable tree-shaking
  },
});
```

### Gradual Adoption

```typescript
// Can adopt features incrementally
// Start with basic CSS processing
// Add modules when ready
// Enable layers for conflict resolution
// Add tree-shaking for optimization

// Migration API
interface CssMigrationAPI {
  // Analyze existing CSS for migration
  analyzeExistingCss: (projectRoot: string) => Promise<MigrationReport>;

  // Generate migration plan
  createMigrationPlan: (analysis: MigrationReport) => MigrationPlan;

  // Apply migration transformations
  applyMigration: (plan: MigrationPlan) => Promise<MigrationResult>;

  // Validate migration success
  validateMigration: (result: MigrationResult) => Promise<ValidationResult>;
}

interface MigrationReport {
  components: ComponentAnalysis[];
  themes: ThemeAnalysis[];
  conflicts: ConflictReport[];
  recommendations: string[];
}

interface MigrationPlan {
  steps: MigrationStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface MigrationResult {
  success: boolean;
  transformedFiles: string[];
  errors: MigrationError[];
  rollbackPlan?: () => Promise<void>;
}
```

## Performance API

### CSS Processing Metrics

```typescript
interface CssProcessingMetrics {
  componentsProcessed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  bundleSize: number;
  treeShakingSavings: number; // Percentage saved
  layersUsed: string[];
}
```

### Performance Monitoring

```typescript
// Development mode metrics
import { cssMetrics } from '@peter.naydenov/vite-plugin-morph';

const metrics = cssMetrics.getLatest();
console.log(
  `Processed ${metrics.componentsProcessed} components in ${metrics.totalProcessingTime}ms`
);
```

## Type Definitions

### Complete TypeScript Interface

````typescript
// Main plugin options
export interface MorphPluginOptions {
  css?: CssProcessingOptions;
}

// CSS processing configuration
export interface CssProcessingOptions {
  enabled?: boolean;
  postcss?: PostCSSConfig;
  modules?: CssModulesConfig;
  layers?: CssLayersConfig;
  treeShaking?: TreeShakingConfig;
  bundling?: BundlingConfig;
}

// Component exports
export interface ComponentExports {
  default: ComponentFunction;
  styles?: Record<string, string>;
  css?: string;
}

// CSS processing result
export interface CssProcessingResult {
  styles: Record<string, string>;
  css: string;
  sourceMap?: string;
  errors?: CssProcessingError[];
}
```</content>
<parameter name="filePath">specs/003-css-layers/contracts/plugin-api.md
````
