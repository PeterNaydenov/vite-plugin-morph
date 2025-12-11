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
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node18',
  },
});
