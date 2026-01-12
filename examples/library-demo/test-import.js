import { Button } from './dist/library/index.mjs';

console.log('Button component imported successfully:', typeof Button);

// Test that it's a function (morph render function)
if (typeof Button === 'function') {
  console.log('✓ Button is a morph render function');
} else {
  console.log('✗ Button is not a function');
}

// Test rendering (this would normally require a DOM, but we can check the function exists)
console.log('Library test complete!');
