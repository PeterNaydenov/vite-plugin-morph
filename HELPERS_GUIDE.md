# Helpers - Quick Guide

## 🎯 What Are Helpers?

Helpers are **reusable templates** that you can apply to data arrays in your morph files. They help you separate presentation logic from your main HTML structure.

There are two types of helpers:

- **Helper functions** - `function helper() {}`
- **Helper templates** - `const helper = \`html\``

## 📖 Syntax

```html
{{ data : ActionName }}
```

- **`data`** - The data to apply the helper
- **`:`** - The "apply helper" operator
- **`ActionName`** - Action - the name of the helper to use

## 🚀 Quick Examples

### Helper Functions

```javascript
// Script section - define helper function
function formatName ( name ) {
      return name.toUpperCase();
  }
```

```html
<!-- Template section - use helper function -->
<h1>{{ formatName(name) }}</h1>
```

### Helper Templates

```javascript
// Script section - define helper template
const listItem = `<li>{{name}}</li>`;
```

```html
<!-- Template section - use helper template -->
<ul>
  {{ projects : listItem }}
</ul>
```



## 🔧 Why Use Helpers?

1. **Separation of Concerns** - Keep HTML structure separate from data formatting
2. **Reusability** - Use the same helper with different data
3. **Maintainability** - Update helper in one place, affects all usages
4. **Readability** - Complex iteration logic moved to helper templates

## 📚 Data Structure

Helpers work with any array data from your JSON handshake:

```json
{
  "projects": [
    { "id": "1", "name": "Project A" },
    { "id": "2", "name": "Project B" }
  ],
  "users": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ]
}
```



## 🎨 Best Practices

1. **Descriptive Names** - Use clear helper names like `userCard`, `listItem`
2. **Consistent Structure** - Follow similar patterns across helpers
3. **Comments** - Add clarifying comments when needed
4. **Validation** - Test helpers with different data scenarios