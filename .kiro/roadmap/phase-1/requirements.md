# Phase 1 Requirements

Status: implementation in progress  
Last reviewed: 2026-10-16

## R1: Desktop product shell

The repository must produce a Tauri 2 desktop application from root-level source and configuration.

Acceptance criteria:

1. The desktop UI lives in `apps/desktop` and Rust code in root `src-tauri`.
2. Development and production builds use pinned, reproducible dependencies.
3. Tauri capabilities and IPC are least-privileged.
4. Startup failures are sanitized and visible rather than producing a blank screen.

## R2: Portable shared core

Course types, schemas, state machines, and platform interfaces must remain independent of Tauri and browser globals.

Acceptance criteria:

1. Shared packages import no Tauri, React, DOM, or mobile SDK APIs.
2. Platform behavior is injected through interfaces at the desktop composition root.
3. Shared package behavior can be typechecked and tested without starting Tauri.

## R3: Versioned course content

The app must load a bundled, course-agnostic course document through runtime validation.

Acceptance criteria:

1. Course, module, lesson, activity, source, and content-block metadata are versioned.
2. Text, code, callout, and accessible diagram blocks are supported without raw HTML.
3. Invalid or oversized content fails safely with actionable, sanitized feedback.
4. AIP-C01 data contains no application-specific branching.