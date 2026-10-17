import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createAssessmentSessionMachine, isAnswerComplete } from "@grillme/machines";
import type { Assessment, AssessmentActivity, AssessmentAnswer } from "@grillme/domain";
import { useUiRuntime } from "./runtime";

type Props = { onOpenReview(): void };

const AnswerField = ({ activity, answer, send }: {
  activity: AssessmentActivity;
  answer: AssessmentAnswer;
  send(answer: AssessmentAnswer): void;
}) => {
  if (activity.type === "single-choice") return <fieldset><legend>{activity.prompt}</legend>{activity.choices.map((choice) => <label className="choice" key={choice.id}><input type="radio" name={activity.id} checked={answer === choice.id} onChange={() => send(choice.id)} /> {choice.label}</label>)}</fieldset>;
  if (activity.type === "multiple-choice") {
    const selected = Array.isArray(answer) ? answer : [];
    return <fieldset><legend>{activity.prompt}</legend>{activity.choices.map((choice) => <label className="choice" key={choice.id}><input type="checkbox" checked={selected.includes(choice.id)} onChange={() => send(selected.includes(choice.id) ? selected.filter((id) => id !== choice.id) : [...selected, choice.id])} /> {choice.label}</label>)}</fieldset>;
  }
  if (activity.type === "ordering") {
    const ordered = Array.isArray(answer) ? answer : activity.items.map(({ id }) => id);
    const move = (index: number, offset: number) => {
      const next = [...ordered];
      const target = index + offset;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target]!, next[index]!];
      send(next);
    };
    return <fieldset><legend>{activity.prompt}</legend><ol className="ordering">{ordered.map((id, index) => {
      const item = activity.items.find((candidate) => candidate.id === id)!;
      return <li key={id}><span>{item.label}</span><button type="button" className="small" disabled={index === 0} onClick={() => move(index, -1)}>Move up</button><button type="button" className="small" disabled={index === ordered.length - 1} onClick={() => move(index, 1)}>Move down</button></li>;
    })}</ol></fieldset>;
  }
  return <label><strong>{activity.prompt}</strong><textarea value={typeof answer === "string" ? answer : ""} onChange={(event) => send(event.target.value)} maxLength={1_000} /></label>;
};

export function AssessmentView({ onOpenReview }: Props) {
  const { fixtures, platform } = useUiRuntime();
  const machine = useMemo(() => createAssessmentSessionMachine(fixtures.assessment, platform), [fixtures.assessment, platform]);
  const [state, send] = useMachine(machine, {});
  const assessment = state.context.assessment as Assessment | null;
  const activity = assessment?.activities[state.context.currentIndex];

  useEffect(() => { document.querySelector<HTMLElement>("#assessment")?.focus(); }, [state.value, state.context.currentIndex]);

  if (state.matches("loading")) return <main id="assessment" tabIndex={-1}><h1>Loading baseline</h1><p role="status">Restoring your assessment…</p></main>;
  if (state.matches("failed")) return <main id="assessment" tabIndex={-1}><h1>Assessment unavailable</h1><p role="alert">{state.context.error?.message}</p><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button></main>;
  if (state.matches("abandoned")) return <main id="assessment" tabIndex={-1}><h1>Assessment paused</h1><p>Your saved responses remain on this device.</p><button className="primary" onClick={() => send({ type: "RETRY" })}>Resume</button></main>;
  if (!assessment) return <main id="assessment" tabIndex={-1}><h1>Assessment unavailable</h1></main>;

  if (state.matches("introduction")) {
    const complete = state.context.currentIndex >= assessment.activities.length;
    return <main id="assessment" tabIndex={-1}><p className="eyebrow">Provisional local grading</p><h1>{assessment.title}</h1><p>{assessment.description}</p><p>{assessment.activities.length} activities. Correct answers and rationale appear only after each submission.</p><button className="primary" onClick={() => send({ type: complete ? "FINISH" : "START" })}>{complete ? "View results" : state.context.progress?.responses.length ? "Resume baseline" : "Start baseline"}</button></main>;
  }

  if (state.matches("graded")) return <main id="assessment" tabIndex={-1}><p className="eyebrow">Baseline result</p><h1>Your skill gaps</h1><p>These results are provisional until server synchronization is available.</p><div className="results">{state.context.gaps.map((gap) => <section className={`result ${gap.weak ? "weak" : "strong"}`} key={gap.skillId}><h2>{gap.title}</h2><p>{gap.correct} of {gap.total} correct · {Math.round(gap.accuracy * 100)}% · average confidence {gap.averageConfidence.toFixed(1)}/5</p><p>{gap.weak ? gap.remediation : "Current evidence met the deterministic threshold."}</p></section>)}</div><button className="primary" onClick={onOpenReview}>Open review queue</button></main>;

  if (state.matches("submitting")) return <main id="assessment" tabIndex={-1}><h1>Preparing results</h1><p role="status">Calculating skill evidence and review schedule…</p></main>;
  if (state.matches("saving")) return <main id="assessment" tabIndex={-1}><h1>Saving response</h1><p role="status">Recording append-only evidence…</p></main>;
  if (state.matches("degraded")) return <main id="assessment" tabIndex={-1}><h1>Response not saved</h1><p role="alert">{state.context.error?.message}</p><div className="actions"><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button><button className="secondary" onClick={() => send({ type: "CONTINUE_OFFLINE" })}>Continue unsaved</button></div></main>;

  if (state.matches("reviewing") && state.context.reviewedResponse) {
    const submitted = assessment.activities.find(({ id }) => id === state.context.reviewedResponse?.activityId)!;
    return <main id="assessment" tabIndex={-1}><p className="eyebrow">Response review</p><h1>{state.context.reviewedResponse.correct ? "Correct" : "Needs review"}</h1><p>{submitted.rationale}</p><p>Confidence recorded: {state.context.reviewedResponse.confidence}/5</p><button className="primary" onClick={() => send({ type: "CONTINUE" })}>{state.context.currentIndex + 1 < assessment.activities.length ? "Next activity" : "Calculate results"}</button></main>;
  }

  if (!activity) return <main id="assessment" tabIndex={-1}><h1>Preparing results</h1></main>;
  const answerComplete = isAnswerComplete(activity, state.context.draftAnswer);
  return <main id="assessment" tabIndex={-1}><p className="eyebrow">Activity {state.context.currentIndex + 1} of {assessment.activities.length}</p><h1>Baseline assessment</h1><AnswerField activity={activity} answer={state.context.draftAnswer} send={(answer) => send({ type: "ANSWER", answer })} /><fieldset className="confidence"><legend>Confidence, 1 to 5</legend>{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name="confidence" checked={state.context.confidence === value} onChange={() => send({ type: "CONFIDENCE", value })} /> {value}</label>)}</fieldset><div className="actions"><button className="secondary" onClick={() => send({ type: "ABANDON" })}>Pause</button><button className="primary" disabled={!answerComplete} aria-describedby="submit-help" onClick={() => send({ type: "SUBMIT" })}>Submit response</button></div><p id="submit-help" className="form-help">{answerComplete ? "Your response is ready to submit." : "Provide a response before submitting."}</p></main>;
}