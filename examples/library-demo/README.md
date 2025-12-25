# Library Demo

Example component library built with `vite-plugin-morph`.

## Components

- **Button** - Button with variants (primary, secondary, outline)
- **Card** - Card with variants (default, elevated, outlined)

## Themes

- **default** - Light theme
- **dark** - Dark theme

## Build Library

```bash
npm install
npm run build:lib
```

Output: `dist/library/`

## Test Locally

```bash
cd dist/library
npm pack
# Creates example-ui-components-1.0.0.tgz
```

Install in another project:

```bash
npm install /path/to/example-ui-components-1.0.0.tgz
```
