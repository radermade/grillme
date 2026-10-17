# AWS Generative AI Study App Roadmap

## Product vision

Build a customer-facing study workspace for AWS certification preparation. The product combines adaptive oral-style grilling, scenario reasoning, implementation exercises, debugging challenges, and disposable cloud labs. It must not become a multiple-choice question bank with labs added as an afterthought.

The initial course targets AWS Certified Generative AI Developer - Professional (AIP-C01), pending final confirmation. Course material must follow the current official exam guide without copying protected exam questions or implying AWS endorsement.

## Learning loop

Every module should follow the same observable loop:

1. Assess prior knowledge and confidence.
2. Teach a focused concept through concise material.
3. Grill the learner with adaptive free-response questions.
4. Ask the learner to apply, debug, or defend a solution.
5. Validate the result with deterministic checks where possible.
6. Schedule weak concepts for spaced review.

The product should measure demonstrated capability, not clicks, time watched, or self-reported completion.

## Product principles

- Explain it, build it, debug it, and defend it.
- Prefer active practice over passive content.
- Use deterministic grading for objective tasks and labs.
- Use AI feedback as assistance, not the sole source of truth.
- Make hints progressive and preserve productive struggle.
- Design course content independently from any one client platform.
- Keep permanent cloud credentials and privileged logic off devices.
- Build accessibility, privacy, cost controls, and abuse prevention in from the start.

## Initial course shape

1. Baseline assessment and prerequisite remediation
2. Foundation model selection and Amazon Bedrock integration
3. Prompting, structured output, and application patterns
4. Embeddings, retrieval, and knowledge bases
5. Agents, tools, orchestration, and workflow integration
6. Safety, IAM, data protection, and governance
7. Evaluation, testing, hallucination management, and observability
8. Performance, reliability, and cost optimization
9. Troubleshooting scenarios
10. Integrated capstone and timed exam preparation

Each module should include a concept lesson, grill session, scenario exercise, implementation or debugging lab, and spaced-review checkpoint.

## Delivery strategy

Develop in vertical slices. Each slice must deliver a complete learner outcome across content, domain logic, state machines, UI, persistence, backend contracts, security, and observability. Avoid frontend-only, backend-only, or platform-only phases that cannot be evaluated by a learner.

Desktop is the first delivery surface. Shared domain, content, machine, and platform contracts must remain portable to web and mobile. Web and mobile implementations should begin only after the relevant workflow has been validated on desktop.

Time ranges are planning estimates, not commitments. A slice is complete only when its exit criteria are met.

## Phase 0: Product and technical validation

**Status:** Specification, runnable solo XState learning-loop/mini-lab prototype, transparent smart evaluation, and validated research-data pipeline complete; product, SME, engineering, security, operations, and real learner validation remain pending. Track execution in [`phase-0/tasks.md`](phase-0/tasks.md).

**Specification:**

- [`phase-0/requirements.md`](phase-0/requirements.md) defines required outcomes and acceptance criteria.
- [`phase-0/design.md`](phase-0/design.md) defines the product, learning-loop, architecture, and security design.
- [`phase-0/tasks.md`](phase-0/tasks.md) tracks drafting, validation, decisions, and phase gates.

**Goal:** Remove the largest product, curriculum, security, and architecture uncertainties before building the application foundation.

### Slice 0.1: Certification and learner definition

- Confirm AIP-C01 as the initial certification and record the official exam-guide version used by the course.
- Define the primary learner, prerequisites, expected study duration, and target readiness outcome.
- Map exam domains to measurable skills rather than lesson titles alone.
- Establish content review, expiration, and correction ownership.
- Define policies against exam dumps, copied questions, and implied AWS endorsement.

**Exit criteria:** Product and subject-matter reviewers approve the learner profile, skill map, and course boundary.

### Slice 0.2: Learning-loop prototype

- Prototype one representative module containing a concept lesson, free-response grill, scenario, implementation task, feedback, and review scheduling.
- Test the prototype with at least five representative learners.
- Measure completion, confusion points, feedback usefulness, and whether learners can explain their decisions afterward.
- Decide which judgments require deterministic rubrics, AI-assisted feedback, or human content review.

