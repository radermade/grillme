# Phase 3 Requirements

Status: provider-neutral local implementation complete; external validation pending  
Last reviewed: 2026-10-16

## R1: Versioned rubric evaluation

The app must evaluate free-response explanations through a provider-neutral, asynchronous service boundary.

Acceptance criteria:

1. Rubrics define required concepts, misconceptions, evidence guidance, follow-up prompts, and remediation.
2. Evaluator output is runtime-validated before it can affect progress.
3. Results retain rubric, evaluator, model/ruleset, course, prompt, and session provenance.
4. Deterministic fallback remains available when assisted evaluation fails.
5. Learners can challenge feedback and report content issues.

## R2: Bounded evaluation workflow

Evaluation must expose timeout, retry, fallback, budget, and terminal failure behavior explicitly.

Acceptance criteria:

1. Each turn has a fixed attempt and timeout limit.
2. Session turn count and evaluation budget are capped.
3. Malformed output is rejected and cannot corrupt progress.
4. Raw evaluator output, secrets, and sensitive prompts are excluded from logs and persisted snapshots.

## R3: Adaptive multi-turn grilling

The app must select follow-ups from rubric evidence and misconceptions rather than a static question sequence.

Acceptance criteria:

1. Every follow-up includes a learner-visible reason.
2. The learner can request a hint, ask for clarification, or end early.
3. Session summaries derive from validated turn evidence.
4. Weak rubric concepts create review-schedule items using deterministic rules.
5. Session response/evaluation evidence is append-only and idempotent.