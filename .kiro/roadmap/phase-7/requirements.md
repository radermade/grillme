# Phase 7 Requirements

Status: restricted-operation broker and credential lifecycle locally complete; AWS deployment and production-like labs pending
Last reviewed: 2026-10-17

## R1: Restricted AWS execution

1. Clients never receive AWS access keys, secret keys, session tokens, role ARNs, account IDs, or provider handles.
2. The control plane authenticates the learner and verifies lab ownership, entitlement, quota, policy version, and active TTL before creating a credential lease.
3. Every operation is independently constrained by region, service, action, resource prefix, required tags, time, idempotency, and spend ceiling.
4. Credential/provider state is revocable and expires independently of client state.

## R2: Credential lifecycle

1. An explicit machine models checking, idle, requesting, active, executing, reconnecting, revoking, revoked, expired, and failed states.
2. Machine context contains only public lease metadata and operation receipts; it never persists credentials or provider references.
3. Stop, sign-out, lab expiry, cost exhaustion, and policy failure deny further privileged operations.

## R3: Cleanup and audit

1. Teardown revokes credential leases before resource cleanup.
2. An independent sweep expires stale leases and revokes provider-side orphans not represented by active control-plane records.
3. Audit events record identifiers, policy decision, outcome, cost, and timing without request payloads, credentials, learner content, or provider errors.
