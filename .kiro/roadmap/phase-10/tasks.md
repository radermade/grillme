# Phase 10 Tasks

Status: portable UI and full-web composition locally complete; deployed parity and mobile research pending
Last updated: 2026-10-17

## 1. Portable presentation and content

- [x] 1.1 Extract genuinely portable React views into `packages/ui` behind an injected runtime contract.
- [x] 1.2 Move shared course, assessment, grill, scenario, lab, mock, readiness, governance, release, and requirements fixtures into `packages/content/fixtures`.
- [x] 1.3 Keep desktop and web as separate composition roots with platform-specific adapters.
- [x] 1.4 Keep Tauri, desktop source, IndexedDB, and browser storage APIs out of shared domain, content, machine, evaluation, and UI package dependencies.
- [x] 1.5 Render course, baseline, grill, training, lab, readiness, mock, review, and settings workflows through the same shared workspace.

## 2. Full web foundation

- [x] 2.1 Implement browser adapters for authentication, synchronization, evaluation dependencies, labs, restricted operations, analytics, privacy, entitlements, releases, support, content reports, and external navigation.
- [x] 2.2 Use same-origin HttpOnly-cookie-oriented requests with redirect errors and no-referrer behavior.
- [x] 2.3 Keep access and refresh tokens out of browser JavaScript storage.
- [x] 2.4 Replace localStorage workflow persistence with IndexedDB and atomic idempotent append transactions.
- [x] 2.5 Add URL routes for every workspace view and lesson deep links with browser back/forward support.
- [x] 2.6 Clear authorization callback parameters after adapter consumption.
- [x] 2.7 Add a same-origin app-shell service worker that bypasses authentication, sync, lab, operations, content-report, and API requests.
- [x] 2.8 Add a restrictive browser CSP baseline, skip navigation, focus restoration, reduced-motion behavior, forced-colors behavior, and responsive layout.
- [x] 2.9 Split stable React/XState and validation dependencies into bounded web and desktop production chunks.

## 3. Cross-platform state and continuation

- [x] 3.1 Use one explicit workspace state machine with complete navigation from every state.
- [x] 3.2 Add optional initial lesson selection to the portable course machine for deep-link restoration.
- [x] 3.3 Reuse versioned progress keys, pending sync queues, idempotency keys, and server-authoritative summaries across desktop and web.
- [x] 3.4 Keep labs and privileged operations explicitly online-only while preserving offline-capable local learning workflows.

## 4. Mobile discovery gate

- [x] 4.1 Define runtime-validated mobile workflow observations and candidate scoring across capability, accessibility, distribution, and team cost.
- [x] 4.2 Implement a deterministic decision gate requiring an adequate cohort, observation period, mobile-screen share, and short-session share.
- [x] 4.3 Exclude terminal-heavy labs from prioritized mobile workflows.
- [x] 4.4 Record the current pre-research decision as `defer`.
- [x] 4.5 Do not create `apps/mobile` or select Tauri mobile, React Native, or PWA without learner evidence and architecture approval.

## 5. Validation

- [x] 5.1 Strict TypeScript and diagnostics pass across shared UI and both app roots.
- [x] 5.2 Existing 39 project tests pass.
- [x] 5.3 Route smoke verifies lesson deep links, workspace routes, safe unknown-route fallback, and the mobile defer gate.
- [x] 5.4 Boundary scans confirm web/shared UI do not import desktop or Tauri code and shared core does not import browser storage APIs.
- [x] 5.5 Web and desktop production builds pass with bounded chunks.
- [x] 5.6 Cargo check and Tauri release build pass after the extraction.
- [ ] 5.7 Deploy the control plane and web host with same-origin routing, SPA fallback rewrites, production CSP headers, secure cookies, CSRF protection, and cache invalidation.
- [ ] 5.8 Run desktop/web behavioral-contract integration tests against deployed identity, sync, evaluation, lab, privacy, support, entitlement, and release services.
- [ ] 5.9 Test current Chrome, Firefox, Safari, and Edge for IndexedDB recovery, service-worker updates, offline reload, deep links, auth callbacks, quota failures, and cross-device continuation.
- [ ] 5.10 Manually verify keyboard, zoom, screen readers, reduced motion, contrast, forced colors, responsive layouts, and browser error announcements.
- [ ] 5.11 Recruit representative phone/tablet learners, observe real workflow demand, and record retention or convenience outcomes.
- [ ] 5.12 Approve a mobile architecture decision or explicitly continue deferral; build only the validated mobile-specific workflows.

## Exit status

The portable UI package and full-web composition are locally complete. Desktop and web now share content, presentation, domain rules, schemas, and XState workflows while retaining platform-specific adapters. Phase 10 product exit criteria remain unmet until deployed-service parity, production web hosting/security configuration, browser and accessibility validation, cross-device testing, and mobile workflow research produce an approved implementation or deferral decision.
