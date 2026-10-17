# Phase 0 Design

Status: proposed; validation and approvals pending  
Last reviewed: 2026-10-16

## Overview

The product is a course-agnostic learning workspace delivered first as a Tauri 2 desktop application. It combines instruction, adaptive grilling, scenarios, implementation, debugging, labs, and spaced review. AIP-C01 is the first course and the source of initial use cases, not a dependency of the shared learning engine.

## Product model

A course version supplies:

- Identity, vendor, credential, locale, prerequisites, and source references.
- Domains and independently measurable skills.
- Lessons and activities mapped to those skills.
- Original prompts, rubrics, validators, hints, and remediation.
- Accepted evidence types, freshness rules, and readiness aggregation.
- Content owners, reviewers, release status, and expiration date.

The shared application owns delivery, workflow transitions, evidence recording, review scheduling, synchronization, and platform integrations.

## Initial learner

The proposed learner is a software or cloud engineer who has substantial production or cloud experience, general AI/ML or data-engineering familiarity, hands-on GenAI experience, and working knowledge of AWS infrastructure, IAM, deployment, observability, and cost fundamentals.

## Initial skill model

| Skill area | Demonstrated outcome | Minimum evidence |
| --- | --- | --- |
| Model selection | Defend a model choice across quality, context, latency, safety, and cost | Scenario and comparative evaluation |
| Bedrock integration | Implement invocation, streaming, and structured failures | Implementation lab |
| Prompt and context design | Construct, test, and revise task-specific context | Free response and experiment |
| Structured output | Validate output and apply bounded recovery | Debugging or implementation lab |
| Retrieval systems | Design and diagnose chunking, indexing, retrieval, reranking, and citations | Scenario and RAG lab |
| Agents and tools | Define contracts, orchestration, permissions, state, and failures | Integration lab and defense |
| Safety and security | Protect data, enforce least privilege, apply guardrails, and test abuse | Threat scenario and configuration check |
| Evaluation | Measure quality, safety, robustness, grounding, and regressions | Evaluation plan and results |
| Operations | Instrument, optimize, deploy, and troubleshoot production behavior | Operational scenario and lab |
| Governance | Explain provenance, retention, auditability, and policy constraints | Written scenario defense |

The full course skill map must be traced to the current official guide during subject-matter review.

## Evidence policy

- Highest readiness cannot come from multiple-choice evidence alone.
- High-impact skills require recent evidence from at least two activity types.
- Confidence is recorded but never treated as mastery.
- Evidence retains course, rubric, validator, hint, retry, and content-version provenance.
- Historical events are immutable; new scoring rules derive new summaries.

## Learning-loop prototype

Use a provider-neutral structured-output exercise framed through Amazon Bedrock. The learner repairs a TypeScript function that validates model output and applies bounded recovery without using a live AWS account.

The 25-to-35-minute flow is:

1. Baseline explanation and confidence rating.
2. Five-minute focused lesson.
3. Two free-response questions and one gap-driven follow-up.
4. Constraint-based architecture scenario and defense.
5. Implementation repair.
6. Deterministic checks for valid, malformed, repeatedly invalid, and unsafe output.
7. Final explanation and reflection.
8. Evidence-linked review recommendation.

The behavioral state model is:

`intro -> baseline -> teaching -> grilling -> scenario -> implementing -> validating -> reflecting -> complete`

Activities may enter `paused`, `abandoned`, or `failed`. Grilling may enter `hinting`; failed validation returns to `implementing`. This becomes an XState machine during implementation.

### Prototype rubric

Score each dimension from 0 to 3:

- Output handling: absent; parse-only; validation and errors; bounded recovery with explicit terminal failure.
- Safety: absent; generic mention; unsafe-output recognition; concrete controls and escalation.
- Operations: absent; logs only; useful metrics; connection between observability, retries, latency, cost, and diagnosis.
- Trade-offs: unsupported; one factor; multiple constraints; defended choice with conditions for change.

A facilitator records observable evidence rather than inferred intent.

### Research method

Run the same materials, script, hints, and rubric with at least five representative learners. Use participant IDs, obtain consent, and collect only baseline/final rubric results, confidence, misconceptions, scenario constraints, validator outcomes, hints, timing, abandonment, and participant feedback. Apply the success thresholds in requirements R6 before reviewing results.

## Architecture decisions

### Course-agnostic core

Use `Course`, `CourseVersion`, `Skill`, `Activity`, `Rubric`, `LabDefinition`, `LearningEvent`, and `ReadinessRule` as domain concepts. Vendor-specific services remain in content and server-side provider adapters.

### Portable vertical monorepo

Start with a Tauri 2 desktop composition root and only the shared TypeScript packages needed by implemented workflows. Domain and machine packages cannot import Tauri, DOM globals, or mobile SDKs. Add a web composition root as a portability proof after synchronization; choose mobile technology after workflow research.

### Statecharts

Use XState actors for workflows with meaningful lifecycle, concurrency, retries, timeouts, or cancellation. Authentication, course sessions, assessments, grills, synchronization, labs, and updates use typed events and named states. Persist only versioned, migratable, secret-free snapshots when resumption requires them.

