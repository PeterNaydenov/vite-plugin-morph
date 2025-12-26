import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        window: 'readonly',
        document: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      // Formatting rules - allow custom spacing/indentation
      indent: 'off',
      'no-trailing-spaces': 'off',
      'no-multiple-empty-lines': 'off',
      'eol-last': 'off',
      'space-before-function-paren': 'off',
      'space-in-parens': 'off',
      'space-infix-ops': 'off',
      'space-unary-ops': 'off',
      'spaced-comment': 'off',
      'comma-spacing': 'off',
      'comma-dangle': 'off',
      'object-curly-spacing': 'off',
      'array-bracket-spacing': 'off',
      'key-spacing': 'off',
      'brace-style': 'off',
      quotes: 'off',
      'quote-props': 'off',
      // Semicolon rules - allow custom usage (no enforcement)
      semi: 'off',
      'semi-spacing': 'off',
      'no-extra-semi': 'off',
    },
  },
];
