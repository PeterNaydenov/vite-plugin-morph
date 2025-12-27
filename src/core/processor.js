/**
 * Main morph file processing pipeline
 * @fileoverview Orchestrates conversion of .morph files to ES modules
 * @author Peter Naydenov
 * @version 0.0.10
 */

import path from 'path';
import {
  parseMorphFile,
  extractScriptContent,
  extractStyleContent,
  extractHandshakeContent,
  parseJsonLike,
} from './parser.js';
import { extractTemplateContent, extractRequiredHelpers } from './template.js';
import { processScriptContent } from './script.js';
import {
  createMorphError,
  createCssProcessingError,
  createCssScopingError,
  extractLocationFromPostCssError,
} from './errors.js';
import { getCachedResult, setCachedResult } from '../utils/cache.js';
import { debug, info, error, warn } from '../utils/logger.js';
import { isProductionMode } from '../utils/shared.js';
import { scopeCss } from '../core/css-scoper.js';
import { processCss } from '../core/css-processor.js';
import { getCssCollector } from '../services/css-collection.js';

/**
 * Process a morph file and return compiled result
 * @param {string} content - Raw morph file content
 * @param {string} filePath - File path
 * @param {import('../../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../../types/index.d.ts').ProcessingResult>} Processing result
 */
export async function processMorphFile(content, filePath, options) {
  const startTime = Date.now();

  try {
    // Extract template placeholders from raw content BEFORE HTML parsing
    const { extractPlaceholdersFromHTML } = await import('./template.js');
    const rawPlaceholders = extractPlaceholdersFromHTML(content);

    // Check cache first (include options in cache key for production mode differences)
    const cacheKey = JSON.stringify({ content, options, version: 3 });
    const cached = getCachedResult(cacheKey);

    if (cached) {
      info(`Using cached result for ${filePath}`);
      return cached;
    }

    // Parse morph file
    const document = parseMorphFile(content);
    debug(
      `Parsed morph file: ${filePath}, document nodes: ${document.childNodes?.length || 0}`
    );

     // Extract content in order: CSS first, then JS, then check what's left for template
     const styleRaw = extractStyleContent(document);
     const style = styleRaw ? { css: styleRaw } : null;
     let cssSourceMap = null; // Will be set during CSS processing
     debug(`Extracted style: ${style ? 'yes' : 'no'}`);

     const scriptRaw = extractScriptContent(document, 'text/javascript');

    // Process script content to extract functions and templates
    const script = scriptRaw ? processScriptContent(scriptRaw) : null;

    // Extract template content (everything that's not script or style)
    const template = extractTemplateContent(document, content, rawPlaceholders);

    // Extract handshake data from script
    const handshakeRaw = extractHandshakeContent(document, 'application/json');
    const handshake = handshakeRaw ? { data: parseJsonLike(handshakeRaw) } : {};

     // Check for CSS variable usage
     const usesCssVariables = style && /var\(--[^)]+\)/.test(style.css);

     // Determine if this is CSS-only
     const isCSSOnly = !!style && !scriptRaw && !template.html;

     // Extract component name for CSS scoping (skip for CSS-only files)
     const componentName = isCSSOnly ? '' : filePath
       .split(/[/\\]/)
       .pop()
       .replace('.morph', '');

     // Process CSS for scoping if present and not CSS-only
     let processedStyle = style;
     if (style && !isCSSOnly) {
       const scopedResult = scopeCss(style.css, componentName);
       processedStyle = {
         css: style.css,
         processedCss: scopedResult.scopedCss,
         scopedClasses: scopedResult.scopedClasses,
       };
     }

    // Get root directory for relative path calculations
    const rootDir = options.rootDir || process.cwd();

    // Build helpers object
    const helpers = {};

    // Add function helpers
    if (script && script.functions) {
      Object.assign(helpers, script.functions);
      console.log(
        '[vite-plugin-morph] Added function helpers:',
        Object.keys(script.functions)
      );
    }

    // Add template helpers
    if (script && script.templates) {
      // For string helpers, preserve backticks in template object (as expected by tests)
      Object.assign(helpers, script.templates);
      console.log(
        '[vite-plugin-morph] Added template helpers:',
        Object.keys(script.templates)
      );
    }

    console.log(
      '[vite-plugin-morph] Final helpers object:',
      Object.keys(helpers)
    );

    // Validate that all helpers referenced in template are available
    // Only validate if we successfully parsed helpers (helpers object has content)
    const hasParsedHelpers = Object.keys(helpers).length > 0;
    if (hasParsedHelpers) {
      const requiredHelpers = extractRequiredHelpers(template.html);
      const missingHelpers = requiredHelpers.filter(
        (name) => !(name in helpers)
      );

      if (missingHelpers.length > 0) {
        warn(
          `Missing helper functions: ${missingHelpers.join(', ')}. Template may not render correctly.`
        );
        // Don't throw error - allow processing to continue with available helpers
      }
    }

    const templateObject = {
      template: template.html,
      helpers: Object.keys(helpers).length > 0 ? helpers : {},
      handshake: handshake?.data || {},
    };

    // Debug: log template content
    console.log('Template object:', {
      template: templateObject.template.substring(0, 100) + '...',
      helpers: Object.keys(templateObject.helpers),
      handshake: templateObject.handshake
    });

    // Store helpers separately for code generation
    const helperFunctions = helpers;



    // Generate ES module code
     const moduleCode = generateESModule(
       templateObject,
       helperFunctions,
       processedStyle,
       handshake?.data,
       options,
       isCSSOnly,
       componentName,
       usesCssVariables
     );

    const processingTime = Date.now() - startTime;

    // Ensure moduleCode is always a valid string
    const safeModuleCode =
      typeof moduleCode === 'string'
        ? moduleCode
        : '// Error: Invalid module code generated';

    // Create result object
    const result = {
      code: safeModuleCode,
      cssExports: processedStyle?.css,
      cssSourceMap: cssSourceMap,
      usedVariables: template.usedVariables,
      templateObject,
      isCSSOnly,
      processingTime,
      metadata: {
        processingTime,
        components: {
          template: !!template.html,
          helpers: Object.keys(helpers).length,
          handshake: !!handshake?.data,
          css: !!processedStyle?.css,
        },
      },
    };

    // Cache result
    setCachedResult(cacheKey, result);

    info(`Successfully processed ${filePath} in ${processingTime}ms`);
    return result;
  } catch (err) {
    const errorResult = createMorphError(err, filePath || 'unknown-file');
    const safeMessage = errorResult?.message || 'Processing failed';
    const safeFilePath = filePath || 'unknown-file';

    error(`Failed to process ${safeFilePath}: ${safeMessage}`);

    // Return error result with safe defaults
    return {
      code: `// Error: ${safeMessage}`,
      cssExports: null,
      usedVariables: undefined,
      templateObject: null,
      isCSSOnly: false,
      processingTime: Date.now() - startTime,
      metadata: {
        processingTime: Date.now() - startTime,
        components: {
          template: false,
          script: false,
          style: false,
          handshake: false,
        },
        css: undefined,
        template: undefined,
      },
      errors: [errorResult],
    };
  }
}

