import { processMorphFile } from './src/core/processor.js';

const content = `{{ : blank }}

<script>
const blank = ''
function testFunc() { return 'test'; }
</script>

<script type="application/json">{
// Test JSON with comments
  "data": "test",
  'single': "quotes"
}
</script>`;

processMorphFile(content, 'final-test.morph', {})
  .then((result) => {
    console.log('✅ Final test successful!');
    console.log('Functions:', Object.keys(result.templateObject.helpers));
  })
  .catch((err) => {
    console.error('❌ Final test failed:', err.message);
  });