**Exit criteria:** Learners can complete the full loop without facilitation, and the team has evidence that the loop improves understanding beyond recall.

### Slice 0.3: Architecture and threat model

- Record architecture decisions for the monorepo, state machines, client/backend trust boundary, content format, identity, synchronization, and lab isolation.
- Threat-model Tauri IPC, local storage, authentication, content delivery, model calls, lab credentials, validators, and teardown.
- Define platform interfaces for storage, secure storage, networking, telemetry, updates, and external navigation.
- Define initial service-level targets and per-learner lab cost ceilings.

**Exit criteria:** The team can trace privileged operations to server-side controls and can identify owners and mitigations for high-risk threats.

## Phase 1: Runnable desktop learning shell

**Status:** Locally complete: engineering, native crash recovery, high-contrast hardening, and unsigned macOS app/DMG packaging pass. Code signing, notarization, Windows-runner packaging, and human assistive-technology review remain external gates. See [`phase-1/requirements.md`](phase-1/requirements.md), [`phase-1/design.md`](phase-1/design.md), and [`phase-1/tasks.md`](phase-1/tasks.md).

**Goal:** Ship a signed desktop build that can load, navigate, and resume a small versioned course without requiring privileged cloud functionality.

### Slice 1.1: Monorepo and desktop composition root

- Establish the minimal desktop app and only the shared packages required by the first workflow.
- Enable strict TypeScript, runtime boundary validation, formatting, linting, and reproducible builds.
- Add a narrow Tauri command surface with least-privilege capabilities.
- Define design tokens and basic accessible UI primitives without prematurely building a universal component library.

**Primary machines:** application bootstrap and update lifecycle.

**Exit criteria:** A signed development build starts, reports sanitized failures, and renders the same domain fixture through platform-independent contracts.

### Slice 1.2: Versioned course reader

- Define runtime-validated schemas for course, module, lesson, activity, and content-version metadata.
- Load a bundled sample course and render concise text, code, callouts, and diagrams.
- Add course navigation, keyboard operation, focus management, reduced-motion handling, and announced errors.
- Record local lesson position and completion evidence through a storage adapter.

**Primary machine:** course session with `loading`, `ready`, `reading`, `saving`, `degraded`, and `failed` states.

**Cross-platform proof:** Run domain, content-schema, and machine tests without importing Tauri or browser globals.

**Exit criteria:** A learner can open, navigate, close, and resume the sample module; invalid content fails safely with an actionable error.

## Phase 2: Closed-loop assessment

**Status:** Locally complete with runtime-validated persistence, guarded machine inputs, deterministic assessment/review workflows, and 15 passing project tests; manual accessibility review pending. See [`phase-2/requirements.md`](phase-2/requirements.md), [`phase-2/design.md`](phase-2/design.md), and [`phase-2/tasks.md`](phase-2/tasks.md).

**Goal:** Deliver a complete, deterministic assessment and remediation loop before introducing generative evaluation.

### Slice 2.1: Baseline assessment

- Support single response, multiple response, ordering, and short structured response activities.
- Capture answer, confidence, elapsed time, attempts, and skill tags as appendable learning events.
- Grade objective work locally for immediate feedback while treating server results as authoritative once synchronization exists.
- Present rationale and remediation links without exposing hidden answer data before submission.

**Primary machine:** assessment session with explicit introduction, answering, reviewing, submitting, graded, abandoned, and failed states.

**Exit criteria:** A learner can complete and resume an interrupted baseline assessment and receive a deterministic skill-gap summary.

### Slice 2.2: Review queue

- Convert assessment evidence into a simple, inspectable review schedule.
- Present due concepts and allow the learner to rate confidence after retrieval.
- Separate scheduling rules from UI and persist a versioned schedule.
- Explain why an item is in the queue and which evidence will remove it.

**Primary machine:** review session with selection, prompting, revealing, self-assessment, rescheduling, and complete states.

**Exit criteria:** Weak skills return in later sessions according to deterministic scheduling rules, with no duplicate or lost review events after restart.

