# Library Consumer

Example application that consumes the `@example/ui-components` library.

## Setup

1. **Build the library first**:
```bash
cd ../library-demo
npm install
npm run build:lib
```

2. **Pack the library**:
```bash
cd dist/library
npm pack
# Creates example-ui-components-1.0.0.tgz
```

3. **Install in consumer**:
```bash
cd ../../library-consumer
npm install
npm install ../library-demo/dist/library/example-ui-components-1.0.0.tgz
```

4. **Run consumer**:
```bash
npm run dev
```

## Features Demonstrated

- Importing components from the library
- Using `applyStyles()` to load CSS
- Using `themesControl` to switch themes
- Component rendering with different variants
