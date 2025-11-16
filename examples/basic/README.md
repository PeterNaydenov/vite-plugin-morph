# Morph File Examples

This directory contains example `.morph` files demonstrating the new HTML-like syntax that the Vite Morph Plugin will convert to the existing morph template object format.

## Files

### `button.morph`
Basic button component with:
- HTML template with placeholders
- JavaScript helper functions
- CSS with global variables
- JSON handshake data

### `user-card.morph`
User profile card component with:
- Complex HTML structure
- Multiple helper functions
- CSS modules with scoping
- Size variants
- Global variable usage

### `global-styles.morph`
CSS-only morph file demonstrating:
- Global CSS variable definitions
- Utility classes
- No template or script sections

## Usage

These examples show how to write `.morph` files using the new HTML-like syntax while maintaining compatibility with the existing `@peter.naydenov/morph` ecosystem.

## Transformation

The plugin will transform these HTML-like files into JavaScript modules that export morph template objects, which can then be compiled using `@peter.naydenov/morph.build()`.

## Development

1. Copy these examples to your project
2. Import them in your application
3. The Vite plugin will automatically process them
4. Use the exported functions to render templates

```javascript
import Button from './button.morph';
import UserCard from './user-card.morph';

// Render components
const buttonHTML = Button({ text: 'Click me', variant: 'primary' });
const cardHTML = UserCard({ name: 'John', email: 'john@example.com' });
```