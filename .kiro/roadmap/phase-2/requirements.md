# Phase 2 Requirements

Status: engineering implementation complete; manual validation pending  
Last reviewed: 2026-10-16

## R1: Deterministic baseline assessment

The app must provide a resumable baseline assessment with single-choice, multiple-choice, ordering, and short structured-response activities.

Acceptance criteria:

1. Every activity maps to one or more skills and has versioned grading metadata.
2. Correctness, rationale, and remediation remain hidden until submission.
3. Each response records answer, confidence, elapsed time, attempt number, skill IDs, grading result, timestamp, and idempotency key as append-only evidence.
4. Interrupted assessments resume at the first unanswered activity.
5. Local grading is explicitly provisional until server synchronization exists.

## R2: Skill-gap summary

Assessment results must produce an inspectable skill-gap summary.

Acceptance criteria:

1. Each skill reports correct evidence, total evidence, accuracy, average confidence, and remediation.
2. A skill is weak when accuracy is below 70%; confidence cannot establish mastery.
3. Results remain reproducible from versioned assessment responses.

## R3: Deterministic review queue

Weak skills must create a versioned, persisted review schedule.

Acceptance criteria:

1. Every item states why it is due and what evidence removes it.
2. Review follows prompting, revealing, self-assessment, rescheduling, and completion states.
3. Ratings 1-2 reschedule after 1 day, 3 after 3 days, and 4-5 after 7 days.
4. Two successful ratings of 4-5 remove an item.
5. Review events are append-only and retries do not duplicate accepted events.