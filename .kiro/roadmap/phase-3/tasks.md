# Phase 3 Tasks

Status: locally complete including control-plane core; deployment and external validation pending  
Last updated: 2026-10-16

## 1. Contracts and content

- [x] 1.1 Define versioned rubric, evaluator, turn, progress, summary, challenge, and evidence contracts.
- [x] 1.2 Add runtime schemas for grill content, persisted progress, and untrusted evaluator output.
- [x] 1.3 Add an original three-skill AIP-C01 structured-output grill fixture.

## 2. Evaluation and adaptation

- [x] 2.1 Define a provider-neutral asynchronous evaluation port returning unknown data.
- [x] 2.2 Implement transparent deterministic reference evaluator and explicit fallback.
- [x] 2.3 Cross-check evaluator rubric/concept IDs before accepting output.
- [x] 2.4 Implement rubric-driven misconception/missing-concept follow-ups with learner-visible reasons.
- [x] 2.5 Generate deterministic evidence summaries and review items from missing concepts.
- [x] 2.6 Block common credential patterns before evaluation and exclude raw provider output from persistence.
- [x] 2.7 Extract evaluation logic into a shared provider-neutral package used by desktop and control plane.
- [x] 2.8 Implement a framework-neutral server evaluation core with request validation, authentication ordering, rubric lookup, idempotent quota reservation/reconciliation, bounded provider attempts, hard timeout, provenance validation, metadata-only audit, and deterministic fallback.
- [x] 2.9 Implement a sanitized HTTP boundary and HTTPS-only desktop server adapter without embedding credentials or provider secrets.

## 3. Grill workflow and UI

- [x] 3.1 Implement bounded multi-turn XState workflow with evaluation, retry, fallback, save, degraded, feedback, clarification, challenge, report, budget, summary, and failure states.
- [x] 3.2 Enforce two attempts per turn, hard timeout, four-turn cap, and fixed cost-unit budget.
- [x] 3.3 Persist runtime-validated progress and append-only turn/challenge evidence with idempotency.
- [x] 3.4 Render composition, confidence, hints, secret warnings, evaluation provenance, evidence excerpts, feedback, challenges, budget, and summary states.
- [x] 3.5 Add Grill to the explicit workspace state machine and navigation.

## 4. Validation

- [x] 4.1 Diagnostics and strict TypeScript pass.
- [x] 4.2 Thirty-one Phase 1-3 tests pass; sixteen Phase 3/control-plane tests cover rubric schema, evidence, adaptation, secret blocking, malformed output, bounded retry, ignored-cancellation timeout, deterministic fallback, persistence, resume, challenge evidence, budget, summary, review generation, authentication ordering, quota rejection/release, provider provenance, audit minimization, and sanitized HTTP errors.
- [x] 4.3 Production desktop build passes.
- [x] 4.4 Cargo check passes.
- [x] 4.5 Tauri release build passes at `src-tauri/target/release/grillme`.
- [ ] 4.6 Deploy the implemented control-plane core with concrete identity, durable quota, rubric repository, audit storage, and model-provider adapters.
- [ ] 4.7 Run repeated-evaluation consistency, adversarial prompt, privacy, cost, and load studies against the selected deployed model provider.
- [ ] 4.8 Manually verify keyboard, zoom, VoiceOver/Narrator, reduced motion, forced colors, feedback announcements, and long-response behavior.

## Exit status

The provider-neutral Phase 3 engineering slice is complete. The desktop currently uses the deterministic reference evaluator and clearly marks evaluation as provisional. A real model evaluator must run server-side; it must not be embedded in the Tauri client.