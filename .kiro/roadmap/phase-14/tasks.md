# Phase 14 Tasks

Status: local compatibility and simulator-canary foundation complete; deployed canary operations pending

- [x] Design and migrate validation outcome, evidence, provenance, compatibility, and health schemas.
- [x] Define safe one-way migration from current boolean `LabValidation` and legacy lab evidence contracts.
- [x] Version validator bundles and pin validator, compatibility, mapping, template, region, and adapter versions to active sessions.
- [x] Build compatibility registry and six pre-provision capability probes.
- [x] Implement known-good, known-bad, and deliberately unsupported fixtures for Bedrock, IAM, sandbox lifecycle, and cleanup.
- [x] Implement canary machine for the deterministic simulator and controlled adapter boundary.
- [x] Add reconciliation, divergence, stale-health, durable disabled, retry, incident, and controlled recovery states.
- [x] Ensure inconclusive attempts preserve work and do not consume learner attempt quota.
- [x] Connect withdrawn validators to readiness recomputation through a non-mutating projection.
- [x] Exercise stale-health blocking, provider-health isolation, false-pass detection, false-fail detection, unsupported false-pass detection, durable disable, and recovery locally.
- [ ] Deploy scheduled managed-AWS canaries, alert delivery, dashboards, and operator response exercises.

## Verification

- `getDiagnostics`: no issues in changed domain, content, evaluation, control-plane, machine, UI, or transport files.
- Validator matrix: 12 fixtures passed across Bedrock, IAM, sandbox lifecycle, and cleanup.
- Divergence checks: known-good failure, known-bad false pass, and unsupported false pass opened correctly classified incidents.
- Compatibility checks: stale health blocked before quota reservation or provisioning; simulator health could not authorize the controlled-sandbox adapter.
- Session check: validator bundle and compatibility provenance remained pinned for the session.
- Inconclusive checks: server and client preserved learner attempt quota and exposed explicit retry states.
- Readiness check: withdrawn validator versions were excluded only during projection; historical events remained unchanged.
- `npm run typecheck`, `npm test`, `npm run web:build`, `npm run desktop:build`, `cargo check`, and `npm run tauri:build`: passed.
- OpenAPI route/reference and runtime-example checks: passed.
- Boundary scan: no AWS SDK, network client, static credentials, live adapter, or historical-evidence mutation in Phase 14 files.

## Pending deployed completion

No scheduled live canaries, managed AWS adapter, alert transport, operator dashboard, or incident exercise was deployed. Live-provider health must remain independent from simulator and controlled-sandbox health.
