# Phase 15 Tasks

Status: controlled local companion foundation complete; real managed AWS deployment and security approval pending

- [ ] Select and approve managed AWS account-isolation model and ownership.
- [ ] Select and approve the real federation/console-session mechanism, revocation model, and session duration.
- [x] Extend OpenAPI with one-time console launch, restore, status, validation, budget, revoke, and launch-failure cleanup contracts.
- [x] Implement server-side controlled console launch service with concurrency limits, three-launch rate limit, audit, and no raw credential response fields.
- [x] Connect launch eligibility to identity, lab ownership, entitlement, policy, managed-provider compatibility health, validator bundle, region, duration, and spend ceiling.
- [x] Implement companion guidance state, separate-window launch, metadata-only reconnect, expiration, validation, polling, and explicit stop.
- [x] Implement a controlled managed-provider boundary for one Bedrock scenario and private observable-state validation. No real AWS provider was implemented.
- [x] Revoke console access before resource cleanup on stop, expiry, sign-out composition, lab teardown, health disablement/drift/staleness, budget exhaustion, and launch-open failure.
- [x] Add independent partial-cleanup, expiry, unhealthy-session, and orphan-handle sweep behavior.
- [x] Exercise controlled cross-tenant, entitlement, policy, launch TTL, rate, duration, health, budget, cleanup-order, orphan, credential-field, and snapshot-hygiene boundaries.
- [ ] Run deployed privilege, cross-tenant, region, service, action, resource, tag, cost, duration, concurrency, credential-leak, and penetration testing.
- [ ] Compare simulation-only, companion-guided console, and reduced-guidance challenge with representative learners.

## Verification

- Managed service lifecycle: one-time HTTPS launch, metadata-only restore, managed-provider validation, bounded relaunch, revocation, and cleanup passed.
- Client machine: launch URL remained inside one async actor, never entered context/snapshots, opened once externally, and launch-open failure revoked by lab ownership.
- Security policy checks: entitlement failed before allocation, cross-tenant lookup returned not found, invalid launch TTL failed closed, and health disablement returned inconclusive after revocation.
- Cleanup checks: access revocation preceded resource cleanup; sign-out cleanup composed managed and restricted AWS revokers; lab stop ordered managed console, restricted AWS, then sandbox cleanup; orphan and partial cleanup were sweepable.
- Budget check: server-observed exhaustion revoked access and cleaned resources.
- `getDiagnostics`, `npm run typecheck`, `npm test`, `npm run web:build`, `npm run desktop:build`, `cargo check`, and `npm run tauri:build`: passed.
- OpenAPI: 35 operations and 17 runtime examples passed route/reference checks.
- Boundary scan: no AWS SDK, raw AWS credential fields, account identifiers, or provider handles in public/shared managed-console contracts or snapshots.

## Pending deployed completion

No AWS account was allocated, no federation mechanism was selected, no AWS credentials or console URL were issued, no real AWS API was called, and no production infrastructure was changed. The controlled launch uses the reserved `console.invalid` origin. Real deployment remains high risk and requires explicit infrastructure, security, legal/AWS-usage, operations, and account-ownership approval.
