// Test CSS collection
import { createMorphPlugin } from './src/plugin/index.js';
import {
  startCssCollection,
  finalizeCssCollection,
  getCssCollector,
} from './src/services/css-collection.js';

async function testCssCollection() {
  console.log('Testing CSS collection...');

  // Start CSS collection
  startCssCollection({ outputDir: 'dist/test-components' });

  // Create plugin
  const plugin = createMorphPlugin();

  // Simulate processing a morph file with CSS
  const testContent = `
<style>
.test-btn {
  background: blue;
  color: white;
}
</style>
<div>Test</div>
`;

  // Process the file
  const result = await plugin.transform(testContent, 'TestComponent.morph');
  console.log('Processing result:', result?.code ? 'Success' : 'Failed');

  // Finalize collection
  await finalizeCssCollection();

  // Check what was collected
  const collector = getCssCollector();
  console.log('Collected components:', collector.getCollectedComponents());

  console.log('CSS collection test completed');
}

testCssCollection().catch(console.error);