## Phase 3: Adaptive grill experience

**Goal:** Make free-response explanation and follow-up reasoning the primary study interaction.

### Slice 3.1: Rubric-scored free response

- Define versioned rubrics with required concepts, misconceptions, evidence, and remediation.
- Add server-mediated model evaluation with structured output validation and bounded retries.
- Combine deterministic checks with AI-assisted feedback; retain rubric and model-version provenance.
- Let learners challenge unclear feedback and report content issues.
- Redact sensitive data and prohibit secrets from prompts and telemetry.

**Primary machine:** grill turn with prompting, composing, evaluating, feedback, clarification, retrying, and failed states.

**Exit criteria:** Repeated evaluations remain within an agreed consistency threshold, malformed model output cannot corrupt progress, and failures have a non-AI fallback path.

### Slice 3.2: Multi-turn adaptive grilling

- Select follow-ups from demonstrated gaps, confidence, and rubric evidence.
- Support probing, hinting, misconception correction, and learner-requested topic changes.
- Cap session length and model spend while preserving a coherent ending summary.
- Generate a review plan from evidence rather than model opinion alone.

**Primary machine:** hierarchical grill session containing turn actors, with cancellation, timeout, budget-exhausted, and partial-summary behavior.

**Exit criteria:** A learner can complete a multi-turn session, understand why each follow-up was asked, and receive a reproducible evidence-linked summary.

## Phase 4: Scenario and debugging practice

**Goal:** Assess architecture judgment and troubleshooting without the cost and risk of live cloud accounts.

### Slice 4.1: Architecture decision scenarios

- Present constrained AWS scenarios with requirements, trade-offs, and distractors.
- Capture the learner's proposed components, connections, and written defense.
- Evaluate required constraints deterministically and use rubric-based feedback for reasoning quality.
- Keep the scenario model independent of the visual canvas so mobile can use an alternate interaction later.

**Primary machine:** scenario session with inspect, design, validate, defend, revise, and complete states.

**Exit criteria:** Learners can revise a design after constraint-specific feedback, and the same scenario can be completed without relying on pointer-only interactions.

### Slice 4.2: Local debugging challenges

- Add code, logs, configuration, and test-output activities using safe fixtures.
- Avoid arbitrary local shell execution; use deterministic in-process validators or tightly constrained remote execution.
- Provide progressive hints and a post-completion explanation of root cause and prevention.
- Track diagnosis and repair evidence separately.

**Primary machine:** challenge lifecycle with inspect, attempt, validating, failed-checks, hinting, solved, and abandoned states.

**Exit criteria:** At least three representative debugging challenges run reproducibly and cannot access files or processes outside their intended boundary.

## Phase 5: Identity, entitlements, and synchronization

**Goal:** Let customers use the product across devices while preserving offline study and trustworthy scored progress.

### Slice 5.1: Customer identity and secure session handling

- Add browser-based sign-in with short-lived tokens and secure refresh handling.
- Store device secrets only through OS secure storage on desktop.
- Enforce entitlements and course-release rules server-side.
- Support sign-out, expiration, revocation, and offline-grace behavior explicitly.

**Primary machine:** authentication with signed-out, authorizing, signed-in, refreshing, offline-grace, expired, and failed states.

**Exit criteria:** Revoked sessions lose privileged access, secrets are absent from logs and ordinary storage, and interrupted sign-in recovers cleanly.

### Slice 5.2: Offline-first progress synchronization

- Synchronize appendable learning events using stable IDs and idempotency keys.
- Derive server-authoritative summaries while retaining local pending state.
- Define explicit conflict behavior for scored attempts and content-version changes.
- Expose pending, synchronized, degraded, and conflict states without blocking available offline activities.

**Primary machine:** synchronization with idle, pushing, pulling, reconciling, conflict, backoff, offline, and failed states.

**Cross-platform proof:** Complete the same learner account flow in a minimal web shell using shared domain and machine packages.

**Exit criteria:** Repeated delivery, network loss, process termination, and two-device updates produce no lost or duplicated progress events.

## Phase 6: Disposable sandbox labs

