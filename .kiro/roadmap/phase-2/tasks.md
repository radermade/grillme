# Phase 2 Tasks

Status: locally complete; manual accessibility review pending  
Last updated: 2026-10-16

## 1. Contracts and content

- [x] 1.1 Define versioned assessment, response, skill-gap, review-schedule, and review-event contracts.
- [x] 1.2 Add cross-reference-validated runtime schemas for all four activity types.
- [x] 1.2a Runtime-validate persisted assessment responses, progress, and review schedules before rehydration; discard malformed local records safely.
- [x] 1.3 Add an original five-activity AIP-C01 baseline assessment fixture.

## 2. Assessment workflow

- [x] 2.1 Implement deterministic all-or-nothing graders for single choice, multiple choice, ordering, and required-concept text.
- [x] 2.2 Implement resumable assessment XState workflow with introduction, answering, saving, reviewing, submitting, graded, abandoned, degraded, and failed states.
- [x] 2.3 Persist append-only response evidence with idempotency keys, confidence, elapsed time, attempt, skills, result, and timestamp.
- [x] 2.4 Produce an inspectable deterministic skill-gap summary using a 70% evidence threshold.
- [x] 2.5 Render accessible answer, ordering, confidence, rationale, failure, resume, and results states.
- [x] 2.6 Enforce type-specific answer completeness, text limits, confidence range, and visible submission readiness at machine and UI boundaries.

## 3. Review workflow

- [x] 3.1 Generate a versioned review schedule from weak skills.
- [x] 3.2 Implement review XState workflow with prompting, revealing, self-assessment, rescheduling, completion, degraded, and failed states.
- [x] 3.3 Persist schedule changes and append-only review evidence with idempotency keys.
- [x] 3.4 Render due reasons, expected evidence, confidence, removal criteria, future-item status, and empty state.
- [x] 3.5 Enforce 1/3/7-day spacing and removal after two separate strong recalls.
- [x] 3.6 Reject forged selection events for future-due review items.
- [x] 3.7 Deduplicate append-only evidence across partial-write retries and verify restart/removal behavior.

## 4. Validation

- [x] 4.1 Diagnostics and strict TypeScript pass.
- [x] 4.2 Fifteen Phase 1/2 tests pass; ten Phase 2 cases cover schemas, all graders, resume, append-only evidence, idempotent partial-write retry, malformed storage, forged input, skill gaps, clean queues, fixed intervals, future-item rejection, restart persistence, and two-success removal.
- [x] 4.3 Production desktop build passes.
- [x] 4.4 Cargo check passes.
- [x] 4.5 Tauri release build passes at `src-tauri/target/release/grillme`.
- [ ] 4.6 Manually verify keyboard, zoom, VoiceOver/Narrator, reduced motion, forced colors, and assessment form announcements before distribution.

## Exit status

The Phase 2 engineering slice is complete. Local grading is explicitly provisional until Phase 5 server synchronization provides authoritative evidence acceptance. Manual accessibility review remains a distribution gate.