---
description: Implement helper template support
handoffs: 
  - label: Implement Helper Template Support
    agent: manual
    prompt: Implement helper template support in morph plugin
    send: true
---

## Feature Summary

Implement helper template support in morph file processing to align with @peter.naydenov/morph standard, where helpers can be declared as template strings using `const` declarations in script tags.

## Implementation Tasks

### Phase 1: Script Processing Enhancement

**Task 1**: Extend script content parser to detect template helpers
- Modify `src/core/script.js` to identify `const` declarations with template literals
- Differentiate between function declarations and template declarations
- Extract template content and variable names

**Task 2**: Create helper template processor
- Add logic to convert `const template = \'content\\`` to helper objects
- Preserve template content exactly (including placeholders)
- Integrate with existing function helper processing

### Phase 2: Integration with Morph Compiler

**Task 3**: Update morph template compilation
- Modify `src/core/compiler.js` to handle template helpers
- Ensure template helpers are available in render function
- Maintain compatibility with existing function helpers

### Phase 3: Testing Implementation

**Task 4**: Create unit tests for template helpers
- Add `tests/unit/helper-template.test.js`
- Test template detection, extraction, and compilation
- Verify mixed function and template helper scenarios

**Task 5**: Update integration tests
- Modify `tests/integration/basic.test.js` to include template helper scenarios
- Add test fixtures with template helpers
- Verify end-to-end functionality

### Phase 4: Documentation Updates

**Task 6**: Update specification documentation
- Add template helper examples to existing spec
- Document syntax and usage patterns
- Update quickstart guide with template helper examples

## Success Criteria

- Template helpers are correctly detected and processed
- Mixed function and template helpers work together
- All existing functionality remains compatible
- Comprehensive test coverage for template helper features
- Clear documentation for developers using template helpers

## Dependencies

- Existing script processing infrastructure
- @peter.naydenov/morph library compatibility
- Current test framework (Vitest)
