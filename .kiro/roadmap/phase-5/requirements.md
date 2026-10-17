# Phase 5 Requirements

Status: provider-neutral engineering core locally complete; deployment and external validation pending
Last reviewed: 2026-10-17

## R1: Identity and entitlements

1. Browser sign-in uses short-lived access tokens and rotated refresh tokens.
2. Desktop refresh tokens exist only in OS secure storage; tokens never enter machine context, ordinary storage, telemetry, or errors.
3. Sign-out, expiry, revocation, interrupted authorization, refresh, and offline grace are explicit states.
4. The control plane derives identity from credentials and enforces course/feature entitlements and release versions.

## R2: Offline-first synchronization

1. Privacy-safe learning evidence is queued locally with stable IDs and idempotency keys.
2. Repeated delivery and restart do not duplicate accepted events.
3. Synchronization exposes loading, idle, pushing, pulling, reconciling, conflict, backoff, offline, degraded, and failed states.
4. Content-version and scored-attempt conflicts are explicit and never use silent last-write-wins.
5. Server summaries derive only from the authoritative accepted event log while local pending evidence remains available.

## R3: Portability

1. Domain and machine packages remain independent of browser, Tauri, and identity providers.
2. Desktop and a minimal web shell compose the same auth and sync machines through platform ports.
