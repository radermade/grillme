import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createLabSessionMachine } from "@grillme/machines";
import type { LabOperation } from "@grillme/domain";
import { useUiRuntime } from "./runtime";
import { AwsLabView } from "./AwsLabView";

const operations: Array<{ id: LabOperation; label: string }> = [
  { id: "set-retry-limit", label: "Set retry limit to two calls" },
  { id: "enable-strict-schema", label: "Enable strict output schema" },
  { id: "enable-output-blocking", label: "Block unsafe output" },
  { id: "sanitize-telemetry", label: "Sanitize telemetry" },
  { id: "reset-workspace", label: "Reset remote workspace" },
];
export function LabView() {
  const { connectivity, fixtures, labs, platform } = useUiRuntime();
  const machine = useMemo(() => createLabSessionMachine(fixtures.lab, platform.storage, labs, platform.clock), [fixtures.lab, labs, platform.clock, platform.storage]);
  const [state, send] = useMachine(machine, {});
  const { lab, progress, error } = state.context;
  const checkpoint = lab.checkpoints[progress?.checkpointIndex ?? 0];
  useEffect(() => connectivity.subscribe((status) => send({ type: status === "online" ? "NETWORK_ONLINE" : "NETWORK_OFFLINE" })), [send]);
  useEffect(() => { const timer = window.setInterval(() => send({ type: "TICK" }), 30_000); return () => window.clearInterval(timer); }, [send]);
  useEffect(() => { document.querySelector<HTMLElement>("#lab")?.focus(); }, [state.value]);
  if (state.matches("restoring")) return <main id="lab" tabIndex={-1}><h1>Restoring lab</h1><p role="status">Checking for an active sandbox…</p></main>;
  if (state.matches("requested")) return <main id="lab" tabIndex={-1}><p className="eyebrow">Controlled sandbox</p><h1>{lab.title}</h1><p>{lab.description}</p><p>Duration: {lab.maxDurationMinutes} minutes · Cost ceiling: {lab.estimatedCostUnits} unit · Online only</p>{error && <p role="alert">{error.message}</p>}<button className="primary" onClick={() => send({ type: "REQUEST" })}>Provision sandbox</button></main>;
  if (state.matches("provisioning") || state.matches("persistingReady") || state.matches("checkingSession")) return <main id="lab" tabIndex={-1}><h1>Preparing sandbox</h1><p role="status">Starting or reconnecting to the isolated environment…</p></main>;
  if (state.matches("reconnecting")) return <main id="lab" tabIndex={-1}><h1>Lab disconnected</h1><p role="alert">Sandbox work is online only. Your session remains reserved until its TTL.</p><button className="secondary" onClick={() => send({ type: "STOP" })}>End lab</button></main>;
  if (state.matches("failed")) return <main id="lab" tabIndex={-1}><h1>Lab interrupted</h1><p role="alert">{error?.message}</p><div className="actions"><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button>{progress && <button className="secondary" onClick={() => send({ type: "STOP" })}>End lab</button>}</div></main>;
  if (state.matches("cleaned")) return <main id="lab" tabIndex={-1}><p className="eyebrow">Sandbox cleaned</p><h1>{lab.title}</h1><p>The disposable environment was terminated.</p>{progress?.completedCheckpointIds.length === lab.checkpoints.length && <><h2>Debrief</h2><p>{lab.debrief.explanation}</p><p>{lab.debrief.prevention}</p></>}</main>;
  if (!progress || !checkpoint) return <main id="lab" tabIndex={-1}><h1>Lab unavailable</h1></main>;
  if (state.matches("ready")) return <main id="lab" tabIndex={-1}><p className="eyebrow">Sandbox ready</p><h1>{checkpoint.title}</h1><p>Expires {new Date(progress.expiresAt).toLocaleTimeString()}</p><button className="primary" onClick={() => send({ type: "START" })}>Open controlled workspace</button></main>;
  if (state.matches("validating") || state.matches("persistingValidation") || state.matches("operating") || state.matches("stopping")) return <main id="lab" tabIndex={-1}><h1>{state.matches("stopping") ? "Cleaning sandbox" : "Updating sandbox"}</h1><p role="status">The server is processing the request…</p></main>;
  if (state.matches("passedCheckpoint")) return <main id="lab" tabIndex={-1}><p className="eyebrow">Checkpoint passed</p><h1>{checkpoint.title}</h1><button className="primary" onClick={() => send({ type: "CONTINUE" })}>{progress.checkpointIndex + 1 < lab.checkpoints.length ? "Next checkpoint" : "Finish and clean sandbox"}</button></main>;
  const hints = checkpoint.hints.slice(0, progress.hintLevel);
  return <main id="lab" tabIndex={-1}><p className="eyebrow">Remote controlled workspace · Attempt {progress.attempts + 1} of {lab.maxAttempts}</p><h1>{checkpoint.title}</h1><p className="prompt">{checkpoint.objective}</p><p>{checkpoint.instructions}</p><p>Expires {new Date(progress.expiresAt).toLocaleTimeString()}</p>
    {hints.map((hint, index) => <aside className="callout info" key={hint}><strong>Hint {index + 1}</strong><p>{hint}</p></aside>)}
    <fieldset><legend>Workspace operations</legend>{operations.map((operation) => <button className="secondary" key={operation.id} onClick={() => send({ type: "OPERATE", operation: operation.id })}>{operation.label}</button>)}</fieldset>
    {progress.lastValidation && <section className={`result ${progress.lastValidation.passed ? "strong" : "weak"}`} aria-live="polite"><h2>Server validation</h2>{progress.lastValidation.feedback.length ? <ul>{progress.lastValidation.feedback.map((message) => <li key={message}>{message}</li>)}</ul> : <p>All observable checks passed.</p>}</section>}
    <AwsLabView labSessionId={progress.sessionId} />
    <div className="actions">{progress.hintLevel < checkpoint.hints.length && <button className="secondary" onClick={() => send({ type: "SHOW_HINT" })}>Show hint</button>}<button className="primary" disabled={progress.attempts >= lab.maxAttempts} onClick={() => send({ type: "VALIDATE" })}>Validate remotely</button><button className="secondary" onClick={() => send({ type: "STOP" })}>End lab</button></div>
  </main>;
}