/**
 * Check if function code is syntactically valid
 * @param {string} funcCode - Function code to validate
 * @returns {boolean} Whether the code is valid
 */
function isValidFunctionCode(funcCode) {
  try {
    // Try to parse the function code as an expression
    new Function(`return ${funcCode}`);
    return true;
  } catch (error) {
    console.warn(
      `[vite-plugin-morph] Function code validation failed: ${error.message}`
    );
    return false;
  }
}

/**
 * Generate ES module code from processed morph components
 * @param {import('../../types/index.d.ts').TemplateObject} templateObject - Processed template object
 * @param {Object<string,Function>} helperFunctions - Helper functions
 * @param {import('../../types/index.d.ts').StyleObject|null} style - Processed style object
 * @param {import('../../types/index.d.ts').HandshakeObject|null} handshake - Handshake data
 * @param {import('../../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @param {boolean} isCSSOnly - Whether this is a CSS-only file
 * @returns {string} Generated ES module code
 */
function generateESModule(
  templateObject,
  helperFunctions,
  style,
  handshakeData,
  options,
  isCSSOnly,
  componentName,
  usesCssVariables
) {
  const parts = [];

  if (isCSSOnly) {
    // CSS-only files: export styles directly, no morph utilities
    parts.push('// Export CSS styles');
    parts.push(`const css = ${JSON.stringify(style.processedCss || style.css)};`);
    parts.push(`export const styles = css;`);

    // Inject CSS in development mode
    parts.push('');
    parts.push('// Inject CSS in development');
    parts.push(`if (typeof document !== 'undefined' && css) {`);
    parts.push(`  const styleId = 'morph-css-' + ${JSON.stringify(componentName)};`);
    parts.push(`  let styleElement = document.getElementById(styleId);`);
    parts.push(`  if (!styleElement) {`);
    parts.push(`    styleElement = document.createElement('style');`);
    parts.push(`    styleElement.id = styleId;`);
    parts.push(`    document.head.appendChild(styleElement);`);
    parts.push(`  }`);
    parts.push(`  styleElement.textContent = css;`);
    parts.push(`}`);

    // Add HMR handling for CSS updates (only in non-test environments)
    if (!options.test) {
      parts.push('');
      parts.push('// HMR handling for CSS updates');
      parts.push(`if (import.meta.hot) {`);
      parts.push(`  import.meta.hot.accept(() => {`);
      parts.push(`    // Update CSS when module changes`);
      parts.push(`    if (typeof document !== 'undefined' && css) {`);
      parts.push(`      const styleId = 'morph-css-' + ${JSON.stringify(componentName)};`);
      parts.push(`      let styleElement = document.getElementById(styleId);`);
      parts.push(`      if (!styleElement) {`);
      parts.push(`        styleElement = document.createElement('style');`);
      parts.push(`        styleElement.id = styleId;`);
      parts.push(`        document.head.appendChild(styleElement);`);
      parts.push(`      }`);
      parts.push(`      styleElement.textContent = css;`);
      parts.push(`    }`);
      parts.push(`  });`);
      parts.push(`}`);
    }
  } else {
    // Regular morph files: include morph utilities
    parts.push(`import morph from '@peter.naydenov/morph';`);

    // Import CSS variables file if CSS variables are used (creates HMR dependency)
    if (usesCssVariables && options.cssVarsFile) {
      // Calculate relative path from morph file to CSS file
      const morphDir = path.dirname(filePath);
      const cssPath = path.resolve(rootDir, options.cssVarsFile);
      const relativePath = path.relative(morphDir, cssPath);
      // Ensure it starts with ./ or ../
      const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
      parts.push(`import '${importPath.replace(/\\/g, '/')}';`);
    }

    parts.push('');

    // Create template object
    parts.push('// Template object');
    parts.push(`const template = ${JSON.stringify(templateObject, null, 2)};`);
    parts.push('');

    // Define styles map (scoped classes or empty)
    parts.push('// Styles map');
    const stylesMap = style && style.scopedClasses ? style.scopedClasses : {};
    parts.push(`const styles = ${JSON.stringify(stylesMap)};`);
    parts.push('');

    // Prepare build dependencies
    const buildDependencies = Object.keys(stylesMap).length > 0 ? { styles: stylesMap } : {};



    // Add helpers if present
    if (helperFunctions && Object.keys(helperFunctions).length > 0) {
      parts.push('// Helpers');
      for (const [name, helper] of Object.entries(helperFunctions)) {
        try {
          // Validate helper name (should be valid JavaScript identifier)
          if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
            console.warn(
              `[vite-plugin-morph] Skipping helper with invalid name: ${name}`
            );
            continue;
          }

          if (typeof helper === 'function') {
            // For functions, create them using new Function
            try {
              let funcCode = helper.toString();
              // Remove comments that might break the generated code
              funcCode = funcCode.replace(/\/\/.*$/gm, '').trim();

              // Handle different function types
              if (funcCode.startsWith('function ')) {
                // Function declaration: execute and return the function
                const funcName = funcCode.match(/function\s+(\w+)/)[1];
                parts.push(
                  'try { ' +
                  funcCode +
                  '; template.helpers.' +
                  name +
                  ' = (props = {}, ...args) => (' +
                  funcName +
                  ')({ ...props, styles }, ...args); } catch(e) { console.warn(\'Failed to assign helper ' +
                  name +
                  ':\', e.message); }'
                );
              } else {
                // Arrow function or other: return the expression
                parts.push(
                  'try { template.helpers.' +
                  name +
                  ' = (props = {}, ...args) => (' +
                  funcCode +
                  ')({ ...props, styles }, ...args); } catch(e) { console.warn(\'Failed to assign helper ' +
                  name +
                  ':\', e.message); }'
                );
              }
            } catch (funcError) {
              console.warn(
                `[vite-plugin-morph] Cannot serialize function helper ${name}: ${funcError.message}`
              );
            }
          } else if (typeof helper === 'string') {
            // For strings, use JSON.stringify to safely escape
            const safeString = JSON.stringify(helper);
            parts.push(`template.helpers.${name} = ${safeString};`);
          } else {
            console.warn(
              `[vite-plugin-morph] Skipping helper ${name} with invalid type: ${typeof helper}`
            );
          }
        } catch (helperError) {
          console.warn(
            `[vite-plugin-morph] Error processing helper ${name}: ${helperError.message}`
          );
        }
      }
    }

    // Build render function
    parts.push('');
    parts.push('// Build render function');
    const dependenciesJson = JSON.stringify(buildDependencies);
    parts.push(`const buildDependencies = ${dependenciesJson};`);
    parts.push('const renderFunction = morph.build(template, false, buildDependencies);');
    parts.push('');

    // Export render function as default
    parts.push('');
    parts.push('// Export render function as default');
    parts.push('export default renderFunction;');

    // Export template object as named export
    parts.push('');
    parts.push('// Export template object as named export');
    parts.push('export { template };');

    // Export handshake data if present
    if (handshakeData) {
      parts.push('');
      parts.push('// Handshake data (separate export)');
      parts.push(`export const handshake = ${JSON.stringify(handshakeData)};`);
    }

    // Export processed CSS if present
    if (style) {
      const processedCss = style.processedCss || style.css;
      const scopedClasses = style.scopedClasses || {};

      parts.push('');
      parts.push('// Export processed CSS');
      parts.push(`const css = ${JSON.stringify(processedCss)};`);
      parts.push(`export { css };`);
      parts.push('');

      // Inject CSS in development mode (similar to CSS modules)
      parts.push('// Inject CSS in development');
      parts.push(`if (typeof document !== 'undefined' && css) {`);
      parts.push(`  const styleId = 'morph-css-' + ${JSON.stringify(componentName)};`);
      parts.push(`  let styleElement = document.getElementById(styleId);`);
      parts.push(`  if (!styleElement) {`);
      parts.push(`    styleElement = document.createElement('style');`);
      parts.push(`    styleElement.id = styleId;`);
      parts.push(`    document.head.appendChild(styleElement);`);
      parts.push(`  }`);
      parts.push(`  styleElement.textContent = css;`);
      parts.push(`}`);

      // Add HMR handling for CSS updates (only in non-test environments)
      if (!options.test) {
        parts.push('');
        parts.push('// HMR handling for CSS updates');
        parts.push(`if (import.meta.hot) {`);
        parts.push(`  import.meta.hot.accept(() => {`);
        parts.push(`    // Update CSS when module changes`);
        parts.push(`    if (typeof document !== 'undefined' && css) {`);
        parts.push(`      const styleId = 'morph-css-' + ${JSON.stringify(componentName)};`);
        parts.push(`      let styleElement = document.getElementById(styleId);`);
        parts.push(`      if (!styleElement) {`);
        parts.push(`        styleElement = document.createElement('style');`);
        parts.push(`        styleElement.id = styleId;`);
        parts.push(`        document.head.appendChild(styleElement);`);
        parts.push(`      }`);
        parts.push(`      styleElement.textContent = css;`);
        parts.push(`    }`);
        parts.push(`  });`);
        parts.push(`}`);
      }
    }
  } // else !isCSSOnly
  // Ensure all parts are strings and filter out any undefined values
  const safeParts = parts
    .filter((part) => part != null)
    .map((part) => String(part));
  const code = safeParts.join('\n');

  return code;
}
