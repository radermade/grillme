# Phase 9 Tasks

Status: private-beta operations and commercial-control foundations locally complete; real beta and production release pending
Last updated: 2026-10-17

## 1. Consent-aware beta operations

- [x] 1.1 Define strict product-analytics consent, event, support-snapshot, and aggregate metric contracts.
- [x] 1.2 Keep product analytics disabled by default and require explicit opt-in before events can enter the local queue.
- [x] 1.3 Restrict analytics to closed event/field schemas without prompts, responses, diagnoses, credentials, PII, file content, or arbitrary maps.
- [x] 1.4 Persist consent and retryable pending events; deduplicate intake and support bounded retention/purge.
- [x] 1.5 Persist opt-out locally before requesting server deletion, so deletion failure cannot silently resume collection.
- [x] 1.6 Derive return, completion, readiness-change, support-burden, sync-conflict, and unit-cost metrics from accepted events.
- [x] 1.7 Embed no third-party analytics SDK.

## 2. Entitlements, privacy, and support

- [x] 2.1 Define provider-neutral commercial entitlement, privacy-request, and receipt contracts.
- [x] 2.2 Implement active, grace, blocked, loading, and failed entitlement states with expiry checks.
- [x] 2.3 Implement explicit export, deletion confirmation, submission, retry, accepted, and reset privacy states.
- [x] 2.4 Add authenticated idempotent privacy requests and resumable per-service deletion coordination.
- [x] 2.5 Define closed support snapshots containing only app version, platform, channel, connectivity, pending count, active workflow, and sanitized error codes.
- [x] 2.6 Add authenticated support intake/export and a learner-triggered support workflow.
- [x] 2.7 Add a Settings surface that labels undeployed billing, identity, privacy, analytics, and support capabilities accurately.

## 3. Release and rollback safety

- [x] 3.1 Define semantic-versioned dev, beta, and stable release manifests and assignments.
- [x] 3.2 Implement deterministic cohort rollout, minimum-version handling, pause-compatible assignments, and rollback decisions.
- [x] 3.3 Derive rollout identity from authenticated server context rather than client-controlled identifiers.
- [x] 3.4 Reject active stable release manifests without signed macOS and Windows artifacts.
- [x] 3.5 Return version assignments only; do not accept arbitrary download URLs or executable update commands.
- [x] 3.6 Publish draft platform, connectivity, offline, privacy, and unsigned-build limitations in the client.
- [x] 3.7 Add Settings to the explicit workspace state machine and navigation.

## 4. Control-plane boundaries

- [x] 4.1 Add authenticated analytics, entitlement, privacy, support, and release services with runtime validation.
- [x] 4.2 Add sanitized HTTP handlers with method/content-type checks and stable error codes.
- [x] 4.3 Add in-memory reference stores for analytics, entitlements, support snapshots, privacy jobs, and release manifests.
- [x] 4.4 Handle successful HTTP 204 responses without attempting JSON parsing in desktop and web adapters.

## 5. Validation

- [x] 5.1 Strict TypeScript and diagnostics pass.
- [x] 5.2 Existing 39 project tests pass.
- [x] 5.3 Consent smoke verifies default-off collection, opt-in queue/flush, and opt-out deletion.
- [x] 5.4 Metrics smoke verifies return, grill completion, readiness increase, support burden, and cost aggregation.
- [x] 5.5 Privacy smoke verifies confirmation, idempotent scheduling, and resumable deletion after partial failure.
- [x] 5.6 Support smoke rejects unexpected learner-content fields.
- [x] 5.7 Entitlement and release smokes verify expiry denial, unsigned stable blocking, and rollback assignment.
- [x] 5.8 Desktop/web builds, Cargo check, and Tauri release build pass.
- [ ] 5.9 Select and deploy identity, billing, durable analytics, privacy-export/deletion, support, and release-distribution providers.
- [ ] 5.10 Recruit 25 to 50 representative learners with informed consent and run the private beta.
- [ ] 5.11 Measure activation, return, core-workflow completion, readiness change, support burden, reliability, and cost per active learner using approved targets.
- [ ] 5.12 Complete security, privacy, accessibility, recovery, and lab-abuse reviews; resolve or explicitly accept findings.
- [ ] 5.13 Audit account export/deletion and analytics retention against applicable requirements with qualified review.
- [ ] 5.14 Staff support, approve runbooks/SLOs, assign operational and content owners, and exercise escalation and rollback procedures.
- [ ] 5.15 Sign and notarize macOS artifacts, sign Windows installers, validate supported platforms, and operate staged distribution.
- [ ] 5.16 Record a beta go, conditional-go, revise, or stop decision based on observed evidence and unit economics.

## Exit status

The Phase 9 private-beta operations and commercial-control foundations are locally complete. No learners were recruited, no payments were processed, no production analytics were collected, and no signed installers were distributed. Phase 9 product exit criteria remain unmet until deployed providers, real beta evidence, deletion/retention audits, staffed support, security/privacy/accessibility reviews, signed distribution, operational ownership, and an evidence-based release decision are complete.
