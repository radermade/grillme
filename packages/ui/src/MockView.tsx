import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createMockSessionMachine } from "@grillme/machines";
import { useUiRuntime } from "./runtime";

export function MockView({ onOpenReadiness }: { onOpenReadiness(): void }) {
  const { fixtures, platform } = useUiRuntime();
  const machine = useMemo(() => createMockSessionMachine(fixtures.mock, platform), [fixtures.mock, platform]);
  const [state, send] = useMachine(machine, {});
  const { mock, progress, evidence } = state.context;
  const item = mock.items[progress?.currentIndex ?? -1];
  useEffect(() => { const timer = window.setInterval(() => send({ type: "TICK" }), 1_000); return () => window.clearInterval(timer); }, [send]);
  useEffect(() => { document.querySelector<HTMLElement>("#mock")?.focus(); }, [state.value, progress?.currentIndex]);
  if (state.matches("loading")) return <main id="mock" tabIndex={-1}><h1>Loading mock preview</h1><p role="status">Restoring the timed session…</p></main>;
  if (state.matches("failed")) return <main id="mock" tabIndex={-1}><h1>Mock unavailable</h1><p role="alert">{state.context.error?.message}</p><button onClick={() => send({ type: "RETRY" })}>Retry</button></main>;
  if (state.matches("briefing")) return <main id="mock" tabIndex={-1}><p className="eyebrow">Original-content mock preview</p><h1>{mock.title}</h1><p>{mock.description}</p><p>{mock.items.length} items · {mock.durationMinutes} minutes · no hints</p><button className="primary" onClick={() => send({ type: progress ? "RESUME" : "START" })}>{progress ? "Resume" : "Start mock"}</button></main>;
  if (state.matches("paused")) return <main id="mock" tabIndex={-1}><h1>Mock paused</h1><p>The original deadline remains in effect.</p><button onClick={() => send({ type: "RESUME" })}>Resume</button><button onClick={() => send({ type: "FINISH" })}>Finish now</button></main>;
  if (state.matches("reviewingResults") || state.matches("complete")) return <main id="mock" tabIndex={-1}><p className="eyebrow">Mock preview complete</p><h1>Skill results</h1><p>This short preview contributes limited evidence and is not an exam simulation or pass prediction.</p><div className="results">{Object.entries(evidence?.skillScores ?? {}).map(([skillId, score]) => <section className={`result ${score >= .75 ? "strong" : "weak"}`} key={skillId}><h2>{skillId.replaceAll("-", " ")}</h2><p>{Math.round(score * 100)}%</p></section>)}</div><section><h2>Missed items</h2>{progress?.responses.some(({ correct }) => !correct) ? <ul>{progress.responses.filter(({ correct }) => !correct).map((response) => { const missed = mock.items.find(({ id }) => id === response.itemId)!; return <li key={response.itemId}><strong>{missed.prompt}</strong> {missed.rationale}</li>; })}</ul> : <p>No missed items in this preview.</p>}</section><button className="primary" onClick={onOpenReadiness}>Review readiness evidence</button></main>;
  if (state.matches("persisting") || state.matches("savingResponse") || state.matches("finalizing") || state.matches("timedOut")) return <main id="mock" tabIndex={-1}><h1>Saving mock session</h1><p role="status">Recording versioned evidence…</p></main>;
  if (!progress || !item) return <main id="mock" tabIndex={-1}><h1>Preparing results</h1></main>;
  const remaining = Math.max(0, Math.ceil((Date.parse(progress.expiresAt) - Date.parse(platform.clock.now())) / 60_000));
  return <main id="mock" tabIndex={-1}><p className="eyebrow">Item {progress.currentIndex + 1} of {mock.items.length} · about {remaining} minutes remaining</p><h1>Timed mock preview</h1><fieldset><legend>{item.prompt}</legend>{item.choices.map((choice) => <label className="choice" key={choice.id}><input type="radio" name={item.id} checked={state.context.selectedChoiceId === choice.id} onChange={() => send({ type: "CHOOSE", choiceId: choice.id })} /> {choice.label}</label>)}</fieldset><div className="actions"><button className="secondary" onClick={() => send({ type: "PAUSE" })}>Pause</button><button className="primary" disabled={!state.context.selectedChoiceId} onClick={() => send({ type: "SUBMIT" })}>Submit answer</button></div></main>;
}
