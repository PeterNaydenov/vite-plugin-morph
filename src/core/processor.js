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
  getStyleContentLocation,
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
import { scopeCss, transformHtmlClasses } from '../core/css-scoper.js';
import { processCss } from '../core/css-processor.js';
import { getCssCollector } from '../services/css-collection.js';

function generateCssInjectionCode(componentName) {
  return [
    '// Inject CSS in development',
    `if (typeof document !== 'undefined' && css) {`,
    `  const styleId = 'morph-css-' + ${JSON.stringify(componentName)};`,
    `  let styleElement = document.getElementById(styleId);`,
    `  if (!styleElement) {`,
    `    styleElement = document.createElement('style');`,
    `    styleElement.id = styleId;`,
    `    document.head.appendChild(styleElement);`,
    `  }`,
    `  styleElement.textContent = css;`,
    `}`,
  ];
}

function generateHmrHandlingCode(componentName) {
  return [
    '',
    '// HMR handling for CSS updates',
    `if (import.meta.hot) {`,
    `  import.meta.hot.accept(() => {`,
    `    // Update CSS when module changes`,
    `    if (typeof document !== 'undefined' && css) {`,
    `      const styleId = 'morph-css-' + ${JSON.stringify(componentName)};`,
    `      let styleElement = document.getElementById(styleId);`,
    `      if (!styleElement) {`,
    `        styleElement = document.createElement('style');`,
    `        styleElement.id = styleId;`,
    `        document.head.appendChild(styleElement);`,
    `      }`,
    `      styleElement.textContent = css;`,
    `    }`,
    `  });`,
    `}`,
  ];
}

/**
 * Build a `sourceMappingURL` comment that points browser DevTools back to the
 * original .morph file for a component's dev-mode CSS. Embeds sourcesContent
 * (the full raw .morph file text) directly in the map, since .morph files
 * aren't fetchable over HTTP the way a regular .css asset would be — without
 * that, DevTools would have no way to show the original source text.
 * @param {Object} map - Raw PostCSS source map (maps postcss output -> its own input)
 * @param {string} filePath - Absolute path to the .morph file
 * @param {string} rootDir - Project root, for a readable relative source name
 * @param {string} originalContent - Full raw .morph file text
 * @returns {string} A CSS sourceMappingURL comment (base64 data URI)
 */
function buildDevCssSourceMapComment(map, filePath, rootDir, originalContent) {
  const relPath = path.relative(rootDir, filePath).split(path.sep).join('/');
  const mapWithSource = {
    ...map,
    sources: [relPath],
    sourcesContent: [originalContent],
  };
  const base64 = Buffer.from(JSON.stringify(mapWithSource)).toString('base64');
  return `/*# sourceMappingURL=data:application/json;base64,${base64} */`;
}

/**
 * Wrap a component's CSS in its cascade layer (`libs` for node_modules-sourced
 * components, `modules` for local/host ones) for the self-injecting <style>
 * tag embedded in every compiled .morph module. This mirrors the layer
 * wrapping css-collection.js already applies to the bundled/production CSS
 * output — without it, this per-component injection path (which runs in
 * every environment, not just dev) bypassed the 5-layer cascade entirely,
 * so its rules always won regardless of `app`/`context` layer overrides.
 *
 * If a dev-mode sourceMappingURL comment is present, it's pulled out first
 * and re-attached after the closing brace (must stay outside the block to
 * be recognized), with its map shifted down one generated line to account
 * for the new `@layer NAME {` line inserted above the original content.
 * @param {string} css - Component CSS (possibly carrying a sourceMappingURL comment)
 * @param {string} layerName - Cascade layer name ('libs' or 'modules')
 * @returns {string} Layer-wrapped CSS
 */
