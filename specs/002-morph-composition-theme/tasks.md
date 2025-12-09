---
description: Implement morph composition and theme system
handoffs:
  - label: Implement Composition and Theme System
    agent: manual
    prompt: Implement the complete morph composition and theme system according to the specification and plan
    send: true
---

## Feature Summary

Implement build-time component composition and CSS theme system for morph files, enabling developers to create UI variations through configuration files and switch themes at runtime without application rebuilds.

## Implementation Tasks

### Phase 1: Setup and Foundation

**Task 1**: Create project structure for composition and theme system

- [x] T001 Create src/core/composer.js for component composition using morph curry
- [x] T002 Create src/core/themer.js for theme discovery and CSS generation
- [ ] T003 Create src/utils/file-watcher.js for hot module replacement support
- [ ] T004 Create src/plugin/hmr.js for composition and theme HMR integration
- [ ] T005 Create src/plugin/runtime/ directory structure
- [ ] T006 Create src/plugin/runtime/theme-manager.js for theme switching API
- [ ] T007 Create src/plugin/runtime/component-registry.js for composition metadata API
- [ ] T008 Create src/plugin/runtime/dev-info.js for development information helpers
- [ ] T009 Create src/types/composition.js for composition system types
- [ ] T010 Create src/types/theme.js for theme system types

### Phase 2: Core Composition System

**Task 11**: Implement configuration file parsing and validation

- [ ] T011 [P] [US1] Implement morph.config.js parsing in src/plugin/config.js
- [ ] T012 [P] [US1] Create composition validation logic in src/core/composer.js
- [ ] T013 [P] [US1] Implement error handling for missing components in src/core/composer.js
- [ ] T014 [P] [US1] Add circular dependency detection in src/core/composer.js

**Task 12**: Implement component composition using morph curry

- [ ] T015 [P] [US1] Implement morph curry integration in src/core/composer.js
- [ ] T016 [P] [US1] Create placeholder replacement logic in src/core/composer.js
- [ ] T017 [P] [US1] Implement helper function merging in src/core/composer.js
- [ ] T018 [P] [US1] Add handshake data merging in src/core/composer.js
- [ ] T019 [P] [US1] Create composed component ES module generation in src/core/composer.js

**Task 13**: Integrate composition system with build pipeline

- [ ] T020 [P] [US1] Update src/plugin/hooks.js to handle composition files
- [ ] T021 [P] [US1] Modify src/plugin/index.js to register composition processing
- [ ] T022 [P] [US1] Update src/core/processor.js to integrate composition system
- [ ] T023 [P] [US1] Add composition caching to src/utils/cache.js

### Phase 3: CSS Theme System

**Task 14**: Implement theme discovery and naming convention

- [ ] T024 [P] [US2] Implement theme file discovery in src/core/themer.js
- [ ] T025 [P] [US2] Add \_css.{themeName}.morph pattern matching in src/core/themer.js
- [ ] T026 [P] [US2] Implement default theme detection in src/core/themer.js
- [ ] T027 [P] [US2] Add validation for multiple default themes in src/core/themer.js

**Task 15**: Implement CSS generation and processing

- [ ] T028 [P] [US2] Create CSS extraction from theme morph files in src/core/themer.js
- [ ] T029 [P] [US2] Implement CSS optimization and minification in src/core/themer.js
- [ ] T030 [P] [US2] Add theme inheritance support via CSS imports in src/core/themer.js
- [ ] T031 [P] [US2] Create CSS file generation in dist/themes/ directory in src/core/themer.js

**Task 16**: Integrate theme system with build pipeline

- [ ] T032 [P] [US2] Update src/plugin/hooks.js to handle theme files
- [ ] T033 [P] [US2] Modify src/plugin/index.js to register theme processing
- [ ] T034 [P] [US2] Add theme metadata generation in src/core/themer.js
- [ ] T035 [P] [US2] Create theme registry generation for runtime plugins

### Phase 4: Runtime Plugin System

**Task 17**: Implement theme manager runtime API

- [ ] T036 [P] [US3] Implement getCurrent() method in src/plugin/runtime/theme-manager.js
- [ ] T037 [P] [US3] Implement list() method in src/plugin/runtime/theme-manager.js
- [ ] T038 [P] [US3] Implement load() method in src/plugin/runtime/theme-manager.js
- [ ] T039 [P] [US3] Implement default() method in src/plugin/runtime/theme-manager.js
- [ ] T040 [P] [US3] Add CSS link switching logic in src/plugin/runtime/theme-manager.js

**Task 18**: Implement component registry runtime API

- [ ] T041 [P] [US3] Implement isComposed() method in src/plugin/runtime/component-registry.js
- [ ] T042 [P] [US3] Implement getCompositionInfo() method in src/plugin/runtime/component-registry.js
- [ ] T043 [P] [US3] Implement getAllCompositions() method in src/plugin/runtime/component-registry.js
- [ ] T044 [P] [US3] Implement getComponentSource() method in src/plugin/runtime/component-registry.js

**Task 19**: Implement development information helpers

- [ ] T045 [P] [US5] Implement getComponentSource() method in src/plugin/runtime/dev-info.js
- [ ] T046 [P] [US5] Implement getAllCompositions() method in src/plugin/runtime/dev-info.js
- [ ] T047 [P] [US5] Implement getThemeInfo() method in src/plugin/runtime/dev-info.js

**Task 20**: Package runtime plugins for distribution

