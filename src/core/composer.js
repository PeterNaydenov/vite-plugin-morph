/**
 * Component Composition System
 * @fileoverview Handles build-time component composition using morph curry command
 * @author Peter Naydenov
 * @version 0.1.0
 */

import { parseMorphConfig } from './config-loader.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { morph } from '@peter.naydenov/morph';
import { createMorphError } from './errors.js';
import { debug, info, warn, error } from '../utils/logger.js';

/**
 * Load a morph component from file
 * @param {string} filePath - Path to morph file
 * @returns {Promise<Object>} Loaded morph component
 */
async function loadMorphComponent(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');

    // For now, we'll use a simple parser - this should be enhanced later
    // TODO: Integrate with existing parser.js for full morph file parsing
    const component = {
      template: content,
      helpers: {},
      handshake: {},
    };

    debug(`Loaded morph component from ${filePath}`);
    return component;
  } catch (err) {
    error(`Failed to load morph component ${filePath}: ${err.message}`);
    throw err;
  }
}



/**
 * Validate composition definition
 * @param {string} componentName - Name of component being composed
 * @param {Object} composition - Composition definition
 * @returns {Array<string>} List of validation errors
 */
function validateComposition(componentName, composition) {
  const errors = [];

  if (!composition.host) {
    errors.push(`Missing host component for composition "${componentName}"`);
  }

  if (!composition.placeholders) {
    errors.push(
      `Missing placeholders definition for composition "${componentName}"`
    );
  }

  // Check if host component exists
  if (composition.host) {
    const hostPath = resolve(dirname(dirname(process.cwd())), composition.host);
    if (!existsSync(hostPath)) {
      errors.push(
        `Host component "${composition.host}" not found for composition "${componentName}"`
      );
    }
  }

  // Check if placeholder components exist
  if (composition.placeholders) {
    for (const [placeholder, componentPath] of Object.entries(
      composition.placeholders
    )) {
      const fullComponentPath = resolve(
        dirname(dirname(process.cwd())),
        componentPath
      );
      if (!existsSync(fullComponentPath)) {
        errors.push(
          `Placeholder component "${componentPath}" not found for composition "${componentName}"`
        );
      }
    }
  }

  return errors;
}

/**
 * Detect circular dependencies in compositions
 * @param {Object} compositions - All composition definitions
 * @param {string} componentName - Component being checked
 * @returns {Array<string>} Circular dependency chain
 */
function detectCircularDependencies(compositions, componentName) {
  const visited = new Set();
  const chain = [];

  function checkCircular(name) {
    if (visited.has(name)) {
      return [...visited, name];
    }

    visited.add(name);
    const composition = compositions[name];
    if (!composition) return [];

    chain.push(name);

    // Check host component
    if (composition.host) {
      const circular = checkCircular(basename(composition.host, '.morph'));
      if (circular.length > 0) return circular;
    }

    // Check placeholder components
    if (composition.placeholders) {
      for (const componentPath of Object.values(composition.placeholders)) {
        const circular = checkCircular(basename(componentPath, '.morph'));
        if (circular.length > 0) return circular;
      }
    }

    chain.pop();
    visited.delete(name);
    return [];
  }

  return checkCircular(componentName);
}

/**
 * Create composed component using morph curry
 * @param {string} componentName - Name of the composed component
 * @param {Object} composition - Composition definition
 * @param {Object} options - Build options
 * @returns {Promise<Object>} Composed component
 */