function wrapCssLayerForInjection(css, layerName) {
  const commentMatch = css.match(
    /\n?\/\*# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+) \*\/\s*$/
  );

  if (!commentMatch) {
    return `@layer ${layerName} {\n${css}\n}`;
  }

  const withoutComment = css.slice(0, commentMatch.index);
  try {
    const map = JSON.parse(
      Buffer.from(commentMatch[1], 'base64').toString('utf-8')
    );
    map.mappings = ';' + map.mappings;
    const shiftedComment = `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')} */`;
    return `@layer ${layerName} {\n${withoutComment}\n}\n${shiftedComment}`;
  } catch (e) {
    // Malformed map (shouldn't happen) — drop it rather than ship a wrong one.
    return `@layer ${layerName} {\n${withoutComment}\n}`;
  }
}

function generateHelpersCode(helperFunctions, stylesMap) {
  const parts = [];
  if (!helperFunctions || Object.keys(helperFunctions).length === 0) {
    return parts;
  }

  parts.push('// Helpers');
  for (const [name, helper] of Object.entries(helperFunctions)) {
    try {
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
        console.warn(`[vite-plugin-morph] Skipping helper with invalid name: ${name}`);
        continue;
      }

      if (typeof helper === 'function') {
        try {
          let funcCode = helper.toString().replace(/\/\/.*$/gm, '').trim();
          if (funcCode.startsWith('function ')) {
            const funcName = funcCode.match(/function\s+(\w+)/)[1];
            parts.push(
              `try { ${funcCode}; template.helpers.${name} = (props = {}, ...args) => (${funcName})({ ...props, styles }, ...args); } catch(e) { console.warn('Failed to assign helper "${name}:', e.message); }`
            );
          } else {
            parts.push(
              `try { template.helpers.${name} = (props = {}, ...args) => (${funcCode})({ ...props, styles }, ...args); } catch(e) { console.warn('Failed to assign helper "${name}:', e.message); }`
            );
          }
        } catch (funcError) {
          console.warn(`[vite-plugin-morph] Cannot serialize function helper ${name}: ${funcError.message}`);
        }
      } else if (typeof helper === 'string') {
        parts.push(`template.helpers.${name} = ${JSON.stringify(helper)};`);
      }
    } catch (helperError) {
      console.warn(`[vite-plugin-morph] Error processing helper ${name}: ${helperError.message}`);
    }
  }
  return parts;
}

/**
 * Process a morph file and return compiled result
 * @param {string} content - Raw morph file content
 * @param {string} filePath - File path
 * @param {import('../../types/index.d.ts').MorphPluginOptions} options - Plugin options
 * @returns {Promise<import('../../types/index.d.ts').ProcessingResult>} Processing result
 */
