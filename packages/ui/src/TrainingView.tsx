import { useEffect, useMemo, useState } from "react";
import { useMachine } from "@xstate/react";
import { createScenarioSessionMachine } from "@grillme/machines";
import type { Scenario, ScenarioMode } from "@grillme/domain";
import { useUiRuntime } from "./runtime";

const modes: Array<{ id: ScenarioMode; title: string; description: string }> = [
  { id: "walkthrough", title: "Walkthrough", description: "Instructions and rationale are visible before each checkpoint." },
  { id: "practice", title: "Practice", description: "Work from objectives and reveal progressive hints when needed." },
  { id: "challenge", title: "Challenge", description: "Work independently from objectives and validator feedback." },
];

export function TrainingView() {
  const { fixtures, platform } = useUiRuntime();
  const machine = useMemo(() => createScenarioSessionMachine(fixtures.scenarios, platform), [fixtures.scenarios, platform]);
  const [state, send] = useMachine(machine, {});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const context = state.context;
  const scenario = context.scenario as Scenario | null;
  const checkpoint = scenario?.checkpoints[context.progress?.checkpointIndex ?? -1];

  useEffect(() => { document.querySelector<HTMLElement>("#training")?.focus(); }, [state.value, context.progress?.checkpointIndex]);

  if (state.matches("selection")) return <main id="training" tabIndex={-1}><p className="eyebrow">Hands-on training</p><h1>Choose a scenario</h1><p>These fixtures prove the reusable engine. They are not the finished course library.</p><div className="scenario-grid">{context.scenarios.map((item) => <article className="result" key={item.id}><p className="eyebrow">{item.kind}</p><h2>{item.title}</h2><p>{item.description}</p><button className="primary" onClick={() => send({ type: "SELECT_SCENARIO", scenarioId: item.id })}>Choose scenario</button></article>)}</div></main>;

  if (state.matches("modeSelection")) return <main id="training" tabIndex={-1}><p className="eyebrow">{scenario?.kind}</p><h1>{scenario?.title}</h1><h2>Choose guidance</h2><div className="scenario-grid">{modes.map((mode) => <article className="result" key={mode.id}><h3>{mode.title}</h3><p>{mode.description}</p><button className="primary" onClick={() => send({ type: "SELECT_MODE", mode: mode.id })}>Use {mode.title}</button></article>)}</div></main>;

  if (state.matches("loading")) return <main id="training" tabIndex={-1}><h1>Loading scenario</h1><p role="status">Restoring your checkpoint…</p></main>;
  if (state.matches("failed")) return <main id="training" tabIndex={-1}><h1>Scenario unavailable</h1><p role="alert">{context.error?.message}</p><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button></main>;
  if (!scenario || !checkpoint || !context.progress) return <main id="training" tabIndex={-1}><h1>Scenario unavailable</h1></main>;

  if (state.matches("briefing")) return <main id="training" tabIndex={-1}><p className="eyebrow">{context.mode} · Checkpoint {context.progress.checkpointIndex + 1} of {scenario.checkpoints.length}</p><h1>{checkpoint.title}</h1><p className="prompt">{checkpoint.objective}</p><button className="primary" onClick={() => send({ type: "START" })}>Start checkpoint</button></main>;
  if (state.matches("demonstrating")) return <main id="training" tabIndex={-1}><p className="eyebrow">Walkthrough</p><h1>{checkpoint.title}</h1><div className="callout info"><strong>Do this</strong><p>{checkpoint.instruction}</p></div><div className="callout info"><strong>Why it matters</strong><p>{checkpoint.rationale}</p></div><button className="primary" onClick={() => send({ type: "CONTINUE" })}>Open workspace</button></main>;
  if (state.matches("validating")) return <main id="training" tabIndex={-1}><h1>Checking workspace</h1><p role="status">Running deterministic checkpoint validators…</p></main>;
  if (state.matches("degraded")) return <main id="training" tabIndex={-1}><h1>Attempt not saved</h1><p role="alert">{context.error?.message}</p><div className="actions"><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry save</button><button className="secondary" onClick={() => send({ type: "CONTINUE_OFFLINE" })}>Continue unsaved</button></div></main>;
  if (state.matches("failedCheckpoint")) return <main id="training" tabIndex={-1}><p className="eyebrow">Checkpoint needs revision</p><h1>{checkpoint.title}</h1><ul>{context.validation?.feedback.map((message) => <li key={message}>{message}</li>)}</ul><p>{context.validation?.passedCheckIds.length ?? 0} checks passed · {context.validation?.failedCheckIds.length ?? 0} checks failed</p><div className="actions"><button className="secondary" onClick={() => send({ type: "RESET_CHECKPOINT" })}>Reset checkpoint</button><button className="primary" onClick={() => send({ type: "REVISE" })}>Revise workspace</button></div></main>;
  if (state.matches("passedCheckpoint")) return <main id="training" tabIndex={-1}><p className="eyebrow">Checkpoint passed</p><h1>{checkpoint.title}</h1><p>All {context.validation?.passedCheckIds.length} outcome checks passed.</p><p>Guidance used: {context.mode}; hints: {context.progress.hintLevel}; resets: {context.progress.resets}; attempts: {context.progress.attempts}.</p><button className="primary" onClick={() => send({ type: "CONTINUE" })}>{context.progress.checkpointIndex + 1 < scenario.checkpoints.length ? "Next checkpoint" : "View debrief"}</button></main>;
  if (state.matches("debriefing")) return <main id="training" tabIndex={-1}><p className="eyebrow">Debrief</p><h1>{scenario.title}</h1><section className="result weak"><h2>Root cause</h2><p>{scenario.debrief.rootCause}</p></section><section className="result strong"><h2>Prevention</h2><p>{scenario.debrief.prevention}</p></section><p>{scenario.debrief.explanation}</p><button className="primary" onClick={() => send({ type: "CONTINUE" })}>Complete scenario</button></main>;
  if (state.matches("complete")) return <main id="training" tabIndex={-1}><p className="eyebrow">Training complete</p><h1>{scenario.title}</h1><p>You completed this scenario in {context.mode} mode. Guided completion demonstrates practice, not independent mastery.</p></main>;

  const workspace = context.progress.workspace;
  const shownHints = context.mode === "practice" ? checkpoint.hints.slice(0, context.progress.hintLevel) : [];
  return <main id="training" tabIndex={-1}><p className="eyebrow">{context.mode} · Checkpoint {context.progress.checkpointIndex + 1} of {scenario.checkpoints.length}</p><h1>{checkpoint.title}</h1><p className="prompt">{checkpoint.objective}</p>{context.mode === "walkthrough" && <aside className="callout info"><strong>Walkthrough instruction</strong><p>{checkpoint.instruction}</p><p>{checkpoint.rationale}</p></aside>}{shownHints.map((hint, index) => <aside className="callout info" key={hint}><strong>Hint {index + 1}</strong><p>{hint}</p></aside>)}
    {scenario.resources.length > 0 && <section><h2>Evidence</h2><div className="resource-grid">{scenario.resources.map((resource) => <article className="resource" key={resource.id}><h3>{resource.title}</h3><pre><code>{resource.body}</code></pre></article>)}</div></section>}
    {scenario.availableComponents.length > 0 && <fieldset><legend>Components</legend>{scenario.availableComponents.map((component) => <label className="choice" key={component.id}><input type="checkbox" checked={workspace.selectedComponents.includes(component.id)} onChange={() => send({ type: "TOGGLE_COMPONENT", componentId: component.id })} /> {component.label}</label>)}</fieldset>}
    {scenario.availableComponents.length > 1 && <fieldset><legend>Add a directed connection</legend><label>From<select value={from} onChange={(event) => setFrom(event.target.value)}><option value="">Choose component</option>{workspace.selectedComponents.map((id) => <option key={id} value={id}>{scenario.availableComponents.find((item) => item.id === id)?.label}</option>)}</select></label><label>To<select value={to} onChange={(event) => setTo(event.target.value)}><option value="">Choose component</option>{workspace.selectedComponents.map((id) => <option key={id} value={id}>{scenario.availableComponents.find((item) => item.id === id)?.label}</option>)}</select></label><button className="secondary" disabled={!from || !to || from === to} onClick={() => send({ type: "CONNECT", from, to })}>Add connection</button><ul>{workspace.connections.map((connection) => <li key={`${connection.from}-${connection.to}`}>{connection.from} → {connection.to}</li>)}</ul></fieldset>}
    {scenario.availableSettings.length > 0 && <fieldset><legend>Configuration</legend>{scenario.availableSettings.map((setting) => <label className="setting" key={setting.id}>{setting.label}<select value={workspace.settings[setting.id] ?? ""} onChange={(event) => send({ type: "SET_SETTING", settingId: setting.id, value: event.target.value })}>{setting.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</fieldset>}
    {scenario.kind === "debugging" && <label><strong>Diagnosis</strong><textarea value={workspace.diagnosis} maxLength={5_000} onChange={(event) => send({ type: "SET_DIAGNOSIS", value: event.target.value })} /></label>}
    <div className="actions">{context.mode === "practice" && context.progress.hintLevel < checkpoint.hints.length && <button className="secondary" onClick={() => send({ type: "SHOW_HINT" })}>Show next hint</button>}<button className="secondary" onClick={() => send({ type: "RESET_CHECKPOINT" })}>Reset checkpoint</button><button className="primary" onClick={() => send({ type: "VALIDATE" })}>Validate outcomes</button></div>
  </main>;
}