async function createComposedComponent(
  componentName,
  composition,
  options = {}
) {
  const startTime = Date.now();

  try {
    info(`Creating composed component: ${componentName}`);

    // Load host component
    const hostComponent = await loadMorphComponent(composition.host);

    // Load placeholder components
    const placeholderComponents = {};
    for (const [placeholder, componentPath] of Object.entries(
      composition.placeholders
    )) {
      placeholderComponents[placeholder] =
        await loadMorphComponent(componentPath);
    }

    // Create curry configuration
    const curryConfig = {
      template: {
        // Replace placeholders with component templates
        // This is a simplified approach - should be enhanced with proper template parsing
        template: hostComponent.template,
      },
      helpers: {
        // Merge helpers from host and placeholder components
        ...hostComponent.helpers,
        ...Object.values(placeholderComponents).reduce(
          (acc, comp) => ({
            ...acc,
            ...comp.helpers,
          }),
          {}
        ),
      },
      handshake: {
        // Merge handshake data
        ...hostComponent.handshake,
        ...Object.values(placeholderComponents).reduce(
          (acc, comp) => ({
            ...acc,
            ...comp.handshake,
          }),
          {}
        ),
      },
    };

    // Use morph curry to create composed component
    const composedComponent = morph.curry(hostComponent, curryConfig);

    const processingTime = Date.now() - startTime;
    info(
      `Successfully created composed component ${componentName} in ${processingTime}ms`
    );

    return {
      component: composedComponent,
      processingTime,
      host: composition.host,
      placeholders: composition.placeholders,
      metadata: {
        isComposed: true,
        source: 'config',
        host: composition.host,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    error(
      `Failed to create composed component ${componentName}: ${err.message}`
    );
    throw createMorphError(err, componentName, { processingTime });
  }
}

/**
 * Process all compositions from configuration
 * @param {string} configPath - Path to morph.config.js
 * @param {Object} options - Build options
 * @returns {Promise<Object>} Processing results
 */
export async function processCompositions(
  configPath,
  outputDir,
  options = {}
) {
  const startTime = Date.now();

  try {
    const config = await parseMorphConfig(configPath);

    if (!config) {
      throw new Error('Configuration file not found or invalid');
    }

    const compositions = config.components || {};
    const results = {};
    const errors = {};

    info(
      `Processing ${Object.keys(compositions).length} compositions from ${configPath}`
    );

    // Validate all compositions first
    for (const [componentName, composition] of Object.entries(compositions)) {
      const validationErrors = validateComposition(componentName, composition);
      if (validationErrors.length > 0) {
        errors[componentName] = validationErrors;
      }
    }

    // Check for circular dependencies
    for (const [componentName, composition] of Object.entries(compositions)) {
      const circularChain = detectCircularDependencies(
        compositions,
        componentName
      );
      if (circularChain.length > 0) {
        errors[componentName] = [
          `Circular dependency detected: ${circularChain.join(' -> ')}`,
        ];
      }
    }

    // If there are validation errors, fail early
    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      const errorMessages = Object.entries(errors)
        .map(([name, errs]) => `${name}: ${errs.join(', ')}`)
        .join('; ');

      throw createMorphError(
        new Error(`Composition validation failed: ${errorMessages}`),
        configPath,
        { validationErrors: errors }
      );
    }

    // Process valid compositions
    for (const [componentName, composition] of Object.entries(compositions)) {
      try {
        results[componentName] = await createComposedComponent(
          componentName,
          composition,
          options
        );
      } catch (err) {
        errors[componentName] = [err.message];
        warn(`Failed to create composition ${componentName}: ${err.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    const successCount = Object.keys(results).length;
    const totalCount = Object.keys(compositions).length;

    info(
      `Composition processing complete: ${successCount}/${totalCount} successful in ${processingTime}ms`
    );

    return {
      results,
      errors,
      metadata: {
        totalCompositions: totalCount,
        successfulCompositions: successCount,
        failedCompositions: errorCount,
        processingTime,
      },
    };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    error(`Failed to process compositions: ${err.message}`);
    throw createMorphError(err, configPath, { processingTime });
  }
}

/**
 * Get composition metadata for runtime queries
 * @param {string} configPath - Path to morph.config.js
 * @param {string} componentName - Component name to query
 * @returns {Promise<Object|null>} Composition metadata
 */
export async function getCompositionMetadata(configPath, componentName) {
  try {
    const config = await parseMorphConfig(configPath);
    const composition = config.components?.[componentName];

    if (!composition) {
      return null;
    }

    return {
      name: componentName,
      host: composition.host,
      placeholders: composition.placeholders || {},
      isComposed: true,
      source: 'config',
    };
  } catch (err) {
    warn(
      `Failed to get composition metadata for ${componentName}: ${err.message}`
    );
    return null;
  }
}

/**
 * Check if a component is composed
 * @param {string} configPath - Path to morph.config.js
 * @param {string} componentName - Component name to check
 * @returns {Promise<boolean>} Whether component is composed
 */
export async function isComposedComponent(configPath, componentName) {
  try {
    const config = await parseMorphConfig(configPath);
    return !!config.components?.[componentName];
  } catch (err) {
    warn(
      `Failed to check if component is composed ${componentName}: ${err.message}`
    );
    return false;
  }
}
