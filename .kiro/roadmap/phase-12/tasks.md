# Phase 12 Tasks

Status: implementation complete; manual keyboard/accessibility review and learner comparison pending

- [x] Define semantic service, resource, relationship, view, form, operation, and outcome contracts.
- [x] Define stable semantic target IDs and versioned AWS/presentation mappings.
- [x] Implement deterministic simulator provider and explicit workspace machine.
- [x] Build console-like resource list, details, configuration, logs, and coach-overlay primitives.
- [x] Extend scenario evidence with semantic, AWS mapping, presentation, and simulator versions.
- [x] Implement one Bedrock request/guardrail walkthrough in walkthrough, practice, and challenge modes.
- [x] Add reset, revision, debrief, inconclusive validation, and safe unsupported-operation handling.
- [x] Verify no click-path dependence and no arbitrary execution.
- [ ] Run learner study comparing current workspace and semantic console simulation.

## Verification

- `getDiagnostics`: no issues in changed domain, content, evaluation, platform, machine, UI, or app files.
- Semantic provider smoke check: create, configure, inspect, and troubleshoot passed runtime parsing and state validation.
- XState smoke check: walkthrough, practice, and challenge passed all 12 checkpoint runs with versioned evidence.
- Shared-layer boundary scan: no execution APIs, AWS SDK, Tauri, or browser globals found.
- `npm run typecheck`: passed.
- `npm test`: passed, including OpenAPI checks and all existing suites.
- `npm run web:build`: passed.
- `npm run desktop:build`: passed.
- `cargo check` in `src-tauri`: passed.
- `npm run tauri:build`: passed.

## Open review risks

- Full keyboard operation, screen-reader announcements, zoom, contrast, reduced motion, and forced-color behavior require manual review.
- The simulator is deterministic and local; managed sandbox and real-console providers remain future implementations of the same `ConsolePort`.
- The AWS and presentation mapping date is fixture metadata pending review by the future drift process; it must not be treated as externally verified production truth.
- A learner comparison study has not been run.
