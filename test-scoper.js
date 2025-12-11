// Test CSS scoper directly
import { scopeCss } from './src/core/css-scoper.js';

const testCss = `
.btn {
  background: blue;
  color: white;
}

.card {
  border: 1px solid #ccc;
  padding: 1rem;
}
`;

try {
  console.log('Testing CSS scoper...');
  const result = scopeCss(testCss, 'TestComponent');
  console.log('Scoper result:', {
    classNames: result.classNames,
    scopedClasses: result.scopedClasses,
    scopedCssLength: result.scopedCss.length,
  });
  console.log('Test passed!');
} catch (err) {
  console.error('Test failed:', err);
}
