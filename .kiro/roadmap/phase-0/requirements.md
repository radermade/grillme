# Phase 0 Requirements

Status: draft for approval  
Last reviewed: 2026-10-16

## Purpose

Phase 0 must validate the product, first course, learning loop, and architecture before implementation commitments are made. These requirements define outcomes; implementation decisions belong in [design.md](design.md), and tracked work belongs in [tasks.md](tasks.md).

## R1: Course-agnostic product

The product must operate as a reusable learning workspace in which AIP-C01 is the first course rather than application-specific behavior.

Acceptance criteria:

1. Course identity, version, skills, activities, rubrics, labs, evidence rules, and readiness rules are represented as course data or provider capabilities.
2. Shared application behavior contains no AIP-C01-specific branching.
3. Vendor-specific terminology and services remain in course content and lab adapters.
4. A future course can use the learning engine without changing its core state model.

## R2: First course and learner

The first course must target AWS Certified Generative AI Developer - Professional (AIP-C01), subject to product confirmation, using the current official exam guide as curriculum source of truth.

Acceptance criteria:

1. The recorded target learner matches the prerequisite level published by AWS.
2. Prerequisite gaps are diagnosed and remediated rather than silently expanding the course into foundational training.
3. The intended outcome covers explaining, implementing, testing, securing, operating, and troubleshooting production GenAI systems.
4. The product does not promise certification or claim precise exam-pass prediction.

## R3: Versioned course contract

Every released course version must identify its source basis, prerequisites, measurable skills, learning content, activities, evidence policy, review ownership, and expiration policy.

Acceptance criteria:

1. Every activity maps to one or more measurable skills.
2. Every scored activity identifies a rubric or deterministic validator version.
3. Every course records source versions, technical reviewers, release status, and correction ownership.
4. Content changes cannot silently reinterpret historical learner evidence.

## R4: Measurable skill and evidence model

The first course must map its official scope to capabilities that can be demonstrated through multiple forms of evidence.

Acceptance criteria:

1. Every skill describes an observable learner capability.
2. High-impact skills require recent evidence from at least two activity types.
3. No skill reaches the highest readiness level from multiple-choice evidence alone.
4. Confidence, completion, and AI feedback never substitute for demonstrated performance.
5. Evidence retains course, rubric, validator, hint, and retry provenance.

## R5: Representative learning-loop prototype

Phase 0 must define and run one representative loop containing baseline assessment, focused teaching, adaptive free response, scenario reasoning, implementation, deterministic validation, reflection, and review scheduling.

Acceptance criteria:

1. The prototype takes 25 to 35 minutes and does not require a live AWS account.
2. Workflow states, interruptions, retries, and terminal outcomes are explicit.
3. Deterministic validation is used before rubric-guided subjective judgment.
4. The prototype collects no credentials, production code, or unnecessary personal data.

## R6: Learner validation

The learning loop must be tested with at least five people matching the proposed learner profile under a consistent protocol.

Acceptance criteria:

1. At least four participants finish the solo flow without external help.
2. At least four improve by one rubric level from baseline to final explanation.
3. At least four identify malformed-output and unbounded-retry risks.
4. At least four explain why deterministic validation remains necessary after model generation.
5. Median completion time is no more than 35 minutes.
6. No severe accessibility, safety, privacy, or trust issue remains unresolved.
7. Results and any changed decision threshold are recorded transparently.

## R7: Portable architecture

The architecture must support desktop first while preserving shared domain and workflow behavior for future web and mobile clients.

Acceptance criteria:

1. Shared domain and state-machine code imports no Tauri, browser-global, or mobile SDK APIs.
2. Storage, secure storage, network, connectivity, telemetry, clock, ID, lifecycle, update, and navigation capabilities have narrow interfaces.
3. Platform adapters are injected at application composition roots.
4. Platform-specific interaction design may differ without changing domain events or authoritative workflow rules.

## R8: Explicit state machines

Meaningful workflows must use typed state machines rather than implicit boolean combinations or component-driven rules.

Acceptance criteria:

1. States, events, guards, effects, retries, cancellation, timeouts, and failures are explicit where applicable.
2. Durable domain data remains separate from ephemeral actor state.
3. Persisted snapshots are minimal, versioned, migratable, and contain no secrets.
4. UI renders machine state and sends domain events without hiding transition rules.

## R9: Security and remote authority

All clients, downloaded content, model output, and lab environments must be treated as untrusted.

Acceptance criteria:

1. Identity, entitlements, final scored evidence, content release, model evaluation, provisioning, credentials, and authoritative validators are controlled server-side.
2. Permanent cloud credentials, privileged provisioning roles, solutions, and authoritative validators never ship to clients.
3. Tauri IPC is least-privileged and validates input in Rust.
4. Content and model output are runtime-validated and cannot execute directly or grant authority.
5. Labs enforce tenant isolation, scoped sessions, quotas, TTLs, audit, and independent cleanup.
6. High-risk threats have named owners and verification plans before affected customer testing.

## R10: Operational readiness targets

Phase 0 must propose measurable reliability, privacy, cost, content, and support targets for later validation.

Acceptance criteria:

1. Local lesson opening, crash recovery, synchronization, lab startup, and cleanup have measurable targets.
2. Model and lab usage have hard per-session and per-user ceilings before public beta.
3. Telemetry is allowlisted, redacted, retention-limited, and sufficient to diagnose workflow health.
4. Security-relevant control-plane actions produce tamper-resistant audit events.
5. Provider-dependent targets remain explicitly provisional until measured.

## Phase 0 exit

Phase 1 may start after product, course, learner, architecture, and high-risk security assumptions are approved. Full Phase 2 interaction investment must wait for learning-loop research results and a recorded proceed decision.

## R11: Hands-on interaction hypothesis

Phase 0 must test whether learners can use a terminal-style, checkpoint-driven activity as part of the learning loop before the platform invests in remote sandbox infrastructure.

Acceptance criteria:

1. The prototype provides an inspect, change, check, revise, and complete loop.
2. Checks evaluate observable configuration state rather than clicks or self-reported completion.
3. The prototype exposes explicit editing, checking, failed, and successful states.
4. Commands use a fixed simulated language and never execute arbitrary shell input.
5. Research records attempts and outcomes without exporting command contents.
6. Participants are asked whether the interaction improved understanding and whether they would use a deeper implementation lab.

## R12: Solo smart evaluation

The customer learning experience must not require a facilitator, instructor, or human grader.

Acceptance criteria:

1. Objective tasks and labs use deterministic validators.
2. Written responses are evaluated against explicit, versioned rubrics with evidence and missing concepts shown to the learner.
3. Automated evaluation states are explicit and can fail, retry, or fall back without losing learner work.
4. Production AI-assisted evaluation is server-mediated, runtime-validated, bounded by timeout/retry/cost policy, and never the sole authority for deterministic tasks.
5. Evaluation records retain rubric, evaluator, model or ruleset, course, and content versions.
6. The learner can challenge or report unclear feedback.
7. Human experts review course and rubric quality, not individual customer sessions by default.