/**
 * CSS Development Debugging Utilities
 * Provides debugging tools for CSS development and troubleshooting
 */

import { debug, info, warn } from '../utils/logger.js';

/**
 * CSS Debug Utilities
 */
export class CSSDebugUtils {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.verbose = options.verbose || false;
    this.showSourceMaps = options.showSourceMaps !== false;
  }

  /**
   * Log CSS processing information
   * @param {string} componentName - Component name
   * @param {Object} cssInfo - CSS processing information
   */
  logCssProcessing(componentName, cssInfo) {
    if (!this.enabled) return;

    info(`🔧 CSS Processing: ${componentName}`);
    if (this.verbose) {
      debug(`  📄 Original CSS: ${cssInfo.originalLength || 0} chars`);
      debug(`  🎨 Scoped CSS: ${cssInfo.scopedLength || 0} chars`);
      debug(`  ⚙️ Processed CSS: ${cssInfo.processedLength || 0} chars`);
      debug(
        `  🏷️ Scoped Classes: ${Object.keys(cssInfo.scopedClasses || {}).length}`
      );
    }
  }

  /**
   * Log CSS bundle information
   * @param {Object} bundleInfo - Bundle information
   */
  logCssBundle(bundleInfo) {
    if (!this.enabled) return;

    info(`📦 CSS Bundle Generated`);
    if (this.verbose) {
      debug(`  📂 Output: ${bundleInfo.outputPath}`);
      debug(`  📊 Components: ${bundleInfo.componentCount || 0}`);
      debug(`  📏 Size: ${bundleInfo.bundleSize || 0} bytes`);
      debug(`  🗂️ Chunks: ${bundleInfo.chunkCount || 0}`);
    }
  }

  /**
   * Log CSS source map information
   * @param {string} componentName - Component name
   * @param {Object} sourceMap - Source map object
   */
  logSourceMap(componentName, sourceMap) {
    if (!this.enabled || !this.showSourceMaps) return;

    if (sourceMap) {
      debug(`🗺️ Source map generated for ${componentName}`);
      if (this.verbose) {
        debug(`  📍 Sources: ${sourceMap.sources?.length || 0}`);
        debug(`  🏷️ Names: ${sourceMap.names?.length || 0}`);
        debug(`  📏 Mappings: ${sourceMap.mappings?.length || 0} chars`);
      }
    }
  }

  /**
   * Log CSS error with enhanced debugging information
   * @param {Error} error - CSS processing error
   * @param {string} componentName - Component name
   */
  logCssError(error, componentName) {
    if (!this.enabled) return;

    warn(`❌ CSS Error in ${componentName}: ${error.message}`);

    if (error.location) {
      warn(
        `   📍 Location: ${error.location.file}:${error.location.line}:${error.location.column}`
      );
    }

    if (this.verbose && error.stack) {
      debug(`   📋 Stack trace: ${error.stack}`);
    }
  }

  /**
   * Log CSS tree-shaking information
   * @param {Object} treeShakeInfo - Tree-shaking results
   */
  logTreeShaking(treeShakeInfo) {
    if (!this.enabled) return;

    info(`🌳 CSS Tree-shaking completed`);
    if (this.verbose) {
      debug(`  📊 Original components: ${treeShakeInfo.originalCount || 0}`);
      debug(`  ✅ Used components: ${treeShakeInfo.usedCount || 0}`);
      debug(`  🗑️ Removed components: ${treeShakeInfo.removedCount || 0}`);
      debug(`  💾 Space saved: ${treeShakeInfo.spaceSaved || 0} bytes`);
    }
  }

  /**
   * Log CSS chunking information
   * @param {Object} chunkingInfo - Chunking results
   */
  logChunking(chunkingInfo) {
    if (!this.enabled) return;

    info(`📦 CSS Chunking completed`);
    if (this.verbose) {
      debug(`  🗂️ Total chunks: ${chunkingInfo.chunkCount || 0}`);
      debug(`  📊 Strategy: ${chunkingInfo.strategy || 'unknown'}`);
      debug(`  📏 Max chunk size: ${chunkingInfo.maxChunkSize || 0} bytes`);

      if (chunkingInfo.chunks) {
        chunkingInfo.chunks.forEach((chunk, index) => {
          debug(
            `  📄 Chunk ${index}: ${chunk.componentCount || 0} components, ${chunk.size || 0} bytes`
          );
        });
      }
    }
  }

  /**
   * Create CSS inspection utility for development
   * @param {string} css - CSS content
   * @param {string} componentName - Component name
   * @returns {Object} Inspection utilities
   */
  createInspector(css, componentName) {
    return {
      // Count CSS rules
      getRuleCount: () => {
        const ruleMatches = css.match(/[^{}]+\{/g);
        return ruleMatches ? ruleMatches.length : 0;
      },

      // Count CSS declarations
      getDeclarationCount: () => {
        const declarationMatches = css.match(/[^;]+;/g);
        return declarationMatches ? declarationMatches.length : 0;
      },

      // Get CSS selectors
      getSelectors: () => {
        const selectorMatches = css.match(/([^{}]+)\{/g);
        return selectorMatches
          ? selectorMatches.map((match) => match.replace('{', '').trim())
          : [];
      },

      // Check for scoped classes
      getScopedClasses: () => {
        const scopedMatches = css.match(
          /\.([a-zA-Z_-]+_[a-zA-Z_-]+_[a-z0-9]+)/g
        );
        return scopedMatches ? [...new Set(scopedMatches)] : [];
      },

      // Generate debug summary
      getDebugSummary: () => {
        const summary = {
          component: componentName,
          rules: this.getRuleCount(),
          declarations: this.getDeclarationCount(),
          selectors: this.getSelectors(),
          scopedClasses: this.getScopedClasses(),
          size: css.length,
        };

        if (this.verbose) {
          debug(`🔍 CSS Debug Summary for ${componentName}:`, summary);
        }

        return summary;
      },
    };
  }
}

// Global debug utilities instance
let globalCssDebugUtils = null;

/**
 * Get global CSS debug utilities instance
 * @param {Object} options - Debug options
 * @returns {CSSDebugUtils} Debug utilities instance
 */
export function getCssDebugUtils(options = {}) {
  if (!globalCssDebugUtils) {
    globalCssDebugUtils = new CSSDebugUtils(options);
  }
  return globalCssDebugUtils;
}

/**
 * Enable CSS debugging globally
 * @param {Object} options - Debug options
 */
export function enableCssDebugging(options = {}) {
  globalCssDebugUtils = new CSSDebugUtils({ ...options, enabled: true });
  info('🐛 CSS debugging enabled');
}

/**
 * Disable CSS debugging globally
 */
export function disableCssDebugging() {
  if (globalCssDebugUtils) {
    globalCssDebugUtils.enabled = false;
  }
  info('🐛 CSS debugging disabled');
}
