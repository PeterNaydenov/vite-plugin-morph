import { buildLibrary } from '../../../src/build-library.js';

await buildLibrary({
  entry: 'src/main.js',
  library: {
    name: '@example/ui-components',
    version: '1.0.0',
    description: 'Example UI component library built with vite-plugin-morph',
    author: 'Example Team',
    license: 'MIT',
  },
});

console.log('✓ Library build complete!');
console.log('  Output: dist/library');
console.log('  To test: cd dist/library && npm pack');
