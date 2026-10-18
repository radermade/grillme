# Phase 12 Tasks

Status: semantic engine complete; exact capture-backed walkthrough blocked pending reviewed AWS Console captures and manual accessibility/product review

- [x] Define semantic service, resource, relationship, view, form, operation, and outcome contracts.
- [x] Define stable semantic target IDs and versioned AWS/presentation mappings.
- [x] Implement deterministic simulator provider and explicit workspace machine.
- [x] Build console-like resource list, details, configuration, logs, and coach-overlay primitives.
- [x] Extend scenario evidence with semantic, AWS mapping, presentation, and simulator versions.
- [x] Implement one Bedrock request/guardrail walkthrough in walkthrough, practice, and challenge modes.
- [x] Add reset, revision, debrief, inconclusive validation, and safe unsupported-operation handling.
- [x] Verify no click-path dependence and no arbitrary execution.
- [x] Implement capture-scene schemas, normalized interactive anchors, shared asset packaging, hash verification, and fail-closed walkthrough gating.
- [ ] Capture, redact, approve, hash, and anchor every screen required by the Bedrock create/configure/inspect/troubleshoot walkthrough.
- [ ] Verify each capture against the declared viewport and current AWS presentation mapping.
- [ ] Run exact walkthrough keyboard, screen-reader, zoom, and responsive review.
- [ ] Run learner study comparing exact capture walkthrough, semantic practice, and managed-console challenge.

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

- Exact walkthrough is intentionally blocked because `console-captures.json` contains no reviewed scenes; `npm run console:captures:check` verifies this fail-closed state.
- Capture assets use one canonical `packages/content/captures/console-captures/` source packaged by both app roots.
- The Training navigation now opens the console simulation; the older abstract builder is labeled Scenarios.
- Full keyboard operation, screen-reader announcements, zoom, capture scaling, and hotspot accuracy require manual review.
- The simulator is deterministic and local; managed sandbox and real-console providers remain future implementations of the same `ConsolePort`.
- The AWS and presentation mapping date is fixture metadata pending review by the future drift process; it must not be treated as externally verified production truth.
- A learner comparison study has not been run.
