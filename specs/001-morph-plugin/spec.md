# Feature Specification: Vite Morph Plugin

**Feature Branch**: `001-morph-plugin`  
**Created**: 2025-11-16  
**Status**: Draft  
**Input**: User description: "I'm building a plugin for vite that should get a file with extension 'morph' and convert it to '@peter.naydenov/morph' template, compile it to function and convert a result function to reusable es module. Files with extension 'morph' are very simular to 'svelte' structure - template is like html but with placeholders, helper functions are in a <script> tag, css can come as <style>, handshake should be inside <script type='application/json'> tags. Handshake is not required, but if is there - should be represented as type='application/json'. Plugin should be used as a building app tool and during npm run dev. If instruction includes --production, should remove the handshake information with the idea of minimum filesize. During development handshake should stay inside. It's could be helpfull for developers as a reference, what is expected data structure. If there <style> part, should work like svelte modules. Should be no brainer to use it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Morph File Processing (Priority: P1)

As a developer, I want to create .morph files with HTML-like templates and have them automatically compiled into reusable ES modules during development and build processes.

**Why this priority**: This is the core functionality that enables the entire plugin to work - without basic morph file processing, no other features can function.

**Independent Test**: Can be fully tested by creating a simple .morph file with template content and verifying it compiles to a working ES module that exports a function.

**Acceptance Scenarios**:

1. **Given** a .morph file with HTML template containing placeholders, **When** the Vite dev server runs, **Then** the file is compiled to an ES module that exports a function
2. **Given** a .morph file with <script> tag containing helper functions, **When** compiled, **Then** the helper functions are available within the compiled template function
3. **Given** a .morph file is imported in application code, **When** the application runs, **Then** the exported function can be called with data to render the template

---

### User Story 2 - CSS Module Support (Priority: P2)

As a developer, I want to include CSS in my .morph files using <style> tags and have them work like Svelte CSS modules, with scoped styles automatically applied and access to global CSS variables.

**Why this priority**: CSS styling is essential for component-based development, and scoped styling prevents conflicts between components while global variables enable consistent theming.

**Independent Test**: Can be fully tested by creating a .morph file with <style> tag containing CSS that uses global variables and verifying the styles are scoped and applied correctly when the component is rendered.

**Acceptance Scenarios**:

1. **Given** a .morph file with <style> tag containing CSS, **When** compiled, **Then** CSS classes are scoped to prevent conflicts with other components
2. **Given** multiple .morph files with conflicting class names, **When** used together, **Then** styles don't interfere with each other
3. **Given** a .morph file with CSS, **When** the component is rendered, **Then** the scoped styles are correctly applied to the template elements
4. **Given** a global CSS file with defined variables, **When** a .morph file uses those variables in its <style> tag, **Then** the variables are resolved and applied correctly
5. **Given** a .morph file with CSS using framework global variables, **When** compiled, **Then** the framework variables are accessible and properly applied

---

### User Story 3 - Production Optimization (Priority: P2)

As a developer, I want handshake information to be automatically removed from compiled modules in production builds to minimize file size, while keeping it available during development for reference.

**Why this priority**: Production performance is critical for user experience, and removing development-only data reduces bundle size.

**Independent Test**: Can be fully tested by building with --production flag and verifying handshake data is removed from the compiled output, while remaining in development builds.

**Acceptance Scenarios**:

1. **Given** a .morph file with <script type='application/json'> handshake data, **When** built with --production flag, **Then** the handshake data is removed from the compiled output
2. **Given** a .morph file with handshake data, **When** running in development mode, **Then** the handshake data is preserved in the compiled output
3. **Given** production and development builds of the same .morph file, **When** comparing file sizes, **Then** the production build is smaller due to removed handshake data

---

### User Story 4 - JSON Handshake Support (Priority: P3)

As a developer, I want to optionally include handshake information in my .morph files using <script type='application/json'> tags to document the expected data structure for the template.

**Why this priority**: This provides developer tooling and documentation benefits but is not essential for basic functionality.

**Independent Test**: Can be fully tested by creating a .morph file with JSON handshake data and verifying it's properly parsed and handled during compilation.

**Acceptance Scenarios**:

1. **Given** a .morph file with <script type='application/json'> containing valid JSON, **When** compiled, **Then** the JSON is parsed and handled according to the build mode
2. **Given** a .morph file without handshake data, **When** compiled, **Then** the compilation succeeds normally
3. **Given** a .morph file with invalid JSON in handshake, **When** compiled, **Then** an appropriate error is provided to the developer

