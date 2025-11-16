---

description: "Task list for Vite Morph Plugin implementation"
---

# Tasks: Vite Morph Plugin

**Input**: Design documents from `/specs/001-morph-plugin/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan
- [X] T002 Initialize JavaScript project with dependencies (@peter.naydenov/morph, Vite, parse5, Vitest)
- [X] T003 [P] Configure package.json with build scripts and dependencies
- [X] T004 [P] Setup JSDoc to TypeScript compilation configuration
- [X] T005 [P] Configure Vitest for testing
- [X] T006 [P] Setup ESLint and Prettier for code formatting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create core plugin entry point in src/index.js
- [X] T008 Implement basic Vite plugin structure in src/plugin/index.js
- [X] T009 [P] Setup HTML AST parsing with parse5 in src/core/parser.js
- [X] T010 [P] Implement error handling system in src/core/errors.js
- [X] T011 [P] Create file processing cache in src/utils/cache.js
- [X] T012 [P] Setup logging utilities in src/utils/logger.js
- [X] T013 [P] Create JSDoc type definitions in src/types/index.js
- [X] T014 Configure plugin options validation in src/plugin/config.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Morph File Processing (Priority: P1) 🎯 MVP

**Goal**: Process .morph files with HTML templates and script functions, compile to ES modules using @peter.naydenov/morph

**Independent Test**: Create a simple .morph file with template content and verify it compiles to a working ES module that exports a function

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [P] [US1] Unit test for HTML parsing in tests/unit/parser.test.js
- [X] T016 [P] [US1] Unit test for template compilation in tests/unit/template.test.js
- [X] T017 [P] [US1] Integration test for basic morph processing in tests/integration/basic.test.js

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement morph file processor in src/core/processor.js
- [X] T019 [US1] Create template content extractor in src/core/template.js
- [X] T020 [US1] Implement script content extractor in src/core/script.js
- [X] T021 [US1] Create morph template compiler using @peter.naydenov/morph in src/core/compiler.js
- [X] T022 [US1] Implement Vite transform hook for .morph files in src/plugin/hooks.js
- [X] T023 [US1] Add ES module generation in src/core/generator.js
- [ ] T024 [US1] Create basic morph file fixtures in tests/fixtures/basic.morph
- [ ] T025 [US1] Add error handling for malformed templates in src/core/errors.js

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - CSS Module Support (Priority: P2)

**Goal**: Process CSS from <style> tags with scoping and global variable support

**Independent Test**: Create a .morph file with <style> tag containing CSS that uses global variables and verify styles are scoped and applied correctly

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T026 [P] [US2] Unit test for CSS parsing in tests/unit/css.test.js
- [ ] T027 [P] [US2] Unit test for CSS scoping in tests/unit/css.test.js
- [ ] T028 [P] [US2] Integration test for CSS modules in tests/integration/css.test.js

### Implementation for User Story 2

- [ ] T029 [P] [US2] Implement CSS parser in src/core/css.js
- [ ] T030 [US2] Create CSS class scoping system in src/core/css.js
- [ ] T031 [US2] Implement global CSS variable resolution in src/core/css.js
- [ ] T032 [US2] Add CSS module export generation in src/core/css.js
- [ ] T033 [US2] Update morph processor to handle CSS content in src/core/processor.js
- [ ] T034 [US2] Create CSS-only morph file support in src/core/processor.js
- [ ] T035 [US2] Add CSS source map generation in src/core/css.js
- [ ] T036 [US2] Create CSS test fixtures in tests/fixtures/css.morph

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Production Optimization (Priority: P2)

**Goal**: Remove handshake data in production builds while preserving it in development

**Independent Test**: Build with --production flag and verify handshake data is removed from compiled output, while remaining in development builds

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T037 [P] [US3] Unit test for production mode in tests/unit/production.test.js
- [ ] T038 [P] [US3] Integration test for build modes in tests/integration/production.test.js

### Implementation for User Story 3

- [ ] T039 [P] [US3] Implement handshake content extractor in src/core/handshake.js
- [ ] T040 [US3] Add production mode detection in src/plugin/config.js
- [ ] T041 [US3] Create handshake removal logic in src/core/processor.js
- [ ] T042 [US3] Update ES module generation for production in src/core/generator.js
- [ ] T043 [US3] Add build size optimization in src/core/processor.js
- [ ] T044 [US3] Create production test fixtures in tests/fixtures/production.morph

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - JSON Handshake Support (Priority: P3)

**Goal**: Parse and handle optional JSON handshake data from <script type='application/json'> tags

**Independent Test**: Create a .morph file with JSON handshake data and verify it's properly parsed and handled during compilation

### Tests for User Story 4 (OPTIONAL - only if tests requested) ⚠️

- [ ] T045 [P] [US4] Unit test for JSON parsing in tests/unit/handshake.test.js
- [ ] T046 [P] [US4] Integration test for handshake handling in tests/integration/handshake.test.js

### Implementation for User Story 4

- [ ] T047 [P] [US4] Implement JSON handshake parser in src/core/handshake.js
- [ ] T048 [US4] Add JSON validation in src/core/handshake.js
- [ ] T049 [US4] Update morph processor to handle handshake in src/core/processor.js
- [ ] T050 [US4] Create handshake error handling in src/core/errors.js
- [ ] T051 [US4] Add handshake test fixtures in tests/fixtures/handshake.morph

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Enhanced Error Handling (Priority: P1)

**Goal**: Provide clear error messages with specific location information for compilation failures

**Independent Test**: Create .morph files with various types of errors and verify that appropriate, specific error messages are provided

### Tests for User Story 5 (OPTIONAL - only if tests requested) ⚠️

- [ ] T052 [P] [US5] Unit test for error reporting in tests/unit/errors.test.js
- [ ] T053 [P] [US5] Integration test for error handling in tests/integration/errors.test.js

### Implementation for User Story 5

- [ ] T054 [P] [US5] Enhance error location tracking in src/core/errors.js
- [ ] T055 [US5] Add HTML syntax error detection in src/core/parser.js
- [ ] T056 [US5] Implement CSS error reporting in src/core/css.js
- [ ] T057 [US5] Add JavaScript error reporting in src/core/script.js
- [ ] T058 [US5] Create JSON error reporting in src/core/handshake.js
- [ ] T059 [US5] Update error formatter in src/core/errors.js
- [ ] T060 [US5] Add error test fixtures in tests/fixtures/errors/

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T061 [P] Implement hot module replacement in src/plugin/hmr.js
- [ ] T062 [P] Add performance optimizations in src/core/processor.js
- [ ] T063 [P] Create comprehensive documentation in docs/
- [ ] T064 [P] Update README.md with usage examples
- [ ] T065 [P] Add quickstart validation examples in examples/
- [ ] T066 [P] Implement configuration validation in src/plugin/config.js
- [ ] T067 [P] Add source map support in src/core/generator.js
- [ ] T068 [P] Create build optimization in src/core/processor.js
- [ ] T069 [P] Add comprehensive error messages in src/core/errors.js
- [ ] T070 [P] Setup CI/CD configuration in .github/workflows/
- [ ] T071 [P] Create package.json preparation for publishing
- [ ] T072 [P] Add integration test suite in tests/integration/
- [ ] T073 [P] Performance benchmarking in tests/performance/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for base processing
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 for base processing
- **User Story 5 (P1)**: Can start after Foundational (Phase 2) - Enhances all other stories

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core processing before specific features
- Error handling throughout implementation
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Unit test for HTML parsing in tests/unit/parser.test.js"
Task: "Unit test for template compilation in tests/unit/template.test.js"
Task: "Integration test for basic morph processing in tests/integration/basic.test.js"

# Launch all core processing tasks for User Story 1 together:
Task: "Implement morph file processor in src/core/processor.js"
Task: "Create template content extractor in src/core/template.js"
Task: "Implement script content extractor in src/core/script.js"
Task: "Create morph template compiler using @peter.naydenov/morph in src/core/compiler.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 5 (both P1)
   - Developer B: User Story 2 (P2)
   - Developer C: User Story 3 (P2)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- CSS processing is entirely handled by plugin since @peter.naydenov/morph doesn't support CSS
- JSDoc types will be compiled to d.ts for TypeScript compatibility