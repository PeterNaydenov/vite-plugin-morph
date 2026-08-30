import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'ViteMorphPlugin',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        '@peter.naydenov/morph',
        'acorn',
        'acorn-walk',
        'parse5',
        'vite',
        'crypto',
        'fs',
        'path',
        'url',
        'os',
        'fs/promises',
        'node:events',
        'node:stream',
        'node:string_decoder',
        'node:url',
        'node:path',
        'node:fs',
        'node:fs/promises',
        'stream',
        'string_decoder',
        'events',
      ],
      output: {
        // Entry `src/index.js` mixes a default export (`morphPlugin`) with
        // named exports (`morph`, `buildLibrary`). Pin the export shape to
        // `named` so CJS consumers always go through `.default` for the
        // function — explicit and lint-clean, no behavior change vs `auto`.
        exports: 'named',
      },
      // Silences `EMPTY_IMPORT_META` from the dual-publish dance in
      // `library-builder.js` (it branches on `typeof __dirname` before
      // touching `import.meta.*`, so the runtime is correct — the bundler
      // just can't prove that statically). Safe to filter everywhere; the
      // same warning fires from `node_modules/cssnano` in v9 and the same
      // logic applies (the access is guarded by build-time conditions we
      // can't see from source).
      onwarn(warning, warn) {
        if (warning.code === 'EMPTY_IMPORT_META') return;
        warn(warning);
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node18',
  },
});
