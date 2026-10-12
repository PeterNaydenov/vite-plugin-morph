/**
 * Library Mode Tests
 * @fileoverview Runs a real buildLibrary() on a throwaway project, loads the
 * built client.mjs/runtime.js with a mock DOM, and runs a real host build with
 * that library installed in node_modules.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import { build } from 'vite';
import { buildLibrary } from '../../src/build-library.js';
import { createLibraryBuilder } from '../../src/services/library-builder.js';
import { createMorphPlugin } from '../../src/plugin/index.js';
import { configure } from '../../src/utils/logger.js';

const USER_ENTRY = '// The demo app entry, hand-written\nconsole.log("demo");\n';

let workDir;
let libRoot;
let distDir;

function writeFiles(root, files) {
  for (const [file, content] of Object.entries(files)) {
    const filePath = path.join(root, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
}

/** Minimal DOM: just enough for runtime.js and client.mjs */
function installMockDom() {
  const styles = new Map();
  globalThis.window = globalThis;
  globalThis.document = {
    getElementById: (id) => styles.get(id) || null,
    createElement: (tag) => ({ tagName: tag.toUpperCase(), id: '', textContent: '' }),
    head: {
      appendChild: (el) => {
        if (el.id) styles.set(el.id, el);
      },
      removeChild: () => {},
    },
  };
  for (const key of ['__MORPH_THEME_REGISTRY__', '__MORPH_THEMES__', '__MORPH_COMPONENTS_CSS__']) {
    delete globalThis[key];
  }
  return styles;
}

beforeAll(async () => {
  configure({ level: 'error' });
  workDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'morph-library-mode-')));
  libRoot = path.join(workDir, 'lib');
  distDir = path.join(libRoot, 'dist/library');

  writeFiles(libRoot, {
    'src/main.js': USER_ENTRY,
    'src/components/Button.morph': `<button class="btn">{{ label }}</button>
<style>
.btn { color: var(--btn-color); }
</style>`,
    'src/themes/light.css': ':root { --btn-color: black; }\n',
    'src/themes/dark.css': ':root { --btn-color: white; }\n',
    'src/styles/main.css': 'body { margin: 0; }\n',
  });

  await buildLibrary({
    library: { name: '@acme/ui', version: '1.0.0' },
    rootDir: libRoot,
  });
}, 60000);

afterAll(() => {
  configure({ level: 'info' });
  fs.rmSync(workDir, { recursive: true, force: true });
});

describe('buildLibrary() entry', () => {
  it('leaves src/main.js untouched and still builds every component', () => {
    expect(fs.readFileSync(path.join(libRoot, 'src/main.js'), 'utf-8')).toBe(USER_ENTRY);

    const indexMjs = fs.readFileSync(path.join(distDir, 'index.mjs'), 'utf-8');
    expect(indexMjs).toMatch(/export\s*\{[^}]*Button/);
  });

  it('refuses to overwrite an explicit entry it did not generate', async () => {
    const builder = createLibraryBuilder({
      entry: 'src/main.js',
      rootDir: libRoot,
      outputDir: path.join(workDir, 'unused-out'),
      library: { name: '@acme/ui' },
    });

    await expect(builder.build()).rejects.toThrow(/refuses to overwrite/);
    expect(fs.readFileSync(path.join(libRoot, 'src/main.js'), 'utf-8')).toBe(USER_ENTRY);
  });
});

describe('buildLibrary() package.json', () => {
  it('declares "type": "module" and points require at the .cjs build', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(distDir, 'package.json'), 'utf-8'));

    expect(pkg.type).toBe('module');
    expect(pkg.main).toBe('./index.cjs');
    expect(pkg.exports['.'].require).toBe('./index.cjs');
    expect(fs.existsSync(path.join(distDir, 'index.cjs'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'index.js'))).toBe(false);
  });

  it('Node loads the shipped runtime.js without MODULE_TYPELESS_PACKAGE_JSON', () => {
    const runtimeUrl = pathToFileURL(path.join(distDir, 'runtime.js')).href;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `await import(${JSON.stringify(runtimeUrl)});`],
      { encoding: 'utf-8' }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('MODULE_TYPELESS_PACKAGE_JSON');
  });
});

describe('built library runtime', () => {
  let styles;
  let client;
  let runtime;

  beforeAll(async () => {
    // client.mjs imports its CSS as `?url` (resolved by the host's bundler);
    // those bindings are unused, so drop them to load it directly.
    const clientSource = fs.readFileSync(path.join(distDir, 'client.mjs'), 'utf-8');
    const loadable = clientSource.replace(/^import \w+ from '[^']+\?url';$/gm, '');
    fs.writeFileSync(path.join(distDir, 'client.test-load.mjs'), loadable);

    // No theme registry on window before the library's runtime loads
    styles = installMockDom();
    vi.resetModules();
    client = await import(path.join(distDir, 'client.test-load.mjs'));
    runtime = await import(path.join(distDir, 'runtime.js'));
  });

  it("themesControl sees the library's themes registered after runtime.js loaded", () => {
    expect(runtime.themesControl.list().sort()).toEqual(['dark', 'light']);
    expect(runtime.themesControl.set('dark')).toBe(1);
    expect(styles.get('morph-theme-acme-ui').textContent).toContain('--btn-color: white');
  });

  it('root applyStyles() keeps component CSS in @layer modules', () => {
    // Stand-in for the <style> the compiled component self-injects
    styles.get('morph-css-Button').textContent = '@layer modules {\n.stale {}\n}';

    runtime.applyStyles();

    const css = styles.get('morph-css-Button').textContent;
    expect(css).toMatch(/^@layer modules \{/);
    expect(css).toMatch(/\.Button_btn_\w+/);
  });

  it("client.mjs's applyStyles() keeps the layer too", () => {
    client.applyStyles();

    expect(styles.get('morph-css-Button').textContent).toMatch(/^@layer modules \{/);
  });
});

describe('host build with a morph library in node_modules', () => {
  it('emits the processed library CSS as a bundle asset', async () => {
    const hostRoot = path.join(workDir, 'host');
    writeFiles(hostRoot, { 'src/app.js': 'console.log("host");\n' });
    fs.cpSync(distDir, path.join(hostRoot, 'node_modules/@acme/ui'), { recursive: true });

    const warnings = [];
    const customLogger = {
      info() {},
      warn: (msg) => warnings.push(msg),
      warnOnce: (msg) => warnings.push(msg),
      error: (msg) => warnings.push(msg),
      clearScreen() {},
      hasErrorLogged: () => false,
      hasWarned: false,
    };

    await build({
      root: hostRoot,
      configFile: false,
      customLogger,
      plugins: [createMorphPlugin()],
      build: {
        outDir: 'dist',
        rollupOptions: { input: path.join(hostRoot, 'src/app.js') },
      },
    });

    const assetPath = path.join(hostRoot, 'dist/assets/morph--acme-ui.css');
    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.readFileSync(assetPath, 'utf-8')).toContain('margin');
    expect(warnings.join('\n')).not.toMatch(/assigns to bundle/);
  }, 60000);
});
