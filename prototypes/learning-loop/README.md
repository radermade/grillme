# Structured Output Learning-Loop Prototype

This solo browser prototype validates the Phase 0 learning loop without a live AWS account, external model, facilitator, or production application. Its virtual terminal simulates a hands-on repair/check workflow; it is not a shell or remote lab.

## Files

- `participant-workbook.md`: optional standalone explanation of the exercise.
- `research-record.md`: aggregate usability-research template.
- `web/`: canonical XState browser research flow with a safe virtual mini-lab.
- `exercise/starter.ts`: optional technical-review exercise.
- `exercise/starter.mjs`: executable equivalent of the optional exercise.
- `exercise/validator.test.mjs`: deterministic technical-review validator.
- `exercise/reference.mjs`: developer-only reference implementation.

## Browser prototype

Install dependencies once:

```bash
npm ci
```

Run the local prototype manually:

```bash
npm run prototype:dev
```

This is a Phase 0 browser research prototype, not the Tauri product. It uses the same explicit XState workflow intended for later clients and saves interruption-recovery state only in local browser storage.

## Optional technical-review exercise

The browser mini-lab is the canonical learner research path. The standalone exercise is retained for technical review and can be run from the repository root:

```bash
npm run test:prototype
```

The starter intentionally fails six targeted checks. The reference implementation should pass all checks:

```bash
npm run test:prototype:reference
```

Do not show `reference.mjs` to participants before reflection and scoring are complete.

## Analyze sessions

Create one anonymized JSON record per valid session using `session-record.example.json` as the shape. After at least five sessions, run:

```bash
node prototypes/learning-loop/analyze-results.mjs session-1.json session-2.json session-3.json session-4.json session-5.json
```

The analyzer validates every record against the canonical schema, applies the pre-registered R6 thresholds, and reports `proceed` or `revise`. Hands-on metrics are reported separately and do not alter the pre-registered R6 decision. Record qualitative findings and the final decision in `research-record.md`.