/**
 * CSS Collection Service
 * Collects and bundles component CSS for production builds
 * @fileoverview CSS bundling, chunking, and cache invalidation service
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { debug, info, warn } from '../utils/logger.js';
import { getCSSTreeShaker } from './css-tree-shaker.js';

/**
 * CSS Collection Service for bundling and chunking
 * @class
 */
export class CSSCollectionService {
  /**
   * Create CSS collection service
   * @param {Object} [options={}] - Service options
   * @param {string} [options.outputDir='dist/components'] - Output directory
   * @param {boolean} [options.chunkingEnabled=true] - Enable CSS chunking
   * @param {number} [options.maxChunkSize=51200] - Max chunk size in bytes
   * @param {string} [options.chunkStrategy='size'] - Chunking strategy ('size', 'category', 'manual')
   * @param {boolean} [options.cacheEnabled=true] - Enable cache invalidation
   */
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'dist/components';
    this.components = new Map();
    this.isCollecting = false;
    this.chunkingEnabled = options.chunkingEnabled !== false;
    this.maxChunkSize = options.maxChunkSize || 50 * 1024; // 50KB default
    this.chunkStrategy = options.chunkStrategy || 'size'; // 'size', 'category', 'manual'
    this.chunks = new Map(); // For manual chunking
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cacheManifest = new Map(); // Cache manifest for invalidation
  }

  /**
   * Start CSS collection phase
   */
  startCollection() {
    this.isCollecting = true;
    info('Started CSS collection');
  }

  /**
   * Stop CSS collection and generate bundle
   * @returns {Promise<void>}
   */
  async stopCollection() {
    this.isCollecting = false;
    await this.generateBundle();
  }

  /**
   * Add component CSS to collection
   * @param {string} componentName - Component name
   * @param {string} css - CSS content
   */
  addComponentCss(componentName, css) {
    if (!this.isCollecting) return;

    debug(`Adding CSS for component: ${componentName}`);
    this.components.set(componentName, css);
  }

  /**
   * Apply tree-shaking to filter unused CSS
   */
  async applyTreeShaking() {
    try {
      info('Applying CSS tree-shaking...');

      // Analyze component usage
      const treeShaker = getCSSTreeShaker({ srcDir: 'src' });
      const usedComponents = await treeShaker.analyzeComponentUsage();

      // Filter CSS collection
      const originalSize = this.components.size;
      this.components = treeShaker.filterCSS(this.components);
      const filteredSize = this.components.size;

      const savings = originalSize - filteredSize;
      info(
        `CSS tree-shaking complete: ${savings} unused components removed, ${filteredSize} components kept`
      );
    } catch (error) {
      warn(`CSS tree-shaking failed: ${error.message}`);
      // Continue without tree-shaking on failure
    }
  }

  /**
   * Generate bundled CSS file(s) with chunking support
   * @returns {Promise<void>}
   */
  async generateBundle() {
    if (this.components.size === 0) {
      warn('No component CSS to bundle');
      return;
    }

    try {
      // Create output directory
      await mkdir(this.outputDir, { recursive: true });

      // Check cache invalidation
      const needsInvalidation = this.needsCacheInvalidation();
      if (needsInvalidation) {
        info('CSS cache invalidation detected, regenerating bundles');
      }

      if (this.chunkingEnabled) {
        await this.generateChunks();
      } else {
        // Generate single bundled CSS with layers
        const bundledCss = this.buildBundledCss();

        // Write bundle file
        const outputPath = join(this.outputDir, 'components.css');
        await writeFile(outputPath, bundledCss, 'utf-8');

        info(
          `Generated CSS bundle: ${outputPath} (${this.components.size} components)`
        );
      }

      // Update cache manifest after successful generation
      this.updateCacheManifest();
    } catch (error) {
      warn(`Failed to generate CSS bundle: ${error.message}`);
    }
  }

  /**
   * Generate CSS chunks based on strategy
   */
  async generateChunks() {
    const chunks = this.createChunks();

    for (const [chunkName, components] of chunks) {
      const chunkCss = this.buildChunkCss(components);
      const outputPath = join(this.outputDir, `${chunkName}.css`);
      await writeFile(outputPath, chunkCss, 'utf-8');
      info(
        `Generated CSS chunk: ${outputPath} (${components.length} components)`
      );
    }

    // Generate chunk manifest for loading management
    await this.generateChunkManifest(chunks);
  }

  /**
   * Create chunks based on configured strategy
   */
  createChunks() {
    const chunks = new Map();

    if (this.chunkStrategy === 'manual') {
      // Use predefined chunks
      for (const [chunkName, componentNames] of this.chunks) {
        const chunkComponents = [];
        for (const componentName of componentNames) {
          if (this.components.has(componentName)) {
            chunkComponents.push([
              componentName,
              this.components.get(componentName),
            ]);
          }
        }
        if (chunkComponents.length > 0) {
          chunks.set(chunkName, chunkComponents);
        }
      }
    } else if (this.chunkStrategy === 'category') {
      // Group by component category (inferred from naming)
      for (const [componentName, css] of this.components) {
        const category = this.getComponentCategory(componentName);
        if (!chunks.has(category)) {
          chunks.set(category, []);
        }
        chunks.get(category).push([componentName, css]);
      }
    } else {
      // Default: size-based chunking
      let currentChunk = [];
      let currentSize = 0;
      let chunkIndex = 0;

      for (const [componentName, css] of this.components) {
        const cssSize = css.length;

        if (
          currentSize + cssSize > this.maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.set(`chunk-${chunkIndex}`, currentChunk);
          currentChunk = [];
          currentSize = 0;
          chunkIndex++;
        }

        currentChunk.push([componentName, css]);
        currentSize += cssSize;
      }

      if (currentChunk.length > 0) {
        chunks.set(`chunk-${chunkIndex}`, currentChunk);
      }
    }

    return chunks;
  }

  /**
   * Get component category from name
   */
  getComponentCategory(componentName) {
    // Simple categorization based on naming patterns
    if (componentName.includes('Button') || componentName.includes('Input')) {
      return 'ui-components';
    } else if (
      componentName.includes('Layout') ||
      componentName.includes('Container')
    ) {
      return 'layout';
    } else if (
      componentName.includes('Modal') ||
      componentName.includes('Dialog')
    ) {
      return 'overlays';
    } else {
      return 'components';
    }
  }

  /**
   * Build CSS for a specific chunk
   */
  buildChunkCss(components) {
    const cssParts = [];

    // Add layer hierarchy declaration
    cssParts.push('@layer reset, global, components, themes;');

    // Add each component's CSS (already wrapped in @layer components)
    for (const [componentName, css] of components) {
      cssParts.push('');
      cssParts.push(`/* ${componentName} */`);
      cssParts.push(css);
    }

    return cssParts.join('\n');
  }

  /**
   * Generate chunk manifest for loading management
   */
  async generateChunkManifest(chunks) {
    const manifest = {
      chunks: {},
      components: {},
    };

    for (const [chunkName, components] of chunks) {
      manifest.chunks[chunkName] = {
        file: `${chunkName}.css`,
        components: components.map(([name]) => name),
      };

      for (const [componentName] of components) {
        manifest.components[componentName] = chunkName;
      }
    }

    const manifestPath = join(this.outputDir, 'chunks.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    info(`Generated chunk manifest: ${manifestPath}`);
  }

  /**
   * Build bundled CSS with proper layers
   */
  buildBundledCss() {
    const cssParts = [];

    // Add layer hierarchy declaration
    cssParts.push('@layer reset, global, components, themes;');

    // Add each component's CSS (already wrapped in @layer components)
    for (const [componentName, css] of this.components) {
      cssParts.push('');
      cssParts.push(`/* ${componentName} */`);
      cssParts.push(css);
    }

    return cssParts.join('\n');
  }

  /**
   * Get collected components (for debugging)
   */
  getCollectedComponents() {
    return Array.from(this.components.keys());
  }

  /**
   * Check if component CSS exists
   */
  hasComponentCss(componentName) {
    return this.components.has(componentName);
  }

  /**
   * Define manual chunks for chunking strategy
   * @param {Object} chunkDefinitions - Object mapping chunk names to component arrays
   */
  defineChunks(chunkDefinitions) {
    for (const [chunkName, components] of Object.entries(chunkDefinitions)) {
      this.chunks.set(chunkName, components);
    }
  }

  /**
   * Get chunk information for a component
   * @param {string} componentName - Component name
   * @returns {string|null} Chunk name or null if not chunked
   */
  getComponentChunk(componentName) {
    if (!this.chunkingEnabled) return null;

    // For manual chunks, check predefined chunks
    if (this.chunkStrategy === 'manual') {
      for (const [chunkName, components] of this.chunks) {
        if (components.includes(componentName)) {
          return chunkName;
        }
      }
    }

    // For other strategies, we'd need to calculate on demand
    // For now, return null as chunks are determined at build time
    return null;
  }

  /**
   * Check if cache needs invalidation
   * @returns {boolean} True if cache should be invalidated
   */
  needsCacheInvalidation() {
    if (!this.cacheEnabled) return false;

    // Check if any component CSS has changed
    for (const [componentName, css] of this.components) {
      const cachedHash = this.cacheManifest.get(componentName);
      const currentHash = this.hashCss(css);

      if (cachedHash !== currentHash) {
        debug(`Cache invalidation needed for component: ${componentName}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Update cache manifest with current component hashes
   */
  updateCacheManifest() {
    if (!this.cacheEnabled) return;

    for (const [componentName, css] of this.components) {
      this.cacheManifest.set(componentName, this.hashCss(css));
    }

    debug(`Updated cache manifest for ${this.components.size} components`);
  }

  /**
   * Generate simple hash for CSS content
   * @param {string} css - CSS content
   * @returns {string} Hash string
   */
  hashCss(css) {
    let hash = 0;
    for (let i = 0; i < css.length; i++) {
      const char = css.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear cache manifest
   */
  clearCache() {
    this.cacheManifest.clear();
    debug('Cleared CSS cache manifest');
  }
}

// Global instance for collection during build
let globalCssCollector = null;

/**
 * Get or create global CSS collector
 */
export function getCssCollector(options = {}) {
  if (!globalCssCollector) {
    globalCssCollector = new CSSCollectionService(options);
  }
  return globalCssCollector;
}

/**
 * Initialize CSS collection for build
 */
export function startCssCollection(options = {}) {
  const collector = getCssCollector(options);
  collector.startCollection();
  return collector;
}

/**
 * Finalize CSS collection and generate bundle
 */
export async function finalizeCssCollection() {
  if (globalCssCollector) {
    await globalCssCollector.stopCollection();
  }
}
