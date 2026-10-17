# Phase 6 Tasks

Status: provider-neutral foundation and controlled fixture locally complete; deployed sandbox and content validation pending
Last updated: 2026-10-17

## 1. Contracts and lifecycle

- [x] 1.1 Define versioned public lab, checkpoint, operation, session, progress, validation, and evidence contracts.
- [x] 1.2 Add strict runtime schemas with immutable image digests, bounded duration/cost/attempts, safe paths, unique checkpoints, and validated persisted progress.
- [x] 1.3 Implement requested, provisioning, ready, working, operating, validating, reconnecting, stopping, expired, failed, and cleaned XState states.
- [x] 1.4 Persist resumable public progress while excluding connection tickets, credentials, private validators, and solutions.
- [x] 1.5 Add provisioning timeout, TTL polling, online-only behavior, restart reconnect, bounded attempts, progressive hints, and idempotent cleanup.

## 2. Control-plane authority

- [x] 2.1 Define provider-neutral definition, entitlement, quota, session store, sandbox provider, and audit interfaces.
- [x] 2.2 Enforce authentication, entitlement, concurrency, duration, cost reservation, session ownership, TTL, and validation attempts server-side.
- [x] 2.3 Keep validators private and validate observable provider workspace state using closed typed operations rather than shell input.
- [x] 2.4 Add idempotent validation attempt IDs, deterministic validation, sanitized audit metadata, teardown compensation, and expired-session sweep logic.
- [x] 2.5 Add strict sanitized HTTP handlers for provision, status, operate, validate, and stop.

## 3. Controlled implementation lab

- [x] 3.1 Add one immutable Bedrock request-reliability fixture with starter content, instructions, hints, validation, and debrief.
- [x] 3.2 Add a controlled in-memory sandbox provider that executes no learner code and proves deterministic remote state validation.
- [x] 3.3 Add keyboard-operable desktop lifecycle and workspace UI with status, TTL, reconnect, validation feedback, and explicit stop.
- [x] 3.4 Store desktop connection tickets only through OS secure storage and clear them on stop or sign-out.
- [x] 3.5 Add a browser transport adapter using the same shared LabPort contract.

## 4. Validation

- [x] 4.1 Strict TypeScript and diagnostics pass.
- [x] 4.2 Existing 39 project tests pass.
- [x] 4.3 Lifecycle smoke verifies auth ordering, hidden validators, deterministic failure/pass, retry idempotency, reconnect status, and cleanup.
- [x] 4.4 Desktop and web production builds pass.
- [x] 4.5 Cargo check and Tauri release build pass.
- [ ] 4.6 Select and deploy a real isolated container runtime, durable stores, browser terminal/editor transport, and independently scheduled sweeper.
- [ ] 4.7 Measure startup/cleanup reliability, TTL enforcement, reconnect behavior, failure compensation, quotas, spend, and orphan count in deployment.
- [ ] 4.8 Run security, privacy, accessibility, support, and pilot-learner validation.
- [ ] 4.9 Produce and review the six-to-ten lab library; production content remains a Phase 8 dependency.

## Exit status

The provider-neutral Phase 6 foundation and one controlled implementation fixture are locally complete. Clients cannot provision directly, inspect validators, or award completion. A deployed isolated sandbox runtime, durable control-plane adapters, terminal/editor protocol, independent sweeper, reliability measurements, pilot evidence, and reviewed production lab library remain required before Phase 6 product exit criteria are met.
