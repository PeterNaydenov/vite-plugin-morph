#!/usr/bin/env node
/**
 * Compile a .morph file with the installed vite-plugin-morph, render it and
 * report problems an agent cannot see by reading the source.
 *
 * Usage:
 *   node check-morph.mjs <file.morph> [--data <file.json>]
 *
 * Renders with --data if given, otherwise with the file's handshake.
 * Exit code: 0 = no errors (warnings allowed), 1 = errors found, 2 = could not run.
 */

/* eslint-disable no-console -- CLI output */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const PLUGIN = '@peter.naydenov/vite-plugin-morph';
// Breaks out of attributes and text alike; escaped output never contains "<img"
const HOSTILE = '"><img src=x onerror=alert(1)>';

/**
 * Locate the plugin's package directory: the package this script ships in,
 * else the nearest node_modules copy above the working directory.
 * @returns {string|null}
 */
function findPluginDir() {
  const shipped = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const candidates = [shipped];
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    candidates.push(path.join(dir, 'node_modules', PLUGIN));
    if (dir === path.dirname(dir)) break;
  }
  return (
    candidates.find((dir) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name === PLUGIN;
      } catch {
        return false;
      }
    }) || null
  );
}

/**
 * Collect the paths of all string values in a data object
 * @param {*} value - Data to walk
 * @param {Array<string|number>} [trail=[]] - Path so far
 * @returns {Array<Array<string|number>>}
 */
function stringPaths(value, trail = []) {
  if (typeof value === 'string') return [trail];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      stringPaths(child, [...trail, Array.isArray(value) ? Number(key) : key])
    );
  }
  return [];
}

function withValue(data, trail, replacement) {
  const copy = JSON.parse(JSON.stringify(data)); // render data is JSON-shaped
  let target = copy;
  trail.slice(0, -1).forEach((key) => (target = target[key]));
  target[trail[trail.length - 1]] = replacement;
  return copy;
}

const formatPath = (trail) =>
  trail.map((key) => (typeof key === 'number' ? `[${key}]` : `.${key}`)).join('').slice(1) ||
  '(root)';

/**
 * Check one .morph file
 * @param {string} file - Path to the .morph file
 * @param {{ data?: Object }} [options] - Render data (defaults to the handshake)
 * @returns {Promise<{ errors: string[], warnings: string[], html: string|null }>}
 */
