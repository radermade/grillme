# Phase 6 Requirements

Status: provider-neutral foundation and controlled fixture locally complete; deployed sandbox and content validation pending
Last reviewed: 2026-10-17

## R1: Server-authoritative disposable labs

1. Authentication, entitlement, quota, concurrency, duration, cost, provisioning, validation, and teardown are enforced server-side.
2. Clients receive no provisioning authority, permanent credentials, validator definitions, or solutions.
3. Sandbox images are immutable and identified by digest; sessions have hard TTLs and scoped short-lived connection tickets.
4. Cleanup is idempotent and an independent sweep can terminate expired or orphaned sessions.

## R2: Lab lifecycle

1. An explicit machine models requested, provisioning, ready, working, reconnecting, validating, stopping, expired, failed, and cleaned states.
2. Session progress resumes without persisting connection tickets or secrets.
3. Connectivity loss is explicit and online-only operations explain why they are unavailable.
4. Completion depends on observable server-side workspace validation, not client actions.

## R3: Controlled implementation fixture

1. One Bedrock SDK reliability fixture uses a controlled substitute and deterministic server validators.
2. The fixture includes starter files, checkpoints, progressive hints, bounded attempts, and debrief.
3. Audit records contain operation IDs and validation outcomes, never raw commands, file content, credentials, or model output.
