# Phase 1 Tasks

Status: locally complete; external distribution and human-review gates pending  
Last updated: 2026-10-16

## 1. Desktop composition root

- [x] 1.1 Configure root npm workspaces and strict TypeScript.
- [x] 1.2 Scaffold React/Vite desktop UI under `apps/desktop`.
- [x] 1.3 Scaffold root `src-tauri` with aligned, pinned Tauri 2 crates.
- [x] 1.4 Restrict Tauri capabilities and expose only read-only, sanitized app metadata IPC.
- [x] 1.4a Open course sources through a validated HTTPS-only system-browser adapter and scoped opener capability.
- [x] 1.5 Implement and use application bootstrap/update lifecycle states.
- [x] 1.6 Add a top-level render recovery boundary that preserves saved progress and exposes a restart action.

## 2. Portable contracts

- [x] 2.1 Define course, progress, evidence, and sanitized error contracts.
- [x] 2.2 Define versioned runtime content schemas and safe parser.
- [x] 2.3 Define storage, secure storage, network, connectivity, telemetry, clock, ID, lifecycle, update, and navigation interfaces.
- [x] 2.4 Implement injected course-session XState machine.
- [x] 2.5 Verify shared packages contain no Tauri, React, DOM, or browser-storage imports.

## 3. Versioned course reader

- [x] 3.1 Add one bundled AIP-C01 sample course independent of application logic.
- [x] 3.2 Render text, code, callout, and accessible diagram blocks without raw HTML.
- [x] 3.3 Implement module/lesson navigation, keyboard access, and lesson focus management.
- [x] 3.4 Save and resume lesson position through an injected storage adapter.
- [x] 3.5 Record append-only local lesson completion evidence.
- [x] 3.6 Present loading, saving, degraded, retry, empty, and failed states.
- [x] 3.7 Add reduced-motion, increased-contrast, forced-colors, non-color completion labels, and visible focus behavior.

## 4. Validation

- [x] 4.1 Diagnostics and strict TypeScript checks pass.
- [x] 4.2 Production desktop frontend build passes.
- [x] 4.3 Five shared content and machine tests pass, including unsafe content rejection, resume, evidence, degraded saves, invalid content, and retryable sanitized startup failure.
- [x] 4.4 `cargo check` passes for the Tauri host.
- [x] 4.5 Tauri release binary builds without bundling at `src-tauri/target/release/grillme`.
- [x] 4.6 Configure platform-selected bundle targets, macOS app/DMG commands, Windows MSI/NSIS commands, and project-owned platform icon assets.
  - Unsigned macOS `.app` and `.dmg` build successfully; plist and DMG checksum validate; packaged app smoke-launches.
- [ ] 4.7 Sign and notarize macOS artifacts and sign Windows installers before distribution.
  - Blocked: this Mac has no valid code-signing identity. See [`release-checklist.md`](release-checklist.md).
- [ ] 4.8 Manually verify keyboard, zoom, screen reader, reduced motion, and contrast behavior.
  - Procedure: [`release-checklist.md`](release-checklist.md).

## Exit status

The runnable Phase 1 engineering slice and unsigned macOS installer configuration are complete. Customer distribution remains blocked on organization-owned signing credentials, notarization, Windows packaging, and manual accessibility review.