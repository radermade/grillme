# Phase 4 Tasks

Status: engine locally complete; production content and manual validation deferred  
Last updated: 2026-10-16

## 1. Engine contracts

- [x] 1.1 Define versioned scenario, workspace, checkpoint, validation, progress, and evidence contracts.
- [x] 1.2 Add strict runtime schemas with component, connection, setting, checkpoint, and check cross-reference validation.
- [x] 1.3 Implement deterministic component, absence, connection, setting, and diagnosis-concept validators.

## 2. Guided workflow

- [x] 2.1 Implement catalog selection and walkthrough, practice, and challenge modes over the same scenario definition.
- [x] 2.2 Implement explicit selection, mode, loading, briefing, demonstrating, working, hinting, validating, failed/passed checkpoint, degraded, debriefing, complete, and failed XState states.
- [x] 2.3 Implement progressive practice hints, checkpoint reset, safe revision, and root-cause/prevention debrief.
- [x] 2.4 Persist runtime-validated progress and append-only evidence containing mode, outcomes, hints, resets, attempts, and idempotency keys.
- [x] 2.5 Validate observable workspace outcomes rather than prescribed clicks; guidance never changes correctness.

## 3. Desktop experience

- [x] 3.1 Add keyboard-operable component selection, directed connections, and setting controls for architecture workspaces.
- [x] 3.2 Add safe code/log/config/test fixture inspection, settings, and diagnosis for debugging workspaces.
- [x] 3.3 Show objectives, mode-appropriate instruction, progressive hints, deterministic feedback, root cause, prevention, and guidance-aware completion evidence.
- [x] 3.4 Add Training to the explicit workspace state machine and navigation.
- [x] 3.5 Ensure no learner input is executed as code or passed to a shell.

## 4. Fixtures and validation

- [x] 4.1 Add one architecture and one debugging fixture solely to prove engine capabilities.
- [x] 4.2 Eight Phase 4 tests pass across schema references, all validator types, all modes, hint restrictions, failed/pass evidence, reset, revision, debugging diagnosis, resume, degraded save, malformed progress, and forged operations.
- [x] 4.3 Thirty-nine project tests, strict TypeScript, desktop build, Cargo check, and Tauri release build pass.
- [x] 4.4 Move production scenario-library generation and at least three reviewed debugging challenges to Phase 8.
- [ ] 4.5 Manually verify keyboard, zoom, VoiceOver/Narrator, reduced motion, forced colors, resource readability, and long scenario behavior.

## Exit status

The reusable guided-scenario engine is locally complete and requires no hosting, cloud storage, AWS account, or arbitrary command execution. The two included scenarios are capability fixtures, not finished curriculum. Production content creation and review remain Phase 8 work.