export async function processMorphFile(content, filePath, options = {}) {
  const startTime = Date.now();

  try {
    // Extract template placeholders from raw content BEFORE HTML parsing
    const { extractPlaceholdersFromHTML } = await import('./template.js');
    const rawPlaceholders = extractPlaceholdersFromHTML(content);

    // Check cache first (filePath is included since componentName/source/layer
    // are derived from it — two different files with identical content and
    // options must not collide on the same cache entry)
    const cacheKey = JSON.stringify({ content, filePath, options, version: 4 });
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
    const componentName = isCSSOnly
      ? ''
      : filePath.split(/[/\\]/).pop().replace('.morph', '');

    // Root directory for relative path calculations
    const rootDir = options.rootDir || process.cwd();

    // Process CSS for scoping if present and not CSS-only
    // css.enabled is the master switch for the CSS subsystem (scoping/layers/etc.);
    // when false, raw unscoped CSS passes through untouched.
    const cssEnabled = options?.css?.enabled !== false;
    let processedStyle = style;
    let scopedClasses = {};
    let componentsCSS = {};
    if (style && !isCSSOnly && cssEnabled) {
      const isProd = isProductionMode(options) || options?.hashMode === 'production';
      const hashMode = options?.hashMode || (isProd ? 'production' : 'development');
      const generateScopedName = options?.css?.modules?.generateScopedName;
      const postcssOptions = options?.css?.postcss || {};

      // Dev-only: generate a CSS source map pointing browser DevTools back to
      // the original .morph file. Not done for build/library output — that
      // CSS is already bundled text, where per-.morph mapping matters less
      // and would just bloat shipped output.
      const devSourceMaps =
        !!options.isDevServer && !options.test && postcssOptions.sourceMaps !== false;

      // Pad the CSS with blank lines up to the <style> block's real starting
      // line in the .morph file, so PostCSS's source-map generation (which
      // tracks positions relative to whatever string it's handed) ends up
      // using real file line numbers. Scoping's class-name substitution is a
      // same-line, in-place string replace, so this padding survives it
      // intact all the way through to PostCSS.
      let cssToScope = style.css;
      if (devSourceMaps) {
        const location = getStyleContentLocation(document);
        const padLines = location ? Math.max(0, location.startLine - 1) : 0;
        cssToScope = '\n'.repeat(padLines) + style.css;
      }

      const scopedResult = scopeCss(cssToScope, componentName, {
        hashMode,
        ...(generateScopedName ? { generateScopedName } : {}),
      });

      // Run PostCSS (autoprefixer/minify/sourceMaps) after scoping, so plugins
      // see the final scoped selectors rather than the authored ones.
      let finalCss = scopedResult.scopedCss;
      try {
        const postcssResult = await processCss(finalCss, {
          autoprefixer: postcssOptions.autoprefixer,
          minify: postcssOptions.minify,
          sourceMaps: postcssOptions.sourceMaps || devSourceMaps,
          from: filePath,
        });
        finalCss = postcssResult.css;

        if (devSourceMaps && postcssResult.map) {
          finalCss +=
            '\n' +
            buildDevCssSourceMapComment(postcssResult.map, filePath, rootDir, content);
        }
      } catch (postcssError) {
        warn(`PostCSS processing failed for ${filePath}: ${postcssError.message}`);
        if (options?.css?.debug?.enabled) {
          const { getCssDebugUtils } = await import('../utils/css-debug.js');
          getCssDebugUtils().logCssError(postcssError, componentName);
        }
      }

      processedStyle = {
        css: style.css,
        processedCss: finalCss,
        scopedClasses: scopedResult.scopedClasses,
      };
      scopedClasses = scopedResult.scopedClasses;
      if (scopedResult.classContents) {
        for (const [className, info] of Object.entries(scopedResult.classContents)) {
          componentsCSS[className] =
            `.${info.scoped} { ${info.content.replace(/^\.[a-zA-Z_-]+/, '').trim()} }`;
        }
      }

      if (options?.css?.debug?.enabled) {
        const { getCssDebugUtils } = await import('../utils/css-debug.js');
        getCssDebugUtils().logCssProcessing(componentName, {
          originalLength: style.css.length,
          scopedLength: scopedResult.scopedCss.length,
          processedLength: finalCss.length,
          scopedClasses: scopedResult.scopedClasses,
        });
      }
    }

    // Transform template HTML to use scoped class names
    let transformedTemplateHtml = template.html;
    if (template.html && Object.keys(scopedClasses).length > 0) {
      const transformResult = transformHtmlClasses(template.html, scopedClasses);
      transformedTemplateHtml = transformResult.html;
      componentsCSS = { ...componentsCSS, ...transformResult.componentsCSS };
    }

    // Build helpers object
    const helpers = {};
    if (script && script.functions) {
      Object.assign(helpers, script.functions);
    }
    if (script && script.templates) {
      Object.assign(helpers, script.templates);
    }

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
      template: transformedTemplateHtml,
      helpers: Object.keys(helpers).length > 0 ? helpers : {},
      handshake: handshake?.data || {},
    };

    // Debug: log template content
    console.log('Template object:', {
      template: templateObject.template.substring(0, 100) + '...',
      helpers: Object.keys(templateObject.helpers),
      handshake: templateObject.handshake,
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
      usesCssVariables,
      filePath,
      rootDir,
      componentsCSS
    );

    const processingTime = Date.now() - startTime;
    const safeModuleCode = typeof moduleCode === 'string' ? moduleCode : '// Error: Invalid module code generated';

    const result = {
      code: safeModuleCode,
      cssExports: processedStyle?.css,
      cssSourceMap: null,
      usedVariables: template.usedVariables,
      templateObject,
      componentsCSS,
      componentName,
      processedCss: processedStyle?.processedCss,
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
 * @param {string} componentName - Component name
 * @param {boolean} usesCssVariables - Whether CSS variables are used
 * @param {string} filePath - File path for relative imports
 * @param {string} rootDir - Root directory
 * @param {Object} componentsCSS - Components CSS mapping for export
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
  usesCssVariables,
  filePath,
  rootDir,
  componentsCSS = {}
) {
  const parts = [];

  if (isCSSOnly) {
    // CSS-only files: export styles directly, no morph utilities
    parts.push('// Export CSS styles');
    parts.push(
      `const css = ${JSON.stringify(style.processedCss || style.css)};`
    );
    parts.push(`export const styles = css;`);

    // Inject CSS in development mode
    parts.push('');
    parts.push(...generateCssInjectionCode(componentName));

    // Add HMR handling for CSS updates (only in non-test environments)
    if (!options.test) {
      parts.push(...generateHmrHandlingCode(componentName));
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
      const importPath = relativePath.startsWith('.')
        ? relativePath
        : `./${relativePath}`;
      parts.push(`import '${importPath.replace(/\\/g, '/')}';`);
    }

    parts.push('');

    // Create template object
    parts.push('// Template object');
    parts.push(`const template = ${JSON.stringify(templateObject, null, 2)};`);
    parts.push('');

    // Define styles map for runtime JS access (templates use scoped class names directly)
    const stylesMap = style && style.scopedClasses ? style.scopedClasses : {};
    parts.push(
      '// Styles map (for runtime JS access, templates use scoped class names directly)'
    );
    parts.push(`const styles = ${JSON.stringify(stylesMap)};`);
    parts.push('');

    // Prepare build dependencies
    const buildDependencies =
      Object.keys(stylesMap).length > 0 ? { styles: stylesMap } : {};

    // Add helpers if present
    parts.push(...generateHelpersCode(helperFunctions, stylesMap));

    // Build render function
    parts.push('');
    parts.push('// Build render function');
    const dependenciesJson = JSON.stringify(buildDependencies);
    parts.push(`const buildDependencies = ${dependenciesJson};`);
    parts.push(
      'const renderFunction = morph.build(template, false, buildDependencies);'
    );
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
      let processedCss = style.processedCss || style.css;
      const scopedClasses = style.scopedClasses || {};

      // Only wrap when scoping/postcss actually ran (style.processedCss set) —
      // when css.enabled is false, CSS passes through untouched, layers included.
      const layersEnabled = options?.css?.layers?.enabled !== false;
      if (layersEnabled && style.processedCss) {
        const source =
          filePath && filePath.includes('node_modules') ? 'library' : 'module';
        processedCss = wrapCssLayerForInjection(
          processedCss,
          source === 'library' ? 'libs' : 'modules'
        );
      }

      parts.push('');
      parts.push('// Export processed CSS');
      parts.push(`const css = ${JSON.stringify(processedCss)};`);
      parts.push(`export { css };`);

      // Export componentsCSS mapping
      parts.push('');
      parts.push('// Components CSS mapping for library builds');
      parts.push(`const componentsCSS = ${JSON.stringify(componentsCSS)};`);
      parts.push(`export { componentsCSS };`);
      parts.push('');

      // Inject CSS in development mode (similar to CSS modules)
      parts.push(...generateCssInjectionCode(componentName));

      // Add HMR handling for CSS updates (only in non-test environments)
    }
  } // else !isCSSOnly
  // Ensure all parts are strings and filter out any undefined values
  const safeParts = parts
    .filter((part) => part != null)
    .map((part) => String(part));
  const code = safeParts.join('\n');

  return code;
}
