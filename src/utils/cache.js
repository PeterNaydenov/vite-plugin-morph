/**
 * File processing cache for morph plugin
 * @fileoverview Provides caching functionality to improve performance
 * @author Peter Naydenov
 * @version 1.0.0
 */

import { createHash } from 'crypto';

/**
 * Simple in-memory cache for morph files
 * @class
 */
class MorphCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum number of cached files
  }

  /**
   * Generate cache key from file content
   * @param {string} content - File content
   * @returns {string} Cache key
   */
  generateKey(content) {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Get cached result
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result or null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < 300000) { // 5 minutes TTL
      return entry.data;
    }
    return null;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  set(key, data) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
}

// Global cache instance
const globalCache = new MorphCache();

/**
 * Get cached processing result
 * @param {string} content - File content
 * @returns {Object|null} Cached result or null
 */
export function getCachedResult(content) {
  const key = globalCache.generateKey(content);
  const result = globalCache.get(key);
  
  if (result) {
    globalCache.hitCount = (globalCache.hitCount || 0) + 1;
  } else {
    globalCache.missCount = (globalCache.missCount || 0) + 1;
  }
  
  return result;
}

/**
 * Cache processing result
 * @param {string} content - File content
 * @param {Object} result - Processing result to cache
 */
export function setCachedResult(content, result) {
  const key = globalCache.generateKey(content);
  globalCache.set(key, result);
}

/**
 * Clear all cached results
 */
export function clearCache() {
  globalCache.clear();
  globalCache.hitCount = 0;
  globalCache.missCount = 0;
}

/**
 * Get cache statistics
 * @returns {Object} Cache performance stats
 */
export function getCacheStats() {
  return globalCache.getStats();
}