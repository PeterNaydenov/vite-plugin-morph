---
description: Add helper template support to morph specification
handoffs:
  - label: Update Specification
    agent: manual
    prompt: Create a plan for updating the 001-morph-plugin specification to include helper template support
    send: true
---

## User Input

```text
I forgot to mention that helpers could be also templates. We miss this point in the spec. Helpers are always in script. Function are declared as a function. If we have a template, set them as 'const'. If <script> tag contains 'const' we expect a string (template) so should be converted to helper. Example <script> const span = `<span>{{text}}</span>`</script>   will be converted to helpers : { span : `<span>{{text}}</span>`}. It's a valid helper declaration in @peter.naydenov/morph standard at the moment. Let's add it to spec and other documentation files. Then insert it as a task. We will need a test also for it.
```

## Feature Summary

Add support for helper templates in morph file processing to align with @peter.naydenov/morph standard, where helpers can be declared as template strings using `const` declarations in script tags.

## User Scenarios & Testing

### Scenario 1: Helper Template Declaration

**Given**: A morph file contains a script tag with `const` declarations containing template strings
**When**: The morph plugin processes the file
**Then**: The `const` template declarations should be converted to helper objects and made available to the render function
**Testing**: Verify that template helpers are properly extracted and accessible in the compiled morph function

### Scenario 2: Mixed Function and Template Helpers

**Given**: A morph file contains both function declarations and `const` template declarations
**When**: The morph plugin processes the file
**Then**: Both types of helpers should be properly extracted and included in the helpers object
**Testing**: Verify that functions and templates coexist correctly in the helpers collection

### Scenario 3: Template Helper with Placeholders

**Given**: A template helper contains morph placeholders like `{{variable}}`
**When**: The morph plugin processes the file
**Then**: The template should be preserved as-is and available for use in other templates
**Testing**: Verify that template placeholders in helper templates are not prematurely processed

## Functional Requirements

### FR-001: Template Helper Detection

- The system SHALL detect `const` declarations within script tags that contain template strings
- The system SHALL differentiate between function declarations and template declarations
- The system SHALL validate that template strings are properly formatted JavaScript template literals

### FR-002: Template Helper Processing

- The system SHALL convert `const` template declarations to helper objects
- The system SHALL preserve template content exactly as declared (including placeholders)
- The system SHALL make template helpers available to the render function alongside function helpers

### FR-003: Helper Object Structure

- The system SHALL create a unified helpers object containing both function and template helpers
- The system SHALL maintain the original helper names as object keys
- The system SHALL ensure template helpers are accessible via the standard helper interface

### FR-004: Integration with Morph Standard

- The system SHALL ensure template helpers comply with @peter.naydenov/morph helper standards
- The system SHALL validate that template helpers can be used in other template contexts
- The system SHALL support nested template helper usage

### FR-005: Error Handling

- The system SHALL provide clear error messages for invalid template syntax
- The system SHALL handle malformed template declarations gracefully
- The system SHALL validate template helper names for uniqueness

## Success Criteria

### SC-001: Template Helper Support

- 100% of valid template helper declarations are correctly processed and converted to helper objects
- Template helpers are accessible in render functions with the same interface as function helpers
- No performance degradation when processing files with mixed function and template helpers

### SC-002: Standard Compliance

- All template helper implementations comply with @peter.naydenov/morph specification requirements
- Existing morph files with template helpers continue to work without modification
- Template helper processing does not break existing function helper functionality

### SC-003: Developer Experience

- Developers can use both function and template helpers interchangeably
- Clear documentation exists explaining template helper syntax and usage
- Test coverage includes template helper scenarios

## Key Entities

### Helper Template

- **Definition**: Template string declared with `const` in script tags
- **Structure**: `const helperName = \`template content\``
- **Examples**:
  - `const span = \`<span class="highlight">{{text}}</span>\``
  - `const button = \`<button>{{label}}</button>\``
  - `const card = \`<div class="card">{{title}}{{content}}</div>\``

### Helper Object

- **Definition**: Unified collection of both function and template helpers
- **Structure**: `{ functionName: function, templateName: 'template content' }`
- **Access**: Available in render function via standard helper interface

### Morph File

- **Definition**: File containing HTML template, CSS styles, JavaScript helpers, and optional handshake
- **Processing**: Complete parsing and compilation of all helper types

## Assumptions

- Template helpers use JavaScript template literal syntax (backticks)
- Template helpers may contain morph placeholders that should be preserved
- Function and template helpers can coexist in the same script tag
- Template helpers are primarily for reusable UI components or template fragments
- Existing morph processing pipeline can be extended without major architectural changes

## Dependencies

- Existing @peter.naydenov/morph library supports template helper processing
- Current morph file parser can extract script content for analysis
- Helper processing system can be extended to handle template declarations
- Test framework supports validation of template helper functionality
