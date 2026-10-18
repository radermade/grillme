# Phase 16 Tasks

Status: controlled local drift-operations and authoring foundation complete; deployed operations approval pending

- [x] Define unified drift case, affected-version, mitigation, review, release, rollback, and append-only event contracts.
- [x] Add source adapters for console crawler suspicions, validator canary incidents, official source changes, provider incidents, and privacy-minimized learner reports.
- [x] Implement the drift case XState coordinator and server-enforced role-separated approval rules.
- [x] Add safe learner states for stale guidance, inconclusive validation, disabled provisioning, active-session continuation, and privacy-minimized notices.
- [x] Build internal mapping/compatibility authoring with version history and forward-only reversible changes. Private validator checks and fixtures cannot be edited through this tool.
- [x] Require persisted simulator and controlled-sandbox canary evidence, plus applicable managed-provider evidence, before staged release.
- [x] Implement mapping/compatibility rollback without rewriting historical evidence or case events.
- [x] Run seeded end-to-end console drift and validator drift incident exercises through triage, mitigation, authoring, separate reviews, canaries, release, rollback, closure, and audit.
- [x] Exercise idempotent source ingestion, author/reviewer separation, dual-role review rejection, private-validator edit rejection, failed-canary blocking, active-session pinning, and mitigation clearing.
- [ ] Approve operational ownership, response targets, retention, audit access, alert transport, and production role assignments.
- [ ] Connect scheduled live canaries and deployed operator interfaces after Phase 13-15 approvals.

## Verification

- Seeded workflow completed detection, triage, critical mitigation, reviewed proposal, canary gate, release, rollback, closure, active-session pinning, mitigation clearing, and matching append-only audit history.
- Governance guard exercise confirmed duplicate source events reuse the existing case; authors cannot self-review; one dual-role identity cannot satisfy both reviews; private validator checks/fixtures cannot be edited; failed canaries block release.
- Learner mitigation projection returns only status, notice, and timestamp, excluding internal source evidence and authoring details.
- `getDiagnostics`, `npm run typecheck`, `npm test`, `npm run web:build`, `npm run desktop:build`, `cargo check`, and `npm run tauri:build`: passed.
- OpenAPI remained valid at 35 operations with 17 runtime examples; Phase 16 operator authoring remains server-only in this foundation.
- Boundary scan found no AWS SDK, network client, credential fields, learner answers, learner UI dependency, or direct crawler/canary publication path in Phase 16 files.

## Pending deployed completion

The local stores, roles, canary runner, mitigation controller, and artifact repository are controlled fixtures. No production operator UI, durable database, alert channel, scheduled live canary, source webhook, production role provider, or real content deployment was introduced.
