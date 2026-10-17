# Phase 10 Design

Status: portable UI and full-web composition locally complete; deployed parity and mobile research pending
Last reviewed: 2026-10-17

`packages/ui` contains only portable React presentation over injected runtime ports and shared XState actors. Shared course fixtures live in `packages/content`. Desktop and web composition roots supply storage, authentication, networking, connectivity, labs, analytics, privacy, release, and navigation adapters. Neither application imports the other.

The web client uses IndexedDB for versioned durable data and serializes writes while keeping append deduplication inside one read-write transaction. Browser authentication is same-origin and cookie-oriented; authorization callbacks are bounded, consumed by the adapter, and removed from the URL. The service worker caches only same-origin GET app-shell assets and explicitly bypasses privileged routes.

A workspace navigation adapter maps URL paths to shared workspace events. Lesson paths use `/learn/:lessonId`; unknown paths fall back safely to the course. Desktop injects a no-op URL adapter and retains native navigation behavior.

Mobile remains a research decision. A data contract and deterministic gate compare observed workflow demand and implementation candidates, but no `apps/mobile` scaffold exists. The current pre-research record returns `defer`. Any later client receives its own adapters and interaction design while reusing portable contracts and machines.
