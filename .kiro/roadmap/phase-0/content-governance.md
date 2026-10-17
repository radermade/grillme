# Content Governance Proposal

Status: draft; owners and targets require approval

## Required roles

- Product owner: approves audience, course boundary, readiness claims, and release.
- Curriculum owner: owns skill coverage, sequencing, evidence policy, and freshness.
- Subject-matter reviewer: verifies technical accuracy and official-scope traceability.
- Instructional reviewer: verifies learning design, rubric quality, and learner burden.
- Accessibility reviewer: checks content structure and interaction alternatives.
- Operations owner: coordinates corrections, releases, rollback, and learner notices.
- Console compatibility owner: owns allowlisted canary journeys, presentation mappings, verification freshness, and crawler incidents.
- Validator owner: owns compatibility records, known-good/known-bad canaries, inconclusive policy, and validator withdrawal.
- Security owner: approves canary accounts, workload identity, federation sessions, observation retention, and managed AWS boundaries.

One person may fill multiple roles, but author and final technical reviewer should differ for scored or lab content.

## Course version record

Every release records course ID and version, source references and retrieval dates, mapped skills, content and rubric versions, validator versions, authors and reviewers, release date, next review date, known limitations, and superseded version.

Console-guided content also records learning-invariant version, AWS semantic-mapping version, presentation-mapping version, supported regions, last console-canary verification, affected journey IDs, and known UI differences. Lab releases record environment-template, provider-adapter, compatibility, and validator-bundle versions plus latest known-good and known-bad canary results.

Historical evidence remains linked to the version under which it was earned. Corrections do not silently rewrite prior evidence.

## Proposed review cadence

- Review official certification sources monthly for scope or retirement changes.
- Review model, service, SDK, security, and pricing-sensitive material at least quarterly.
- Review stable conceptual material at least every six months.
- Review immediately after an official guide change, material service change, validated learner report, or security issue.

## Correction severity

- Critical: unsafe instructions, exposed secrets, broken isolation, or materially wrong authoritative scoring. Unpublish immediately; target triage within 4 hours.
- High: incorrect technical guidance or validator behavior affecting completion. Target triage within 1 business day.
- Normal: ambiguity, stale detail, typo, or non-blocking accessibility issue. Target triage within 3 business days.

These are proposals until an operations owner confirms support capacity.

## Correction workflow

`reported -> triaged -> investigating -> mitigating -> correcting -> reviewing -> canary-validation -> staged -> released -> closed`

A report can enter `rejected` with a recorded reason or `blocked` with an owner and follow-up date. Critical issues can transition directly from `triaged` to `unpublished` before correction. Console crawler output, validator canaries, and learner reports create evidence for a case but cannot publish changes. High-risk mapping and validator updates require distinct author and reviewer identities.

## Release gate

No content version releases without source traceability, technical review, instructional review, applicable accessibility review, passing deterministic validators, correction ownership, expiration or next-review date, and a rollback path.

Console-guided releases additionally require a fresh reviewed console-canary baseline. Scored lab releases require a healthy compatibility record, known-good pass, known-bad rejection, and an approved inconclusive policy. Suspected drift, stale health, or disabled validators block new affected sessions unless a reviewed degraded mode explicitly removes authoritative scoring.

## Prohibited sources and claims

Do not use exam dumps, recalled live questions, copied proprietary questions, or material with unclear reuse rights. Do not imply AWS endorsement or guarantee certification. Original questions may emulate assessed capabilities and pacing without reproducing protected content.