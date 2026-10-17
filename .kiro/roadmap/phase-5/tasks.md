# Phase 5 Tasks

Status: provider-neutral engineering core locally complete; deployment and external validation pending
Last updated: 2026-10-17

## 1. Identity and secure sessions

- [x] 1.1 Define runtime-validated public session and entitlement contracts.
- [x] 1.2 Implement signed-out, authorizing, exchanging, signed-in, refreshing, offline-grace, expired, signing-out, and failed XState states.
- [x] 1.3 Add browser-based PKCE initiation and callback handling through provider-neutral adapters.
- [x] 1.4 Keep access tokens in memory and desktop refresh tokens, PKCE verifiers, and OAuth state in OS secure storage.
- [x] 1.5 Add validated, sanitized Tauri secure-storage commands backed by native keychains.
- [x] 1.6 Add server session exchange, rotation, and revocation contracts plus sanitized HTTP handlers.

## 2. Synchronization and authority

- [x] 2.1 Define privacy-safe versioned sync events, conflicts, push results, and authoritative summaries.
- [x] 2.2 Normalize course, assessment, review, grill, and scenario evidence without raw answers, prompts, diagnoses, or provider output.
- [x] 2.3 Implement loading, idle, persisting, pushing, pulling, reconciling, conflict, backoff, offline, degraded, and failed XState states.
- [x] 2.4 Persist version-scoped pending queues and summaries with idempotent enqueueing and restart recovery.
- [x] 2.5 Enforce authentication, entitlements, course releases, atomic deduplication, and explicit scored-attempt conflicts server-side.
- [x] 2.6 Derive authoritative summaries from accepted server events.

## 3. Platform composition

- [x] 3.1 Add non-blocking desktop account/sync status and explicit conflict resolution.
- [x] 3.2 Add a minimal web shell using the same shared auth and sync machines with HttpOnly-cookie-oriented adapters.
- [x] 3.3 Keep identity provider and durable event storage choices outside shared domain and machine packages.

## 4. Validation

- [x] 4.1 Strict TypeScript and diagnostics pass.
- [x] 4.2 Existing 39 project tests pass.
- [x] 4.3 Desktop and web production builds pass.
- [x] 4.4 Cargo check and Tauri release build pass with native secure storage.
- [x] 4.5 Runtime smoke verifies active-session restore, duplicate delivery, and scored-attempt conflict rejection.
- [ ] 4.6 Select and deploy a concrete OIDC provider, durable atomic event store, entitlement repository, and HTTPS routing.
- [ ] 4.7 Run manual interrupted-sign-in, revocation, offline restart, network-loss, process-termination, and two-device studies against deployment.
- [ ] 4.8 Manually verify keyboard, focus, screen reader, zoom, reduced motion, forced colors, and status announcements.

## Exit status

The provider-neutral Phase 5 engineering core is locally complete. Clients cannot grant entitlements or authoritative scored progress. Production readiness still requires deployed identity and durable server adapters plus manual cross-device, security, privacy, and accessibility validation.
