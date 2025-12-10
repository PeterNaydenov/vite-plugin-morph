/**
 * CSS Collection Service
 * Collects and bundles component CSS for production builds
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { debug, info, warn } from '../utils/logger.js';

/**
 * CSS Collection Service
 */
export class CSSCollectionService {
  constructor(options = {}) {
    this.outputDir = options.outputDir || 'dist/components';
    this.components = new Map();
    this.isCollecting = false;
  }

  /**
   * Start CSS collection
   */
  startCollection() {
    this.isCollecting = true;
    this.components.clear();
    info('Started CSS collection for components');
  }

  /**
   * Stop CSS collection and generate bundle
   */
  async stopCollection() {
    if (!this.isCollecting) return;

    this.isCollecting = false;
    await this.generateBundle();
    info('Stopped CSS collection and generated bundle');
  }

  /**
   * Add component CSS
   * @param {string} componentName - Component name
   * @param {string} css - CSS content
   */
  addComponentCss(componentName, css) {
    if (!this.isCollecting) return;

    debug(`Adding CSS for component: ${componentName}`);
    this.components.set(componentName, css);
  }

  /**
   * Generate bundled CSS file
   */
  async generateBundle() {
    if (this.components.size === 0) {
      warn('No component CSS to bundle');
      return;
    }

    try {
      // Create output directory
      await mkdir(this.outputDir, { recursive: true });

      // Generate bundled CSS with layers
      const bundledCss = this.buildBundledCss();

      // Write bundle file
      const outputPath = join(this.outputDir, 'components.css');
      await writeFile(outputPath, bundledCss, 'utf-8');

      info(
        `Generated CSS bundle: ${outputPath} (${this.components.size} components)`
      );
    } catch (error) {
      warn(`Failed to generate CSS bundle: ${error.message}`);
    }
  }

  /**
   * Build bundled CSS with proper layers
   */
  buildBundledCss() {
    const cssParts = [];

    // Add layer declaration
    cssParts.push('@layer components;');

    // Add each component's CSS wrapped in layer
    for (const [componentName, css] of this.components) {
      cssParts.push('');
      cssParts.push(`/* ${componentName} */`);
      cssParts.push(`@layer components {`);
      cssParts.push(css);
      cssParts.push('}');
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
