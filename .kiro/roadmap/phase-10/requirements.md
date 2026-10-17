# Phase 10 Requirements

Status: portable UI and full-web composition locally complete; deployed parity and mobile research pending
Last reviewed: 2026-10-17

## R1: Full web client

1. Web reuses shared domain, content, evaluation, XState, and genuinely portable presentation packages without importing desktop or Tauri code.
2. Browser storage, authentication, networking, connectivity, service workers, and URL history remain in the web composition root.
3. Workflow state survives reloads through versioned IndexedDB data and synchronizes through server-authoritative, idempotent event contracts.
4. Deep links address every workspace view and individual lessons; browser back and forward restore presentation state safely.
5. Browser sessions use secure HttpOnly-cookie-oriented, same-origin requests; credentials never enter browser JavaScript storage.
6. Offline app-shell behavior never caches privileged API, authentication, synchronization, lab, privacy, support, or analytics responses.

## R2: Behavioral parity

1. Desktop and web render the same supported learning workflows through a shared runtime-injected workspace.
2. Both platforms expose loading, failure, degraded, retry, offline, conflict, and completion states defined by shared machines.
3. Platform-specific interaction differences remain adapters or composition choices rather than hidden domain rules.
4. Production parity requires behavioral contract tests against the same deployed services and supported browser matrix.

## R3: Mobile discovery before implementation

1. No mobile framework is selected and no mobile app is scaffolded before representative learner research.
2. The decision records observed mobile-screen use, short-session demand, workflow demand, accessibility, distribution, capability, and team cost.
3. Review, short grills, content reading, and readiness are candidate workflows; terminal-heavy labs are excluded unless research provides contrary evidence.
4. The selected workflows must improve retention or convenience in testing without introducing platform imports into shared packages.
