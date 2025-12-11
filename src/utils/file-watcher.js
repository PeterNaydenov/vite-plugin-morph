/**
 * File Watcher for Hot Module Replacement
 * @fileoverview Provides file watching capabilities for compositions and themes
 * @author Peter Naydenov
 * @version 0.1.0
 */

import { watch } from 'fs';
import { debug, info, warn } from './logger.js';

/**
 * File watcher class for monitoring file changes
 */
class FileWatcher {
  constructor(options = {}) {
    this.watchers = new Map();
    this.debounceTimers = new Map();
    this.options = {
      debounceMs: 100,
      ...options,
    };
  }

  /**
   * Start watching a file or directory
   * @param {string} path - Path to watch
   * @param {Function} callback - Callback for file changes
   * @returns {Function} Stop watching function
   */
  watch(path, callback) {
    if (this.watchers.has(path)) {
      warn(`Already watching ${path}`);
      return () => {};
    }

    try {
      const watcher = watch(
        path,
        { recursive: false },
        (eventType, filename) => {
          debug(`File change detected: ${eventType} - ${filename}`);
          console.log(
            `[DEBUG] Watch listener triggered for ${path}, event: ${eventType}`
          );

          // Debounce rapid changes
          this.debounceChange(path, callback, eventType, filename);
        }
      );

      this.watchers.set(path, watcher);

      info(`Started watching ${path}`);

      return () => {
        try {
          watcher.close();
        } catch (err) {
          warn(`Error stopping watcher for ${path}: ${err.message}`);
        }
        this.watchers.delete(path);
        info(`Stopped watching ${path}`);
      };
    } catch (err) {
      warn(`Failed to watch ${path}: ${err.message}`);
      return () => {};
    }
  }

  /**
   * Debounce file changes to prevent excessive processing
   * @param {string} path - File path
   * @param {Function} callback - Change callback
   * @param {string} eventType - Type of change
   * @param {string} filename - Changed filename
   */
  debounceChange(path, callback, eventType, filename) {
    const key = `${eventType}:${filename}`;
    console.log(`[DEBUG] Debouncing change for ${key}`);

    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      try {
        console.log(`[DEBUG] Executing watcher callback for ${path}`);
        callback({ eventType, filename, path });
      } catch (err) {
        warn(`File watcher callback error for ${path}: ${err.message}`);
      }
      this.debounceTimers.delete(key);
    }, this.options.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Stop all watchers
   */
  stopAll() {
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
        info(`Stopped watching ${path}`);
      } catch (err) {
        warn(`Error stopping watcher for ${path}: ${err.message}`);
      }
    }

    this.watchers.clear();
    this.watchers.clear();
    this.debounceTimers.clear();
  }

  /**
   * Watch a single file
   * @param {string} path - Path to file
   * @param {Function} callback - Callback function
   * @param {Object} options - Watch options
   * @returns {Function} Unwatch function
   */
  watchFile(path, callback, options = {}) {
    return this.watch(path, callback);
  }

  /**
   * Watch a directory with glob patterns
   * @param {string} dir - Directory to watch
   * @param {string|string[]} patterns - Glob patterns
   * @param {Function} callback - Callback function
   * @returns {Function} Unwatch function
   */
  watchDirectory(dir, patterns, callback) {
    // Normalize patterns to array
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    // Create a filtered callback that checks patterns
    const filteredCallback = ({ eventType, filename, path }) => {
      if (!filename) return;

      // Check if filename matches any of the patterns
      const matchesPattern = patternArray.some((pattern) => {
        // Simple glob matching (supports * and **)
        const regex = new RegExp(
          pattern
            .replace(/\./g, '\\.') // Escape dots
            .replace(/\*\*/g, '.*') // ** matches any characters
            .replace(/\*/g, '.*') // * matches any characters (including /)
        );
        return regex.test(filename);
      });

      if (matchesPattern) {
        callback({ eventType, filename, path });
      }
    };

    return this.watch(dir, filteredCallback);
  }
}

/**
 * Watch configuration file for changes
 * @param {string} configPath - Path to morph.config.js
 * @param {Function} callback - Change callback
 * @returns {Function} Stop watching function
 */
export function watchConfigFile(configPath, callback) {
  const watcher = new FileWatcher();
  return watcher.watch(configPath, callback);
}

/**
 * Watch theme files for changes
 * @param {string} themesDir - Directory containing theme files
 * @param {Function} callback - Change callback
 * @returns {Function} Stop watching function
 */
export function watchThemeFiles(themesDir, callback) {
  const watcher = new FileWatcher();
  return watcher.watch(themesDir, callback);
}

/**
 * Watch component files for changes
 * @param {string} componentsDir - Directory containing morph files
 * @param {Function} callback - Change callback
 * @returns {Function} Stop watching function
 */
export function watchComponentFiles(componentsDir, callback) {
  const watcher = new FileWatcher();
  return watcher.watch(componentsDir, callback);
}

/**
 * Create a composite watcher for multiple paths
 * @param {Array<string>} paths - Paths to watch
 * @param {Function} callback - Change callback
 * @returns {Function} Stop watching function
 */
export function createCompositeWatcher(paths, callback) {
  const watcher = new FileWatcher();
  const stopFunctions = [];

  for (const path of paths) {
    const stopFn = watcher.watch(path, callback);
    stopFunctions.push(stopFn);
  }

  return () => {
    for (const stopFn of stopFunctions) {
      stopFn();
    }
  };
}

export { FileWatcher };
