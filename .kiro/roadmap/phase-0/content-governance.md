# Content Governance Proposal

Status: draft; owners and targets require approval

## Required roles

- Product owner: approves audience, course boundary, readiness claims, and release.
- Curriculum owner: owns skill coverage, sequencing, evidence policy, and freshness.
- Subject-matter reviewer: verifies technical accuracy and official-scope traceability.
- Instructional reviewer: verifies learning design, rubric quality, and learner burden.
- Accessibility reviewer: checks content structure and interaction alternatives.
- Operations owner: coordinates corrections, releases, rollback, and learner notices.

One person may fill multiple roles, but author and final technical reviewer should differ for scored or lab content.

## Course version record

Every release records course ID and version, source references and retrieval dates, mapped skills, content and rubric versions, validator versions, authors and reviewers, release date, next review date, known limitations, and superseded version.

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

`reported -> triaged -> investigating -> correcting -> reviewing -> released -> closed`

A report can enter `rejected` with a recorded reason or `blocked` with an owner and follow-up date. Critical issues can transition directly from `triaged` to `unpublished` before correction.

## Release gate

No content version releases without source traceability, technical review, instructional review, applicable accessibility review, passing deterministic validators, correction ownership, expiration or next-review date, and a rollback path.

## Prohibited sources and claims

Do not use exam dumps, recalled live questions, copied proprietary questions, or material with unclear reuse rights. Do not imply AWS endorsement or guarantee certification. Original questions may emulate assessed capabilities and pacing without reproducing protected content.