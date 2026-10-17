# Phase 0 Tasks

Status: in progress; in-repository prototype complete, human gates pending  
Last updated: 2026-10-16

Review evidence is recorded in [`review-checklist.md`](review-checklist.md). Curriculum traceability is prepared in [`skill-traceability.md`](skill-traceability.md), and content operations are proposed in [`content-governance.md`](content-governance.md).

Tasks are ordered by dependency. Checked items indicate that a draft artifact exists, not that its approval gate has passed. Requirement references point to [requirements.md](requirements.md); design decisions are documented in [design.md](design.md).

## 1. Define the product and first course

- [x] 1.1 Define the product as a course-agnostic learning workspace. (R1)
- [x] 1.2 Define the boundary between shared application behavior and course/provider behavior. (R1)
- [x] 1.3 Record AIP-C01 as the proposed first course and official AWS material as its source of truth. (R2)
- [x] 1.4 Draft the target learner, prerequisite assumptions, and outcome. (R2)
- [x] 1.5 Define the minimum versioned course contract. (R3)
- [ ] 1.6 Obtain product approval for the course-agnostic boundary and AIP-C01 selection. (R1, R2)
- [ ] 1.7 Assign content ownership, review cadence, correction response target, and expiration policy. (R3, R10)
  - Draft policy: [`content-governance.md`](content-governance.md); named owners and target approval remain open.

## 2. Validate the measurable skill model

- [x] 2.1 Draft an initial capability-oriented AIP-C01 skill map. (R4)
- [x] 2.2 Define evidence rules that prevent multiple-choice-only mastery. (R4)
- [ ] 2.3 Trace every skill to the current official exam guide version. (R2, R4)
- [ ] 2.4 Have a qualified AWS/GenAI reviewer approve skills, mappings, and minimum evidence. (R4)
- [ ] 2.5 Record corrections and unresolved curriculum risks. (R10)

## 3. Prepare and run the learning-loop prototype

- [x] 3.1 Select structured output and bounded retry handling as the representative topic. (R5)
- [x] 3.2 Define baseline, teaching, grilling, scenario, implementation, validation, reflection, and review activities. (R5)
- [x] 3.3 Define explicit workflow states, loops, interruptions, and terminal outcomes. (R5, R8)
- [x] 3.4 Define the automated rubric, evidence captured, and privacy boundary. (R5, R6, R12)
- [x] 3.5 Pre-register the participant protocol and success thresholds. (R6)
- [x] 3.6 Create the minimal solo learning-loop prototype and runnable TypeScript exercise. (R5, R12)
  - Evidence: [`../../../prototypes/learning-loop/`](../../../prototypes/learning-loop/), including a typed XState browser prototype, versioned local recovery, evidence-linked automated evaluation, anonymized export, deterministic exercise validator, workbook, and research record.
  - Hands-on evidence: a safe virtual terminal implements inspect, repair, deterministic check, failure, retry, and success states without arbitrary command execution. (R11)
  - Validation: strict typecheck, production build, and 7/7 reference validator checks pass.
- [x] 3.6a Implement the terminal/checkpoint interaction hypothesis before remote lab investment. (R11)
- [x] 3.6b Align browser export, automated scoring, example records, and aggregate analysis to one runtime-validated research schema. (R6, R11, R12)
  - Evidence: automated evaluation is an explicit machine state; schema v3 records contain evaluator provenance and report hands-on metrics separately.
  - Validation: canonical five-record analysis returns `proceed`; unrelated JSON is rejected with a field-specific error.
- [x] 3.6c Replace manual per-session grading with a solo smart-evaluation flow. (R12)
  - Evidence: explicit `evaluating` state, transparent evidence/missing-concept feedback, deterministic lab authority, and learner-only experience questions.
- [ ] 3.7 Obtain technical and instructional review of the prototype. (R5, R11, R12)
- [ ] 3.8 Recruit at least five representative learners with informed consent for research collection. (R6)
- [ ] 3.9 Run solo sessions using anonymous session IDs and the fixed prototype. (R6)
- [ ] 3.10 Analyze real participant results without changing thresholds after observation. (R6)
  - Tooling ready: [`../../../prototypes/learning-loop/analyze-results.mjs`](../../../prototypes/learning-loop/analyze-results.mjs) validates schema v1/v2 records, applies the pre-registered thresholds, and reports hands-on metrics separately.
- [ ] 3.11 Record proceed, revise, or stop decision and required changes. (R6)

## 4. Approve portable architecture and state model

- [x] 4.1 Record the desktop-first, portable-core monorepo direction. (R7)
- [x] 4.2 Record XState actors as the default for meaningful workflows. (R8)
- [x] 4.3 Separate durable domain records from ephemeral machine state. (R8)
- [x] 4.4 Identify required platform capability interfaces. (R7)
- [x] 4.5 Define an event-based, idempotent synchronization direction. (R7, R8)
- [x] 4.6 Define a provider-neutral lab lifecycle. (R1, R7)
- [ ] 4.7 Obtain engineering approval and assign architecture decision owners. (R7, R8)
- [ ] 4.8 Confirm platform contracts while implementing Slice 1.1. (R7)

## 5. Review security and operations

- [x] 5.1 Define device, network, content, model, lab, and operations trust boundaries. (R9)
- [x] 5.2 Draft the initial threat register and required verification. (R9)
- [x] 5.3 Define server-authoritative entitlement, grading, content, model, and lab controls. (R9)
- [x] 5.4 Propose initial performance, recovery, synchronization, lab, credential, cost, and audit targets. (R10)
- [ ] 5.5 Assign an owner to every threat before its affected feature reaches customer testing. (R9)
- [ ] 5.6 Conduct security and privacy review of high-risk threats and mitigations. (R9, R10)
- [ ] 5.7 Approve per-session and per-user model and lab cost ceilings. (R10)
- [ ] 5.8 Assign operational target owners and measurement methods. (R10)

## 6. Record deferred provider decisions

- [ ] 6.1 Decide identity provider and token/session design before authentication work. (R9)
- [ ] 6.2 Decide backend runtime, persistence, queue, and hosting before remote authority work. (R7, R9)
- [ ] 6.3 Decide model routing, retention, and fallback policy before AI evaluation work. (R9, R10)
- [ ] 6.4 Decide analytics and error-reporting boundaries before customer telemetry. (R10)
- [ ] 6.5 Decide sandbox runtime and AWS account-isolation model before labs. (R9, R10)
- [ ] 6.6 Decide billing and entitlement provider before commercial release. (R9)

Each selection requires an architecture decision recording portability, privacy, security, cost, migration, and exit implications. These provider tasks do not all block Phase 1.

## 7. Phase gate

- [ ] 7.1 Product approves the boundary, first course, learner, and outcome. (R1, R2)
- [ ] 7.2 Subject-matter review approves the course skill model. (R3, R4)
- [ ] 7.3 Engineering approves the architecture and machine direction. (R7, R8)
- [ ] 7.4 Security approves high-risk controls and assigns owners. (R9)
- [ ] 7.5 Product and operations approve provisional service and cost targets. (R10)
- [ ] 7.6 Prototype protocol is approved and ready to run. (R5, R6)
- [ ] 7.7 Learner research produces a recorded proceed, revise, or stop decision before full Phase 2 investment. (R6)

Phase 0 remains in progress until tasks 7.1 through 7.6 are complete. Task 7.7 may run in parallel with Phase 1 foundation work but gates Phase 2.