---

### User Story 5 - Enhanced Error Handling (Priority: P1)

As a developer, I want clear error messages when .morph files cannot be compiled, with specific information about what went wrong and where the problem occurred.

**Why this priority**: Without clear error messages, developers cannot efficiently debug and fix issues in their .morph files, significantly impacting development productivity.

**Independent Test**: Can be fully tested by creating .morph files with various types of errors and verifying that appropriate, specific error messages are provided.

**Acceptance Scenarios**:

1. **Given** a .morph file with syntax errors, **When** compilation fails, **Then** the build process stops and displays a clear error message with file location and line number
2. **Given** a .morph file with invalid CSS, **When** compilation fails, **Then** the error message identifies the specific CSS problem and its location
3. **Given** a .morph file with malformed JSON handshake, **When** compilation fails, **Then** the error message indicates the JSON parsing issue and location
4. **Given** multiple .morph files with errors, **When** compilation fails, **Then** all errors are reported with their respective file locations

---

### Edge Cases

- What happens when a .morph file has malformed HTML template syntax?
- How does system handle missing or malformed <script type='application/json'> content?
- What occurs when CSS in <style> tags contains invalid syntax?
- How are circular dependencies handled when helper functions reference each other?
- What happens when placeholder syntax conflicts with HTML attribute syntax?
- How does system handle missing global CSS variable files?
- What occurs when global CSS variables are undefined or have invalid values?
- How are errors in global CSS file dependencies handled?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Plugin MUST identify and process files with .morph extension in Vite projects
- **FR-002**: Plugin MUST parse HTML-like templates with placeholders and convert them to @peter.naydenov/morph template format
- **FR-003**: Plugin MUST compile parsed templates to executable functions
- **FR-004**: Plugin MUST convert compiled functions to reusable ES modules
- **FR-005**: Plugin MUST process <script> tags containing helper functions and make them available in compiled templates
- **FR-006**: Plugin MUST handle <style> tags and implement CSS module-like scoping
- **FR-013**: Plugin MUST read and process global CSS files from a configured directory (e.g., `src/global/` or `styles/`)
- **FR-014**: Plugin MUST allow local CSS modules to access and use global CSS variables, with local variables overriding global variables with the same name
- **FR-015**: Plugin MUST focus only on custom CSS variables, with developers handling any specific framework integration
- **FR-007**: Plugin MUST process <script type='application/json'> handshake data when present
- **FR-008**: Plugin MUST remove handshake data in production builds when --production flag is used
- **FR-009**: Plugin MUST preserve handshake data in development builds
- **FR-010**: Plugin MUST integrate seamlessly with Vite's dev server and build processes
- **FR-011**: Plugin MUST provide meaningful error messages for malformed .morph files
- **FR-016**: Plugin MUST prevent successful build when .morph modules contain errors
- **FR-017**: Plugin MUST provide specific error location information (file, line, column) for compilation failures
- **FR-018**: Plugin MUST report all compilation errors across multiple .morph files before failing the build
- **FR-012**: Plugin MUST support hot module replacement during development

### Key Entities *(include if feature involves data)*

- **Morph File**: File with .morph extension containing HTML template, optional script functions, optional CSS, and optional JSON handshake
- **Template Function**: Compiled executable function that takes data and returns rendered HTML
- **Handshake Data**: JSON structure defining expected data format for the template
- **CSS Module**: Scoped CSS styles that apply only to the specific morph component
- **Global CSS File**: CSS file containing global variables and framework styles accessible by all morph modules
- **CSS Variables**: Custom CSS properties defined globally and used within local morph module styles
- **ES Module**: Compiled JavaScript module that exports the template function

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create and use .morph files within 5 minutes of plugin installation
- **SC-002**: Plugin processes .morph files in under 100ms during development builds
- **SC-003**: Production builds remove handshake data and reduce bundle size by at least 10% compared to development builds
- **SC-004**: 95% of .morph files compile successfully without syntax errors
- **SC-005**: Hot module replacement updates .morph components in under 50ms during development
- **SC-006**: CSS scoping prevents style conflicts in 100% of cases when using multiple morph components
- **SC-007**: Global CSS variables are resolved and applied correctly in 100% of morph modules that use them
- **SC-008**: Error messages provide specific location information in 95% of compilation failures
- **SC-009**: Build failures due to morph module errors are detected and reported within 2 seconds of file changes