**Goal:** Deliver implementation labs in isolated remote environments before granting access to real AWS resources.

### Slice 6.1: Lab control-plane foundation

- Create server-side lab definitions, session issuance, quotas, TTLs, audit events, and teardown jobs.
- Provision a disposable container or equivalent sandbox from an immutable template.
- Provide browser-compatible terminal and editor protocols behind authenticated, short-lived sessions.
- Keep validators and solutions server-side.

**Primary machine:** lab lifecycle with requested, provisioning, ready, reconnecting, validating, stopping, expired, failed, and cleaned states.

**Exit criteria:** Environments start within the agreed target, terminate at TTL, survive client reconnects, and leave no orphan resources in failure tests.

### Slice 6.2: First end-to-end implementation lab

- Deliver one representative Bedrock SDK challenge using mocks or controlled substitutes.
- Include instructions, starter files, checkpoints, final validation, progressive hints, and debrief.
- Capture commands and validator outcomes needed for support while excluding secrets and unnecessary learner content.
- Enforce concurrency, duration, and spend limits.

**Exit criteria:** Pilot learners can provision, complete, reconnect to, and terminate the lab; completion is based on observable behavior rather than UI actions.

### Slice 6.3: Initial lab set

Deliver six to ten sandbox labs spanning:

- Bedrock request construction and structured output
- Model-selection trade-offs
- Retrieval-quality diagnosis
- Guardrails and adversarial input handling
- Least-privilege IAM review
- Evaluation, latency, and cost analysis
- Agent tool integration
- Operational troubleshooting

**Exit criteria:** Labs have content-owner approval, deterministic validators, measured completion rates, and documented support and teardown procedures.

## Phase 7: Restricted real-AWS labs

**Goal:** Validate production-like AWS skills in temporary, tightly constrained environments.

### Slice 7.1: AWS account and credential vending

- Select and document the isolation model for managed lab accounts.
- Issue short-lived credentials only after server-side identity, entitlement, and quota checks.
- Enforce region, service, action, resource, tag, time, and spend restrictions through layered controls.
- Add automatic teardown plus independent orphan-resource sweeps.
- Prevent lab credentials from entering persisted machine snapshots, logs, analytics, or support exports.

**Primary machine:** credential and environment lifecycle nested within the lab machine, including revocation and forced-expiration paths.

**Exit criteria:** Security testing confirms learners cannot exceed intended permissions, regions, duration, concurrency, or budget.

### Slice 7.2: Two production-like labs

- Implement one guided Bedrock integration lab and one troubleshooting or RAG lab.
- Validate deployed resource state and end-to-end application behavior server-side.
- Support partial completion, retry, teardown, and clean reprovisioning.
- Show remaining time and expected resource cost before launch.

**Exit criteria:** Both labs meet reliability, cleanup, cost, and learning-effectiveness targets in a controlled pilot.

## Phase 8: Course completion and readiness

**Goal:** Turn the validated learning mechanics into a coherent, purchasable AIP-C01 preparation course.

### Slice 8.1: Full module production

- Produce all planned modules through the versioned content pipeline.
- Require technical review, instructional review, accessibility review, and lab validation before release.
- Link each activity and rubric criterion to the skill map and source version.
- Add content correction and learner-report workflows.

**Exit criteria:** Every targeted skill has instruction, retrieval practice, application evidence, and remediation; no skill depends solely on multiple-choice evidence.

### Slice 8.2: Readiness dashboard and mock experience

- Calculate readiness from recent, weighted evidence across recall, explanation, scenarios, debugging, and labs.
- Show confidence intervals or evidence sufficiency rather than presenting a false guarantee of exam success.
- Add timed mock sessions with exam-like pacing while using original content.
- Let learners drill from weak-domain evidence into targeted activities.

**Primary machine:** mock exam lifecycle; dashboard remains a derived view over versioned evidence.

**Exit criteria:** Readiness explanations are traceable to learner evidence, and changing a scoring rule can recompute summaries without rewriting history.

## Phase 9: Private beta and first commercial release

**Goal:** Validate product value, operational safety, and commercial readiness with real customers.

