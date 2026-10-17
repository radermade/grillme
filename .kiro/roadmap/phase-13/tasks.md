# Phase 13 Tasks

Status: local controlled foundation complete; external approvals and real automation blocked

- [ ] Obtain legal/terms, security, privacy, and AWS account-use approval.
- [ ] Assign accountable human owners for real canary credentials, crawler incidents, data retention, and content review.
- [x] Define allowlisted journey, observation, drift, review, and mapping-release schemas.
- [ ] Provision dedicated canary accounts with least privilege, budgets, tags, TTLs, and no customer data.
- [ ] Implement real temporary workload identity. The local contract and controlled provider enforce bounded, revocable grants only.
- [x] Implement fail-closed origin, route, page, duration, cost, and capture-field limits in the control plane.
- [ ] Implement real semantic landmark, visible-label, route, and optional encrypted screenshot capture. Controlled fixture capture and mandatory redaction are implemented locally.
- [x] Implement deterministic landmark, label, route, screenshot, and suspected-drift severity rules.
- [x] Build human triage, accept/reject, stale-guidance, disable-new-session, and dual-approved mapping-release workflow.
- [x] Seed controlled label changes and verify detection, redaction, identity revocation, retention, and cleanup behavior.
- [ ] Establish and deploy schedules based on service risk, release signals, and recent drift frequency.

## Verification

- `getDiagnostics`: no issues in Phase 13 domain, schemas, service, machine, or controlled fixture.
- Controlled lifecycle: seeded drift reached human review, redacted a synthetic account ID, revoked identity before review, exposed reviewed stale-guidance state, required content and regression approvals, released a new mapping candidate, and cleaned retained state.
- Policy smoke check: missing approvals, route escape, and cost overflow failed closed.
- `npm run typecheck`: passed.
- `npm test`: passed, including OpenAPI checks and all existing suites.
- `npm run web:build` and `npm run desktop:build`: passed.
- Boundary scan: no network clients, browser automation, AWS SDKs, static keys, or learner-client integration in Phase 13 files.

## Blocked production work

No AWS console crawling, AWS account provisioning, workload federation, browser automation, screenshots, deployed scheduling, or production publication was performed. Those actions require the unchecked legal, security, privacy, AWS-usage, ownership, and infrastructure approvals.
