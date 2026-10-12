/**
 * Compile a .morph source through the real processor and import the result
 * @fileoverview Lets tests render compiled components instead of only
 * string-matching the generated code.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { processMorphFile } from '../../src/core/processor.js';

const require = createRequire(import.meta.url);
const morphPackageDir = path.dirname(
  require.resolve('@peter.naydenov/morph/package.json')
);
const morphUrl = pathToFileURL(path.join(morphPackageDir, 'src/main.js')).href;
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-compile-'));
let counter = 0;

/**
 * @param {string} source - .morph file content
 * @param {string} [name='Component'] - Component name (becomes the file name)
 * @param {Object} [options={}] - processMorphFile options
 * @returns {Promise<{ module: Object, code: string, result: Object }>}
 */
export async function compileMorph(source, name = 'Component', options = {}) {
  const result = await processMorphFile(source, `/virtual/${name}.morph`, {
    test: true,
    ...options,
  });
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  const code = result.code.replace(
    "from '@peter.naydenov/morph'",
    `from '${morphUrl}'`
  );
  const file = path.join(outDir, `${name}-${counter++}.mjs`);
  fs.writeFileSync(file, code);

  return { module: await import(pathToFileURL(file).href), code: result.code, result };
}