### Slice 9.1: Private beta

- Recruit 25 to 50 representative learners.
- Add consent-aware product analytics, feedback collection, support diagnostics, and content issue reporting.
- Measure activation, return rate, grill completion, lab success, review adherence, readiness change, support burden, and cost per active learner.
- Run security, privacy, accessibility, recovery, and lab-abuse reviews.

**Exit criteria:** Critical defects and security findings are resolved, unit economics fit the release target, and learner evidence supports continuing investment.

### Slice 9.2: Commercial desktop release

- Add subscription and entitlement flows, customer support procedures, privacy controls, account deletion, release channels, and rollback capability.
- Sign and distribute supported macOS and Windows builds.
- Publish clear platform, connectivity, lab, and offline requirements.
- Establish content freshness alerts and operational ownership.

**Exit criteria:** A customer can purchase, install, learn, use labs, synchronize progress, manage their data, and receive support through a production-operated path.

## Phase 10: Web and mobile expansion

**Goal:** Extend validated workflows without weakening platform boundaries or forcing desktop interaction patterns onto other devices.

### Slice 10.1: Full web client

- Reuse domain, content, machine, schema, and platform contracts.
- Implement browser adapters for storage, authentication, networking, telemetry, and lab connections.
- Reassess offline storage, secure session handling, update delivery, and browser sandbox constraints.
- Preserve deep links and cross-device continuation.

**Exit criteria:** Supported non-native learning and lab workflows pass the same behavioral contract tests as desktop.

### Slice 10.2: Mobile discovery and focused client

- Research which workflows learners actually perform on phones and tablets.
- Select Tauri mobile or another client approach through an architecture decision based on capability, accessibility, distribution, and team cost.
- Prioritize review queues, short grill sessions, progress, and content reading; do not assume terminal-heavy labs belong on phones.
- Implement mobile-specific navigation, input, interruption recovery, and offline behavior.

**Exit criteria:** The selected mobile workflows improve retention or convenience in user testing and do not require platform code in shared domain or machine packages.

## Cross-cutting release gates

Every slice must satisfy the gates relevant to its risk:

- **Behavior:** Acceptance criteria demonstrate a complete learner outcome.
- **State:** Workflow states, events, guards, retries, cancellation, and persistence are explicit and tested.
- **Portability:** Shared packages have no platform imports; platform behavior is adapter-driven.
- **Security:** Trust boundaries, input validation, secret handling, authorization, and abuse cases are reviewed.
- **Accessibility:** Keyboard, focus, labels, announcements, reduced motion, contrast, zoom, and non-pointer alternatives are considered and manually checked where applicable.
- **Reliability:** Offline, reconnect, retry, timeout, cancellation, process restart, and partial-failure behavior is verified.
- **Observability:** Structured events and sanitized failures answer whether the workflow is healthy without collecting unnecessary learner data.
- **Content:** Sources, version, rubric, review owner, and correction path are recorded.
- **Operations:** Cost limits, support procedures, rollback, migration, and cleanup exist before exposure grows.

## Initial release boundary

The first commercial release should include:

- Signed macOS and Windows desktop clients
- One complete AIP-C01 course
- Versioned lessons and original assessments
- Adaptive multi-turn grill sessions
- Free-response, scenario, and debugging activities
- Spaced review and evidence-based readiness
- Six to ten disposable sandbox labs
- Two restricted real-AWS labs
- Customer identity, entitlements, synchronization, and privacy controls
- Repository-based internal content authoring and review

Defer a visual authoring suite, community-authored courses, live cohorts, Linux distribution, mobile clients, and advanced organization administration until product evidence justifies them.

## Decisions to close before Phase 1

1. Confirm AIP-C01 and the learner prerequisite level.
2. Choose consumer subscriptions, team licensing, or an intentional sequence for both.
3. Confirm the initial macOS and Windows support matrix.
4. Decide whether all real AWS labs use platform-managed accounts.
5. Set maximum model and lab cost per active learner.
6. Select identity, backend hosting, model-provider, analytics, and error-reporting boundaries.
7. Define the evidence required to claim learner readiness without promising exam success.