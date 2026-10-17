# Phase 8 Tasks

Status: readiness, mock, coverage-audit, and correction foundations locally complete; production course and approvals pending
Last updated: 2026-10-17

## 1. Evidence and readiness

- [x] 1.1 Define versioned readiness evidence, rule, skill-summary, and course-summary contracts.
- [x] 1.2 Implement deterministic weighted scoring with recency decay, evidence deduplication, high-impact multi-type requirements, and independent-application requirements.
- [x] 1.3 Prevent guided scenario evidence, confidence, completion, or mock evidence alone from establishing the highest readiness level.
- [x] 1.4 Keep readiness as a derived view over immutable evidence; changing rule data recomputes summaries without rewriting history.
- [x] 1.5 Retain contributing evidence IDs, activity types, freshness, sufficiency reasons, and targeted next actions per skill.
- [x] 1.6 Display an explicit non-guarantee and avoid exam-pass predictions.

## 2. Mock workflow

- [x] 2.1 Define runtime-validated original-content mock, progress, response, and completion-evidence contracts.
- [x] 2.2 Implement loading, briefing, timed in-progress, persistence, pause, timeout, finalization, results review, failure, and complete XState states.
- [x] 2.3 Preserve the original deadline across pause and restart, validate answer choices, and append idempotent versioned evidence.
- [x] 2.4 Add a five-item reliable-integration mock preview with no hints, skill scores, missed-item rationale, and readiness return path.
- [x] 2.5 Normalize mock completion into synchronization and readiness evidence.

## 3. Course coverage and governance

- [x] 3.1 Record the 17-skill draft catalog and current fixture mappings as versioned content data.
- [x] 3.2 Implement a coverage audit for instruction, retrieval practice, application evidence, remediation, multiple evidence types, and reviews.
- [x] 3.3 Add a runtime-validated draft release manifest with source basis, skill list, review decisions, review date, limitations, and correction ownership.
- [x] 3.4 Make a released manifest invalid unless all product, technical, instructional, accessibility, and lab approvals plus a correction owner exist.
- [x] 3.5 Add an explicit content-report XState workflow, authenticated idempotent server intake, severity classification, secret blocking, and sanitized HTTP errors.
- [x] 3.6 Show current content and review gaps in the dashboard rather than implying course completeness.

## 4. Desktop experience

- [x] 4.1 Add Readiness and Mock to the explicit workspace state machine and navigation.
- [x] 4.2 Add skill-level evidence cards, sufficiency explanations, content gaps, release limitations, refresh, and weak-skill drill routing.
- [x] 4.3 Add keyboard-operable mock choices, timing, pause/resume, missed-item review, and status announcements.
- [x] 4.4 Add a privacy warning and accessible content-report form.
- [x] 4.5 Split stable React/XState and validation dependencies into bounded production chunks.

## 5. Validation

- [x] 5.1 Strict TypeScript and diagnostics pass.
- [x] 5.2 Existing 39 project tests pass.
- [x] 5.3 Behavior smoke verifies rule recomputation, guided-evidence limits, release blocking, critical report classification/idempotency, and mock evidence.
- [x] 5.4 Secret scans confirm readiness summaries are not persisted or sent to telemetry.
- [x] 5.5 Desktop/web production builds, Cargo check, and Tauri release build pass.
- [ ] 5.6 Confirm AIP-C01 as the product course and have a qualified SME verify all 17 skill mappings against the current official guide.
- [ ] 5.7 Produce complete instruction, retrieval, scenario, debugging, remediation, and assessment content for every approved skill.
- [ ] 5.8 Produce and review at least three debugging challenges, representative architecture scenarios, six-to-ten sandbox labs, and two restricted AWS labs.
- [ ] 5.9 Obtain technical, instructional, accessibility, lab, product, curriculum, and operations approval; assign correction ownership and rollback procedures.
- [ ] 5.10 Validate readiness rules, mock length/pacing, content quality, accessibility, and learning effectiveness with representative learners.

## Exit status

The Phase 8 readiness, mock-session, coverage-audit, release-gate, and correction foundations are locally complete. The repository intentionally remains a draft capability fixture. Phase 8 product exit criteria remain unmet until all approved skills have reviewed instruction, retrieval, application, and remediation coverage; production labs are deployed; readiness rules are approved; and human review and learner validation gates pass.