- [ ] T048 [P] [US3] Create runtime plugin packaging in src/plugin/runtime/index.js
- [ ] T049 [P] [US3] Update build process to include runtime plugins in dist/runtime/
- [ ] T050 [P] [US3] Add runtime plugin type definitions in src/types/index.js

### Phase 5: Hot Module Replacement

**Task 21**: Implement file watching for compositions and themes

- [ ] T051 [P] [US4] Create file watcher for morph.config.js in src/utils/file-watcher.js
- [ ] T052 [P] [US4] Create file watcher for theme files in src/utils/file-watcher.js
- [ ] T053 [P] [US4] Create file watcher for component dependencies in src/utils/file-watcher.js
- [ ] T054 [P] [US4] Implement selective regeneration logic in src/utils/file-watcher.js

**Task 22**: Integrate HMR with composition and theme systems

- [ ] T055 [P] [US4] Update src/plugin/hmr.js to handle composition changes
- [ ] T056 [P] [US4] Add theme file HMR support in src/plugin/hmr.js
- [ ] T057 [P] [US4] Implement composition hot-reloading in src/plugin/hmr.js
- [ ] T058 [P] [US4] Add performance optimization for selective regeneration in src/plugin/hmr.js

### Phase 6: Testing Implementation

**Task 23**: Create unit tests for composition system

- [ ] T059 Create tests/unit/composer.test.js for composition logic testing
- [ ] T060 Create tests/unit/themer.test.js for theme system testing
- [ ] T061 Create tests/unit/file-watcher.test.js for HMR functionality testing
- [ ] T062 Create tests/unit/runtime/theme-manager.test.js for theme API testing
- [ ] T063 Create tests/unit/runtime/component-registry.test.js for registry API testing

**Task 24**: Create integration tests for end-to-end functionality

- [ ] T064 Create tests/integration/composition.test.js for composition workflow testing
- [ ] T065 Create tests/integration/theme.test.js for theme system workflow testing
- [ ] T066 Create tests/integration/hmr.test.js for hot module replacement testing
- [ ] T067 Create test fixtures for composition and theme scenarios in tests/fixtures/

### Phase 7: Documentation and Polish

**Task 25**: Update documentation and examples

- [ ] T068 Update README.md with composition and theme system examples
- [ ] T069 Create examples/basic/composition-config.morph showing composition setup
- [ ] T070 Create examples/basic/theme-config.morph showing theme setup
- [ ] T071 Update HELPERS_GUIDE.md with runtime plugin documentation

**Task 26**: Performance optimization and error handling

- [ ] T072 Add performance monitoring for composition generation in src/core/composer.js
- [ ] T073 Add performance monitoring for theme switching in src/plugin/runtime/theme-manager.js
- [ ] T074 Implement comprehensive error messages with file locations in src/core/errors.js
- [ ] T075 Add graceful degradation for runtime plugin failures

## Success Criteria

- Composition system generates components correctly using morph curry
- Theme system discovers and processes CSS-only morph files with naming convention
- Runtime plugins provide functional APIs for theme switching and component metadata
- Hot module replacement works for compositions and themes during development
- All functionality maintains backward compatibility with existing morph projects
- Performance targets met: <100ms theme switching, <50ms HMR, <2s build for 100+ files
- Error handling provides clear messages with file locations
- Generated files are properly structured and optimized for production use

## Dependencies

- Existing morph plugin infrastructure (src/core/, src/plugin/, src/utils/)
- @peter.naydenov/morph v3.1.5 library for curry functionality
- Vite 4.x plugin API for integration
- parse5 for HTML AST parsing
- Vitest for testing framework
- File system APIs for configuration and theme file processing
- CSS processing capabilities for theme generation

## Parallel Execution Opportunities

### Phase 1 (Setup and Foundation)

- Tasks T001-T010 can be executed in parallel as they create separate files and directories

### Phase 2 (Core Composition System)

- Tasks T011-T014 can be executed in parallel as they work on different aspects of composition system
- Tasks T015-T023 must be sequential as they build on each other

### Phase 3 (CSS Theme System)

- Tasks T024-T035 can be executed in parallel as they work on different aspects of theme system
- Tasks T032-T035 must be sequential as they build on each other

### Phase 4 (Runtime Plugin System)

- Tasks T036-T050 can be executed in parallel as they create separate runtime modules

### Phase 5 (Hot Module Replacement)

- Tasks T051-T058 can be executed in parallel as they work on different file watching aspects

### Phase 6 (Testing Implementation)

- Tasks T059-T067 can be executed in parallel as they create separate test files

### Phase 7 (Documentation and Polish)

- Tasks T068-T075 can be executed in parallel as they work on different aspects of the system

## Independent Test Criteria

### User Story 1 - Configuration-Driven Component Composition

- **Independent Test**: Create morph.config.js with composition definitions and verify generated components
- **Test Tasks**: T011-T023 (composition system implementation)

### User Story 2 - CSS Theme System with Naming Convention

- **Independent Test**: Create CSS-only morph files with naming convention and verify processing
- **Test Tasks**: T024-T035 (theme system implementation)

### User Story 3 - Runtime Theme Switching

- **Independent Test**: Import theme manager plugin and verify API functionality
- **Test Tasks**: T036-T040 (theme manager implementation)

### User Story 4 - Hot Module Replacement for Compositions and Themes

- **Independent Test**: Modify configurations/themes during development and verify automatic updates
- **Test Tasks**: T051-T058 (HMR implementation)

### User Story 5 - Component Registry and Development Information

- **Independent Test**: Import component registry plugin and verify metadata accuracy
- **Test Tasks**: T041-T047 (component registry and dev-info implementation)
