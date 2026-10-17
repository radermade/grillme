# Facilitator Guide

Status: awaiting technical and instructional review  
Target duration: 25 to 35 minutes

## Before the session

1. Assign a non-identifying participant ID.
2. Confirm the participant broadly matches the target profile.
3. Explain what data will be recorded and obtain consent.
4. Give only `participant-workbook.md` and the `exercise` folder, excluding `reference.mjs`.
5. Verify the validator runs and initially reports failing checks.
6. Start one timer when the participant begins.

Do not collect names, credentials, production code, employer data, or account details. Do not teach outside the scripted content. Ask the participant to think aloud without explaining the answer.

## Fixed session script

### 1. Introduction, 1 minute

Say: "We are testing the learning activity, not you. You can pause or stop at any point. Please think aloud. I will only provide the listed hints."

### 2. Baseline, 3 minutes

Show workbook section 1. Record the explanation and confidence before showing teaching material. Score only after the session.

### 3. Teaching, 5 minutes

Show section 2. Answer clarification questions about wording only. Do not add examples or implementation advice.

### 4. Grill, 5 minutes

Ask section 3 questions in order. Ask the follow-up only when the answer omits both bounded attempts and terminal failure.

### 5. Scenario, 4 minutes

Show section 4. Ask the participant to choose and defend an option. Do not confirm correctness.

### 6. Implementation and validation, 10 minutes

Run the browser prototype and let the participant use its virtual terminal. Record check attempts, pass/fail outcomes, and hints used, not command contents. The terminal accepts only its displayed fixed command set and does not execute shell commands.

Provide hints only in this order and only when requested or after three minutes without progress:

1. "Inspect the current configuration and compare it with all four requirements."
2. "The retry policy needs exactly two total calls."
3. "Validation, safety, and telemetry each need an explicit setting."

### 7. Reflection, 4 minutes

Ask section 6 before revealing the reference implementation. Record final confidence and explanation.

### 8. Interview, 3 minutes

Ask exactly:

1. Which part was most and least useful?
2. Where did you distrust or misunderstand feedback?
3. Was any interaction inaccessible, unsafe, intrusive, or unnecessarily frustrating?
4. Was the terminal-style inspect, repair, and check loop useful or confusing?
5. Would you choose a deeper hands-on lab for another topic? Why?
6. Would you choose this overall workflow for another topic? Why?

Stop the timer and record completion status.

## Scoring

Score baseline and final explanations from 0 to 3 on each dimension:

- Output handling: absent; parse-only; validation/errors; bounded recovery plus terminal failure.
- Safety: absent; generic mention; unsafe-output recognition; concrete control and escalation boundaries.
- Operations: absent; logs only; useful metrics; connects metrics to retry, latency, cost, and diagnosis.
- Trade-offs: unsupported; one factor; multiple constraints; defended choice and conditions for change.

Record direct evidence statements. Do not infer intent or award points for implementation alone.

## Session invalidation

Mark a session invalid and retain only operational notes when the facilitator gives unscripted teaching, materials differ materially, consent is absent, prerequisite fit is clearly wrong, or validator behavior changes during the study.