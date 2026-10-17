import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import {
  containsPotentialSecret,
  createDeterministicEvaluationPort,
  createGrillSessionMachine,
} from "@grillme/machines";
import type { Grill } from "@grillme/domain";
import { useUiRuntime } from "./runtime";

type Props = { onOpenReview(): void };

export function GrillView({ onOpenReview }: Props) {
  const { fixtures, platform } = useUiRuntime();
  const grill = fixtures.grill as Grill;
  const evaluator = useMemo(() => createDeterministicEvaluationPort(
    (promptId) => grill.prompts.find(({ id }) => id === promptId),
  ), [grill]);
  const machine = useMemo(() => createGrillSessionMachine(grill, platform, evaluator), [grill, evaluator]);
  const [state, send] = useMachine(machine, {});
  const context = state.context;

  useEffect(() => { document.querySelector<HTMLElement>("#grill")?.focus(); }, [state.value]);

  if (state.matches("loading")) return <main id="grill" tabIndex={-1}><h1>Loading grill</h1><p role="status">Restoring your session…</p></main>;
  if (state.matches("failed")) return <main id="grill" tabIndex={-1}><h1>Grill unavailable</h1><p role="alert">{context.error?.message}</p><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button></main>;
  if (state.matches("introduction")) return <main id="grill" tabIndex={-1}><p className="eyebrow">Adaptive free response</p><h1>{context.grill?.title}</h1><p>{context.grill?.description}</p><p>Up to {context.grill?.maxTurns} turns. Each follow-up explains why it was selected. Local evaluation is provisional.</p><button className="primary" onClick={() => send({ type: "START" })}>{context.progress?.turns.length ? "Resume grill" : "Start grill"}</button></main>;

  if (state.matches("evaluating") || state.matches("retrying")) return <main id="grill" tabIndex={-1}><h1>Evaluating your evidence</h1><p role="status">Validating rubric coverage, attempt {context.evaluationAttempt} of {context.grill?.maxEvaluationAttempts}…</p></main>;
  if (state.matches("saving")) return <main id="grill" tabIndex={-1}><h1>Saving turn</h1><p role="status">Recording validated evidence…</p></main>;
  if (state.matches("degraded")) return <main id="grill" tabIndex={-1}><h1>Turn not saved</h1><p role="alert">{context.error?.message}</p><div className="actions"><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry save</button><button className="secondary" onClick={() => send({ type: "CONTINUE_OFFLINE" })}>Continue unsaved</button></div></main>;
  if (state.matches("fallback")) return <main id="grill" tabIndex={-1}><h1>Assisted evaluation unavailable</h1><p role="alert">{context.error?.message}</p><p>You can retry or use the transparent deterministic rubric fallback.</p><div className="actions"><button className="secondary" onClick={() => send({ type: "RETRY" })}>Retry evaluation</button><button className="primary" onClick={() => send({ type: "USE_FALLBACK" })}>Use deterministic fallback</button></div></main>;
  if (state.matches("challenging") || state.matches("reporting")) return <main id="grill" tabIndex={-1}><h1>Recording feedback</h1><p role="status">Saving your report without response content…</p></main>;
  if (state.matches("budgetExhausted")) return <main id="grill" tabIndex={-1}><h1>Evaluation budget reached</h1><p>The session used its {context.grill?.evaluationBudget} evaluation units. Your completed evidence is preserved.</p><button className="primary" onClick={() => send({ type: "CONTINUE" })}>View summary</button></main>;
  if (state.matches("summarizing")) return <main id="grill" tabIndex={-1}><h1>Preparing summary</h1><p role="status">Projecting validated evidence and review needs…</p></main>;

  if (state.matches("complete") && context.summary) return <main id="grill" tabIndex={-1}><p className="eyebrow">Evidence-linked summary</p><h1>Grill complete</h1><p>{context.summary.turnsCompleted} turns · {context.summary.budgetUsed} evaluation units</p><div className="results"><section className="result strong"><h2>Demonstrated concepts</h2><p>{context.summary.demonstratedConceptIds.length ? context.summary.demonstratedConceptIds.join(", ") : "No concepts met the evidence threshold."}</p></section><section className="result weak"><h2>Concepts to revisit</h2><p>{context.summary.missingConceptIds.length ? context.summary.missingConceptIds.join(", ") : "No missing concepts in this session."}</p></section>{context.summary.misconceptionIds.length > 0 && <section className="result weak"><h2>Misconceptions detected</h2><p>{context.summary.misconceptionIds.join(", ")}</p></section>}</div><button className="primary" onClick={onOpenReview}>Open review queue</button></main>;

  if (state.matches("feedback") && context.currentEvaluation) {
    const evaluation = context.currentEvaluation;
    return <main id="grill" tabIndex={-1}><p className="eyebrow">Turn feedback</p><h1>{Math.round(evaluation.score * 100)}% rubric coverage</h1><p>{evaluation.feedback}</p><section className="feedback-grid"><div className="result strong"><h2>Covered</h2><p>{evaluation.coveredConceptIds.length ? evaluation.coveredConceptIds.join(", ") : "No required concepts detected."}</p></div><div className="result weak"><h2>Missing</h2><p>{evaluation.missingConceptIds.length ? evaluation.missingConceptIds.join(", ") : "No required concepts missing."}</p></div></section>{evaluation.evidence.length > 0 && <section><h2>Evidence detected</h2><ul>{evaluation.evidence.map((item) => <li key={item.conceptId}><strong>{item.conceptId}:</strong> “{item.excerpt}”</li>)}</ul></section>}{evaluation.followUp && <aside className="callout info"><strong>Why the next question was selected</strong><p>{evaluation.followUp.reason}</p></aside>}<p className="form-help">Evaluator: {evaluation.evaluatorId} {evaluation.evaluatorVersion}{evaluation.modelVersion ? ` · Model ${evaluation.modelVersion}` : " · No model"}</p><div className="actions"><button className="secondary" onClick={() => send({ type: "CLARIFY" })}>Ask for clarification</button><button className="secondary" onClick={() => send({ type: "CHALLENGE_FEEDBACK" })}>Challenge feedback</button><button className="secondary" onClick={() => send({ type: "REPORT_CONTENT" })}>Report content</button><button className="secondary" onClick={() => send({ type: "END_EARLY" })}>End session</button><button className="primary" onClick={() => send({ type: "CONTINUE" })}>Continue</button></div></main>;
  }

  const potentialSecret = containsPotentialSecret(context.response);
  const responseReady = context.response.trim().length > 0 && context.response.length <= 5_000 && !potentialSecret;
  return <main id="grill" tabIndex={-1}><p className="eyebrow">Turn {(context.progress?.turns.length ?? 0) + 1} of {context.grill?.maxTurns} · Budget {context.progress?.budgetUsed ?? 0}/{context.grill?.evaluationBudget}</p><h1>{context.question}</h1><p className="prompt-reason"><strong>Why this question:</strong> {context.reason}</p>{context.hintVisible && <aside className="callout info"><strong>Hint</strong><p>{context.currentPrompt?.hint}</p></aside>}<label><strong>Your explanation</strong><textarea value={context.response} maxLength={5_000} onChange={(event) => send({ type: "RESPOND", response: event.target.value })} /></label><p className="form-help">{context.response.length}/5000 characters{potentialSecret ? " · Remove credentials or secrets before evaluation." : ""}</p><fieldset className="confidence"><legend>Confidence, 1 to 5</legend>{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name="grill-confidence" checked={context.confidence === value} onChange={() => send({ type: "CONFIDENCE", value })} /> {value}</label>)}</fieldset><div className="actions"><button className="secondary" onClick={() => send({ type: "SHOW_HINT" })}>Show hint</button>{(context.progress?.turns.length ?? 0) > 0 && <button className="secondary" onClick={() => send({ type: "END_EARLY" })}>End early</button>}<button className="primary" disabled={!responseReady} onClick={() => send({ type: "SUBMIT" })}>Evaluate response</button></div></main>;
}