export async function checkMorph(file, options = {}) {
  const errors = [];
  const warnings = [];
  const source = fs.readFileSync(file, 'utf8');

  const pluginDir = findPluginDir();
  if (!pluginDir) {
    throw new Error(`${PLUGIN} is not installed (searched from ${process.cwd()})`);
  }
  const { processMorphFile } = await import(
    pathToFileURL(path.join(pluginDir, 'src/core/processor.js')).href
  );
  const { configure } = await import(
    pathToFileURL(path.join(pluginDir, 'src/utils/logger.js')).href
  );
  const pluginRequire = createRequire(path.join(pluginDir, 'package.json'));
  const morphDir = path.dirname(pluginRequire.resolve('@peter.naydenov/morph/package.json'));
  const morphUrl = pathToFileURL(path.join(morphDir, 'src/main.js')).href;

  // Static checks on the source
  const script = (source.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || '';
  const markup = source
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
  if (/^\s*(import|export)\s/m.test(script)) {
    errors.push('<script> contains import/export - helpers must be self-contained declarations');
  }
  for (const [, attr] of markup.matchAll(/class="([^"]*)"/g)) {
    for (const [holder, body] of attr.matchAll(/\{\{([^}]*)\}\}/g)) {
      if (!body.includes(':')) {
        warnings.push(
          `${holder} inside class="..." is not scoped - return styles[name] from a helper instead`
        );
      }
    }
  }
  const style = (source.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  if (style.trim()) {
    let root = null;
    try {
      root = pluginRequire('postcss').parse(style);
    } catch {
      // Syntax errors are reported by the compile step below
    }
    root?.walkAtRules('layer', () => {
      warnings.push('@layer in a component <style> nests under @layer modules - remove it');
    });
    root?.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
      if (rule.parent?.type === 'rule') return; // nested: '&...' or relative to a class
      for (const selector of rule.selectors) {
        if (!/^\.|^:root\b|^:global\(/.test(selector.trim())) {
          warnings.push(`Selector '${selector.trim()}' is not scoped (applies globally) - start it with a class`);
        }
      }
    });
    for (const [, name] of style.matchAll(/\.([A-Za-z_-][\w-]*)/g)) {
      if (/^.+_.+_[a-z0-9]{1,5}$/.test(name)) {
        warnings.push(`Class '.${name}' looks already scoped and won't be scoped - use hyphens`);
      }
    }
  }
  if (/\{\{[^}]*:[^}]*\braw\b[^}]*\}\}/.test(source)) {
    errors.push("'raw' is not available in .morph files (the template has no escape option)");
  }

  // Compile, capturing plugin and compiled-module output. A CSS failure is
  // only logged by the plugin (the build ships the raw CSS), so it counts
  // as an error here.
  configure({ level: 'warn' });
  const consoleWarn = console.warn;
  const consoleError = console.error;
  const capture = (...args) => {
    const message = args.join(' ').replace(/^\[[^\]]+\] \[\w+\] /, '');
    (/CSS processing failed|PostCSS processing failed/.test(message) ? errors : warnings).push(
      message
    );
  };
  console.warn = capture;
  console.error = capture;
  let module;
  try {
    const result = await processMorphFile(source, path.resolve(file), { test: true });
    if (result.errors) {
      errors.push(`Compile error: ${result.errors[0].message}`);
      return { errors, warnings, html: null };
    }
    const code = result.code.replace("from '@peter.naydenov/morph'", `from '${morphUrl}'`);
    const outFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'check-morph-')),
      'component.mjs'
    );
    fs.writeFileSync(outFile, code);
    module = await import(pathToFileURL(outFile).href);
  } finally {
    console.warn = consoleWarn;
    console.error = consoleError;
  }

  // Top-level declarations only, the way the plugin reads them
  let declared = [];
  try {
    const { body } = pluginRequire('acorn').parse(script, {
      ecmaVersion: 2022,
      sourceType: 'module',
    });
    declared = body.flatMap((node) =>
      node.type === 'FunctionDeclaration'
        ? [node.id.name]
        : node.type === 'VariableDeclaration'
          ? node.declarations.filter((d) => d.id.type === 'Identifier').map((d) => d.id.name)
          : []
    );
  } catch (error) {
    errors.push(`<script> is not valid JavaScript: ${error.message}`);
  }
  for (const name of declared) {
    if (!(name in module.template.helpers)) {
      errors.push(`Helper '${name}' was dropped during compilation (check the warnings above)`);
    }
  }

  // Render
  const data = options.data ?? module.handshake;
  if (data === undefined) {
    warnings.push('No --data and no handshake: rendered with {}');
  }
  const renderData = data ?? {};
  const render = (input) => module.default('render', input);
  let html;
  try {
    html = render(renderData);
  } catch (error) {
    const hint =
      error instanceof ReferenceError
        ? " - helpers can't call other helpers or outside code directly; use useHelper('name', value)"
        : error instanceof TypeError
          ? " - a helper's `data` is the placeholder's value, not the whole data object"
          : '';
    errors.push(`Render threw: ${error.message}${hint}`);
    return { errors, warnings, html: null };
  }

  if (/^Error: /.test(html) || html.includes('( Error:')) {
    errors.push(`Render reported an error: ${(html.match(/\(?\s*Error:[^)\n]*\)?/) || [html])[0]}`);
  }
  for (const [holder] of html.matchAll(/\{\{[^}]*\}\}/g)) {
    errors.push(
      `Unrendered placeholder ${holder}: missing/null data, or an action inside a string helper`
    );
  }

  // Escaping: make each string value hostile in turn
  for (const trail of stringPaths(renderData)) {
    let output;
    try {
      output = render(withValue(renderData, trail, HOSTILE));
    } catch {
      continue;
    }
    if (/<img src=x/i.test(output)) {
      errors.push(`Value at '${formatPath(trail)}' reaches the HTML unescaped`);
    }
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], html };
}

async function main(argv) {
  const args = argv.slice(2);
  const dataIndex = args.indexOf('--data');
  const dataFile = dataIndex === -1 ? null : args[dataIndex + 1];
  const file = args.find(
    (arg, i) => !arg.startsWith('--') && (dataIndex === -1 || i !== dataIndex + 1)
  );
  if (!file || (dataIndex !== -1 && !dataFile)) {
    console.error('Usage: node check-morph.mjs <file.morph> [--data <file.json>]');
    return 2;
  }

  let report;
  try {
    const data = dataFile ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : undefined;
    report = await checkMorph(file, { data });
  } catch (error) {
    console.error(`check-morph: ${error.message}`);
    return 2;
  }

  report.warnings.forEach((message) => console.log(`WARN  ${message}`));
  report.errors.forEach((message) => console.log(`ERROR ${message}`));
  if (report.html !== null) console.log(`\nRendered:\n${report.html}`);
  console.log(
    `\n${report.errors.length} error(s), ${report.warnings.length} warning(s) - ${path.basename(file)}`
  );
  return report.errors.length ? 1 : 0;
}

// Compare real paths: the skill is often reached through a symlink
// (.claude/skills/… → node_modules/…), while import.meta.url is resolved
const isMain = (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (isMain) {
  main(process.argv).then((code) => process.exit(code));
}
