# Phase 7 Tasks

Status: restricted-operation broker and credential lifecycle locally complete; AWS deployment and production-like labs pending
Last updated: 2026-10-17

## 1. Restricted AWS contracts

- [x] 1.1 Define runtime-validated policy, public credential lease, operation, receipt, and audit contracts.
- [x] 1.2 Keep account assignment, role configuration, provider handles, credentials, and cleanup authority in private control-plane contracts.
- [x] 1.3 Model region, service, action, resource prefix, required tags, duration, and spend ceilings explicitly.
- [x] 1.4 Support dedicated-account-per-session and shared-account tag-isolation contract values without selecting a production model prematurely.

## 2. Credential and operation lifecycle

- [x] 2.1 Implement checking, idle, requesting, active, executing, reconnecting, revoking, revoked, expired, and failed XState states.
- [x] 2.2 Persist only public lease metadata and sanitized operation receipts; restore always revalidates with the server.
- [x] 2.3 Force remote revocation on expiry, spend exhaustion, explicit stop, parent lab teardown, and account sign-out.
- [x] 2.4 Remove local lease metadata after revocation and reject privileged operations while offline.

## 3. Server authority

- [x] 3.1 Authenticate and verify active parent-lab ownership and restricted-lab entitlement before issuing a lease.
- [x] 3.2 Broker operations server-side so AWS credentials never cross the control-plane boundary.
- [x] 3.3 Enforce every policy dimension before provider execution and return sanitized receipts only.
- [x] 3.4 Add atomic concurrent lease issuance, operation idempotency, spend reservation, completion, and revocation contracts.
- [x] 3.5 Add expiry and orphan-provider-handle sweep behavior.
- [x] 3.6 Add strict sanitized HTTP handlers for restore, issue, execute, and revoke.
- [x] 3.7 Add a controlled restricted-AWS provider and Bedrock policy fixture that issue no real credentials or AWS requests.

## 4. Client composition

- [x] 4.1 Nest restricted AWS access under an active parent lab session.
- [x] 4.2 Show region, lease duration, remaining spend, operation receipt, offline state, and explicit revocation.
- [x] 4.3 Use a fixed policy-constrained Bedrock operation descriptor rather than arbitrary SDK or shell input.
- [x] 4.4 Add desktop and web adapters using the same secret-free broker port.

## 5. Validation

- [x] 5.1 Strict TypeScript and diagnostics pass.
- [x] 5.2 Existing 39 project tests pass.
- [x] 5.3 Broker smoke verifies exact-policy acceptance; region, service/action, resource, tag, and spend denial; idempotency; and post-revocation denial.
- [x] 5.4 Concurrency smoke verifies single lease issuance and atomic spend reservation.
- [x] 5.5 Cleanup smoke verifies parent teardown, account sign-out, expiry, and orphan-handle revocation.
- [x] 5.6 Credential-machine smoke verifies snapshots contain no credential-shaped fields and forced revocation clears local metadata.
- [x] 5.7 Desktop/web builds, Cargo check, and Tauri release build pass.
- [ ] 5.8 Select and approve the production AWS account-isolation, credential-vending, revocation, budget, audit, and resource-inventory architecture.
- [ ] 5.9 Deploy and validate real STS/IAM boundaries, CloudTrail, spend enforcement, teardown, and independent sweeping.
- [ ] 5.10 Perform penetration, cross-tenant, privilege-escalation, regional, service, resource, tag, duration, concurrency, and budget testing.
- [ ] 5.11 Build the guided Bedrock integration and troubleshooting/RAG labs against real restricted AWS environments.
- [ ] 5.12 Run reliability, cleanup, cost-accuracy, accessibility, support, and controlled learner-pilot studies.

## Exit status

The restricted-operation broker, credential lifecycle, cleanup hooks, and controlled policy fixture are locally complete. No AWS credentials are issued or stored by this implementation, and no AWS infrastructure was changed. Phase 7 product exit criteria remain unmet until a reviewed isolation model and deployed AWS controls pass security, reliability, cost, cleanup, and learner validation with two production-like labs.
