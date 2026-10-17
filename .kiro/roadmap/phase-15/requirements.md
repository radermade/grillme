# Phase 15 Requirements

Status: planned; high-risk deployment requires explicit infrastructure and security approval

## R1: Managed console companion

1. Learners never paste AWS access keys, secret keys, session tokens, or permanent credentials into settings.
2. The control plane allocates an isolated managed environment after identity, entitlement, quota, policy, compatibility-health, duration, and budget checks.
3. A browser may receive a one-time, short-lived, policy-restricted console federation URL, but never raw AWS credentials.
4. Console sessions open in a separate trusted browser context; embedding the AWS Console is not assumed.
5. Server-side validation, audit, budgets, revocation, TTL, and cleanup remain authoritative.

## R2: Guidance and sandbox integration

1. Grill Me remains the companion guidance pane while the learner operates the real console.
2. The same semantic scenario intent runs against simulator, disposable sandbox, or managed AWS provider adapters.
3. Validation inspects observable resources and behavior through private server APIs, not click history.
4. Stop, expiration, sign-out, validator disablement, or budget exhaustion revoke console access before cleanup.

## Exit criteria

A controlled Bedrock pilot can launch a managed console session, complete a guided checkpoint, reconnect safely, validate observable resource state, revoke access, and clean all resources without exposing credentials. Security testing confirms region, service, action, resource, tag, duration, concurrency, and spend boundaries.
