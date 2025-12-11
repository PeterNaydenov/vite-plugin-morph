/**
 * Configuration Loader
 * @fileoverview Handles loading and parsing of morph configuration
 */

import { debug, error } from '../utils/logger.js';

/**
 * Parse morph configuration file
 * @param {string} configPath - Path to morph.config.js file
 * @returns {Promise<Object>} Parsed configuration
 */
export async function parseMorphConfig(configPath) {
    try {
        const config = await import(`file://${configPath}`);
        const components = config.default?.components || {};

        debug(
            `Parsed morph configuration from ${configPath}:`,
            Object.keys(components)
        );
        return { components };
    } catch (err) {
        error(`Failed to parse morph configuration ${configPath}: ${err.message}`);
        return null;
    }
}