### Untrusted clients and remote authority

Clients can provide provisional local behavior but cannot grant access or authoritatively award completion. A remote control plane owns identity, entitlements, final evidence acceptance, content releases, model evaluation, lab provisioning, temporary credentials, and authoritative validation.

### Event-based progress

Record appendable learning events with stable IDs, schema version, course version, timestamp, device ID, and idempotency key. Server-derived summaries are projections. Conflicting scored attempts require explicit reconciliation rather than silent last-write-wins behavior.

### Generic lab lifecycle

Define provider-neutral operations for request, provision, connect, validate, stop, expire, and clean. Sandbox and AWS providers remain server-side and satisfy the same TTL, quota, audit, validation, and cleanup contract.

## Platform capability contracts

Slice 1.1 defines interfaces for versioned storage, secure secret storage, HTTP transport, connectivity, telemetry, clock, ID generation, application lifecycle, updater, and external navigation. Machine actors receive them through dependency injection. Desktop adapters come first; browser and mobile adapters preserve domain events and workflow semantics.

## Trust boundaries

1. Device files, storage, IPC, deep links, clipboard, and logs are readable or modifiable by an attacker.
2. Network calls require authentication, authorization, runtime validation, replay resistance, and retry safety.
3. Downloaded course content is untrusted even when delivered by the platform.
4. Prompts and model output are untrusted data and never grant authority or execute directly.
5. Sandboxes and AWS environments are hostile disposable tenants isolated from control-plane authority.
6. Support and analytics systems receive minimum, redacted, retention-limited data through audited access.

## Threat register

| Threat | Required control | Verification | Owner |
| --- | --- | --- | --- |
| Session theft or replay | Short-lived tokens, secure refresh storage, rotation, revocation, audience checks | Session-abuse tests | Unassigned |
| Modified client grants access | Server-side entitlement and completion authorization | Tampered-client test | Unassigned |
| Malicious course payload | Runtime schemas, signed manifests, safe rendering, no arbitrary script | Fuzz and fixture tests | Unassigned |
| Tauri IPC abuse | Minimal capabilities, Rust validation, no general shell command | Negative tests and capability review | Unassigned |
| Local secret disclosure | OS secure storage, redacted logs, secret-free snapshots | Storage and log inspection | Unassigned |
| Prompt injection | Instruction/data isolation, tool allowlists, deterministic authorization | Adversarial suite | Unassigned |
| Malformed model output | Structured validation, escaping, bounded retry, fallback, no execution | Contract and adversarial tests | Unassigned |
| Answer extraction | Keep authoritative rubrics, solutions, and validators server-side | Client artifact inspection | Unassigned |
| Progress forgery or replay | Identity, idempotency, server acceptance rules, append-only audit | Replay and ordering tests | Unassigned |
| Cross-tenant lab access | Per-session authorization, isolation, scoped connection tokens | Isolation tests | Unassigned |
| Lab privilege escalation | Dedicated roles and region/service/resource restrictions | IAM simulation and security tests | Unassigned |
| Resource or cost runaway | TTL, quotas, budgets, tags, teardown, independent sweeper | Forced-failure cleanup tests | Unassigned |
| Sensitive telemetry | Field allowlists, redaction, retention, deletion controls | Privacy review and sample inspection | Unassigned |
| Dependency/update compromise | Locked dependencies, provenance, signed staged releases, rollback | Build and update verification | Unassigned |

A high-risk threat must have an owner before its affected feature reaches customer testing.

## Initial operational targets

These targets are provisional until provider selection and measurement:

- Local lessons open within 2 seconds on supported reference hardware.
- Learner input is recoverable after unexpected application exit.
- Synchronization is idempotent and converges without losing accepted evidence.
- 95% of sandbox requests reach ready within 60 seconds.
- 99% of stopped or expired labs reach verified cleanup within 15 minutes.
- Clients never receive or persist permanent cloud credentials.
- Hard model and lab spending ceilings exist before public beta.
- Security-relevant control-plane actions produce tamper-resistant audit events.

## Deferred provider decisions

Identity, backend hosting, model routing, telemetry, sandbox runtime, AWS account isolation, billing, and entitlements remain intentionally unselected. Each choice requires an architecture decision covering portability, privacy, security, cost, migration, and exit implications.

## Hands-on mini-lab prototype

The implementation stage includes a browser-based virtual terminal to validate the interaction model before building the remote lab control plane. The learner inspects and repairs a simulated GenAI service configuration, then runs deterministic checks.

The lab supports only fixed commands for inspection, bounded retry configuration, strict schema validation, safety blocking, sanitized telemetry, checks, and reset. Input is parsed as data and is never passed to a shell or dynamic evaluator.

The nested XState lifecycle is:

`implementing.editing -> implementing.checking -> implementing.failure | implementing.success`

A failed check returns to repair; only a successful check unlocks progression. The persisted workspace includes simulated configuration and a bounded transcript. Research export contains pass status, check count, and command count, but excludes command text.

This prototype tests usability and learning value only. Disposable containers, authenticated terminals, authoritative remote validators, tenant isolation, quotas, TTLs, and teardown remain Phase 6 work.