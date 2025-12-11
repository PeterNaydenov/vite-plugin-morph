/**
 * CSS Tree-Shaking Service
 * Analyzes component usage and filters CSS for tree-shaking
 * @fileoverview CSS tree-shaking with component usage analysis
 * @author Peter Naydenov
 * @version 0.0.10
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { debug, info, warn } from '../utils/logger.js';

/**
 * CSS Tree-Shaking Service for bundle optimization
 * @class
 */
export class CSSTreeShaker {
  /**
   * Create CSS tree-shaker instance
   * @param {Object} [options={}] - Tree-shaking options
   * @param {string} [options.srcDir='src'] - Source directory to analyze
   * @param {string[]} [options.extensions=['.js', '.ts', '.jsx', '.tsx', '.mjs']] - File extensions to analyze
   */
  constructor(options = {}) {
    this.options = {
      srcDir: options.srcDir || 'src',
      extensions: options.extensions || ['.js', '.ts', '.jsx', '.tsx', '.mjs'],
      ...options,
    };
    this.componentUsage = new Map();
    this.analyzedFiles = new Set();
  }

  /**
   * Analyze component usage across the codebase
   * @returns {Promise<Set<string>>} Set of used component names
   */
  async analyzeComponentUsage() {
    info('Starting CSS tree-shaking analysis...');

    try {
      // Find all source files
      const pattern = `${this.options.srcDir}/**/*{${this.options.extensions.join(',')}}`;
      const files = await glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      debug(`Found ${files.length} source files to analyze`);

      // Analyze each file for component imports
      for (const file of files) {
        await this.analyzeFile(file);
      }

      const usedComponents = new Set(this.componentUsage.keys());
      info(
        `CSS tree-shaking analysis complete. Found ${usedComponents.size} used components.`
      );

      return usedComponents;
    } catch (error) {
      warn(`CSS tree-shaking analysis failed: ${error.message}`);
      return new Set(); // Return empty set on failure
    }
  }

  /**
   * Analyze a single file for component imports
   * @param {string} filePath - Path to the file to analyze
   */
  async analyzeFile(filePath) {
    if (this.analyzedFiles.has(filePath)) return;

    try {
      const content = await readFile(filePath, 'utf-8');
      this.analyzedFiles.add(filePath);

      // Look for morph component imports
      const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+\.morph)['"`]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const componentName = this.extractComponentName(importPath);

        if (componentName) {
          this.componentUsage.set(componentName, {
            filePath,
            importPath,
            line: content.substring(0, match.index).split('\n').length,
          });
          debug(`Found component usage: ${componentName} in ${filePath}`);
        }
      }

      // Also check for dynamic imports
      const dynamicImportRegex =
        /import\s*\(\s*['"`]([^'"`]+\.morph)['"`]\s*\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        const componentName = this.extractComponentName(importPath);

        if (componentName) {
          this.componentUsage.set(componentName, {
            filePath,
            importPath,
            dynamic: true,
            line: content.substring(0, match.index).split('\n').length,
          });
          debug(
            `Found dynamic component usage: ${componentName} in ${filePath}`
          );
        }
      }
    } catch (error) {
      warn(`Failed to analyze file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Extract component name from import path
   * @param {string} importPath - Import path (e.g., './components/Button.morph')
   * @returns {string|null} Component name or null if not a morph import
   */
  extractComponentName(importPath) {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const parts = importPath.split('/');
      const filename = parts[parts.length - 1];

      if (filename.endsWith('.morph')) {
        return filename.replace('.morph', '');
      }
    }

    // Handle absolute imports from src
    if (importPath.includes('/components/') && importPath.endsWith('.morph')) {
      const parts = importPath.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace('.morph', '');
    }

    return null;
  }

  /**
   * Filter CSS collection based on used components
   * @param {Map<string, string>} cssCollection - Component name -> CSS mapping
   * @returns {Map<string, string>} Filtered CSS collection
   */
  filterCSS(cssCollection) {
    const usedComponents = Array.from(this.componentUsage.keys());
    const filtered = new Map();

    for (const [componentName, css] of cssCollection) {
      if (usedComponents.includes(componentName)) {
        filtered.set(componentName, css);
        debug(`Including CSS for used component: ${componentName}`);
      } else {
        debug(`Excluding CSS for unused component: ${componentName}`);
      }
    }

    const savings = cssCollection.size - filtered.size;
    info(
      `CSS tree-shaking: ${savings} unused components excluded, ${filtered.size} components included`
    );

    return filtered;
  }

  /**
   * Get usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    const usedComponents = Array.from(this.componentUsage.keys());
    const dynamicImports = Array.from(this.componentUsage.values()).filter(
      (usage) => usage.dynamic
    );

    return {
      totalFilesAnalyzed: this.analyzedFiles.size,
      totalComponentsUsed: usedComponents.length,
      dynamicImportsCount: dynamicImports.length,
      components: usedComponents,
    };
  }

  /**
   * Check if a component is used
   * @param {string} componentName - Component name to check
   * @returns {boolean} True if component is used
   */
  isComponentUsed(componentName) {
    return this.componentUsage.has(componentName);
  }

  /**
   * Get usage details for a component
   * @param {string} componentName - Component name
   * @returns {Object|null} Usage details or null if not used
   */
  getComponentUsage(componentName) {
    return this.componentUsage.get(componentName) || null;
  }
}

// Global instance
let globalTreeShaker = null;

/**
 * Get global CSS tree-shaker instance
 */
export function getCSSTreeShaker(options = {}) {
  if (!globalTreeShaker) {
    globalTreeShaker = new CSSTreeShaker(options);
  }
  return globalTreeShaker;
}

/**
 * Analyze component usage and return used components
 */
export async function analyzeComponentUsage(options = {}) {
  const treeShaker = getCSSTreeShaker(options);
  return await treeShaker.analyzeComponentUsage();
}

/**
 * Filter CSS collection based on usage analysis
 */
export function filterCSSForTreeShaking(cssCollection, options = {}) {
  const treeShaker = getCSSTreeShaker(options);
  return treeShaker.filterCSS(cssCollection);
}
