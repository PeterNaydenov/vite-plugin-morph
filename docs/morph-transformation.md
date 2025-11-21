# Morph File Transformation Examples

This document shows how Vite Morph Plugin transforms HTML-like `.morph` files into ES modules that work with `@peter.naydenov/morph` v3.1.5.

**Version**: 0.0.2  
**Updated**: 2025-11-19

## Current Morph Format (JavaScript)

The existing `component.morph` file is already a JavaScript module:

```javascript
const contacts = {
  template: /*template*/ `
                    {{ @all : blank, ^^, >setupData }}
                    <h2>Contacts</h2>
                    <p class="space">Storage for your relation's profiles. 
                        <button data-click="nav-contacts-edit">Create a new contact</button>
                        </p>
                    
                    <!-- TODO: some tag filtering + string search -->
                   
                    {{ contacts : [], #, [], contactCards, #, [], tags  }}
                `,
  helpers: {
    contactCards: `
                                        <div class="contact">
                                                                <h3>{{ name }}</h3>
                                                                <p><strong>ID Token</strong>: 
                                                                     <textarea readonly>{{ id-contact }}</textarea>
                                                                </p>
                                                                <p><strong>Tags</strong>: 
                                                                       {{ tags }}
                                                                </p>
                                                                
                                                                <p>
                                                                        <button class="action" data-click="nav-contacts-edit" data-number="{{number}}">Edit</button>
                                                                        <button class="action">Copy ID Token</button>
                                                                        <button class="action warn" data-click="delete-contact" data-number="{{number}}">Delete</button>
                                                                </p>
                                                        </div>
                                        `,
    tags: `<span>{{text}}</span>`,
    blank: () => '',
    setupData: function ({ data }) {
      data.contacts.map((c, i) => {
        c.number = i;
        if (c.tags.length === 0) c.tags = 'No tags selected';
        return c;
      });
      return data;
    },
  },
  handshake: {
    contacts: [
      {
        name: 'Ivan Ivanov',
        'id-contact': '3mwes!534-12-2fe-!2d1w',
        tags: ['project1', 'man', 'brazil'],
      },
      {
        name: 'Stoyan Lazov',
        'id-contact': '3mpes!534-14-4fm-!1214',
        tags: ['Paris', 'man', 'french'],
      },
    ],
  },
};

export default contacts;
```

## New HTML-like Morph Format

The plugin will support this more intuitive HTML-like syntax:

```html
<!-- contacts.morph -->
<div class="contacts">
  <h2>Contacts</h2>
  <p class="space">Storage for your relation's profiles.</p>
  <button data-click="nav-contacts-edit">Create a new contact</button>

  <!-- Display contacts list -->
  {{ contacts : [], #, [], contactCards, #, [], tags }}
</div>

<script>
  function contactCards(contact) {
    return `
    <div class="contact">
      <h3>${contact.name}</h3>
      <p><strong>ID Token</strong>: 
        <textarea readonly>${contact['id-contact']}</textarea>
      </p>
      <p><strong>Tags</strong>: 
        ${contact.tags}
      </p>
      <p>
        <button class="action" data-click="nav-contacts-edit" data-number="${contact.number}">Edit</button>
        <button class="action">Copy ID Token</button>
        <button class="action warn" data-click="delete-contact" data-number="${contact.number}">Delete</button>
      </p>
    </div>
  `;
  }

  function tags(text) {
    return `<span>${text}</span>`;
  }

  function blank() {
    return '';
  }

  function setupData({ data }) {
    return data.contacts.map((c, i) => {
      c.number = i;
      if (c.tags.length === 0) c.tags = 'No tags selected';
      return c;
    });
  }
</script>

<style>
  .contacts {
    background: var(--bg-color, #f5f5f5);
    padding: 1rem;
    border-radius: 8px;
  }

  .contact {
    border: 1px solid var(--border-color, #ddd);
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 4px;
  }

  .contact h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color, #333);
  }

  .contact p {
    margin: 0.5rem 0;
  }

  .action {
    background: var(--primary-color, #007bff);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 0.5rem;
  }

  .action:hover {
    background: var(--primary-hover, #0056b3);
  }

  .action.warn {
    background: var(--danger-color, #dc3545);
  }

  .action.warn:hover {
    background: var(--danger-hover, #c82333);
  }
</style>

<script type="application/json">
  {
    "contacts": [
      {
        "name": "Ivan Ivanov",
        "id-contact": "3mwes!534-12-2fe-!2d1w",
        "tags": ["project1", "man", "brazil"]
      },
      {
        "name": "Stoyan Lazov",
        "id-contact": "3mpes!534-14-4fm-!1214",
        "tags": ["Paris", "man", "french"]
      }
    ]
  }
</script>
```

## Plugin Transformation Process

### Step 1: Parse HTML Structure

The plugin uses `parse5` to extract content from different sections:

- **Template**: Everything except `<script>` and `<style>` tags
- **JavaScript Helpers**: Content from `<script>` tags (not `type="application/json"`)
- **CSS Styles**: Content from `<style>` tags
- **Handshake Data**: JSON from `<script type="application/json">` tags

### Step 2: Convert to Morph Object

Transform the parsed content into the format `@peter.naydenov/morph` expects:

```javascript
{
  template: `extracted HTML template with {{ }} placeholders`,
  helpers: {
    // Extracted JavaScript functions
    contactCards: function(contact) { ... },
    tags: function(text) { ... },
    blank: function() { ... },
    setupData: function({ data }) { ... }
  },
  handshake: {
    // Extracted JSON data
    contacts: [...]
  }
}
```

### Step 3: Compile with @peter.naydenov/morph

Use `morph.build()` to create the render function:

```javascript
const renderFunction = morph.build(morphObject);
```

### Step 4: Export as ES Module

Generate the final ES module:

```javascript
import { morph } from '@peter.naydenov/morph';

const morphObject = {
  /* converted content */
};
const renderFunction = morph.build(morphObject);

export default renderFunction;

// Also export CSS module exports if present
export const styles = {
  contacts: 'contacts_a1b2c3',
  contact: 'contact_d4e5f6',
  action: 'action_f7g8h9',
};
```

## Benefits of HTML-like Syntax

1. **More Intuitive**: Developers familiar with HTML/CSS/JS structure
2. **Better Tooling Support**: Syntax highlighting, linting, formatting
3. **Separation of Concerns**: Clear separation between template, logic, and styles
4. **CSS Module Support**: Automatic scoping and variable resolution
5. **Hot Module Replacement**: Better development experience

## Migration Path

## CSS-Only Morph Files

For global styles and design systems, the plugin supports CSS-only morph files:

```html
<!-- global-styles.morph -->
<style>
  :root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
  }

  .btn {
    background: var(--primary-color);
    color: white;
    padding: 0.5rem 1rem;
  }
</style>
```

**Transformation Result:**

```javascript
// CSS-only module - no component function
export const styles = {
  '.btn': {
    /* CSS properties */
  },
  ':root': {
    /* CSS variables */
  },
};
```

**Key Differences:**

- **CSS-only files**: Export `export const styles`, preserve class names (global)
- **Component files**: Export `export default function`, scoped CSS classes

## Migration Path

Existing JavaScript `.morph` files will continue to work. The plugin will:

1. **Detect file type**: Check if content starts with `const`/`let`/`var` (JavaScript) vs `<` (HTML)
2. **Handle accordingly**:
   - JavaScript files: Pass through to morph.build() directly
   - HTML files: Parse and convert using the new pipeline
   - CSS-only files: Extract styles only, no template processing

This ensures backward compatibility while enabling the new HTML-like syntax.
