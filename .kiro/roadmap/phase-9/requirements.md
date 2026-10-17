# Phase 9 Requirements

Status: private-beta operations and commercial-control foundations locally complete; real beta and production release pending
Last reviewed: 2026-10-17

## R1: Consent-aware private-beta operations

1. Product analytics are disabled by default and recorded only after explicit consent.
2. Analytics use a closed event and field allowlist with no prompts, responses, diagnoses, credentials, PII, arbitrary strings, or provider output.
3. The control plane derives aggregate activation, return, completion, failure, conflict, support, and cost metrics from retained events.
4. Consent withdrawal stops collection and requests deletion of existing analytics data.

## R2: Entitlements and privacy

1. Billing remains provider-neutral; server-side entitlements control course and feature access.
2. Expired, cancelled, and grace-expired grants deny privileged access.
3. Authenticated export and deletion requests are explicit, idempotent workflows with sanitized receipts.
4. Support snapshots contain allowlisted operational metadata only and never learning content or secrets.

## R3: Release safety

1. Release channels, staged rollout, minimum supported versions, pause, and rollback are server decisions.
2. Stable assignments require signed macOS and Windows artifacts.
3. Clients receive version assignments, not arbitrary download URLs or update commands.
4. Content freshness and platform/connectivity limitations remain visible before commercial release.
