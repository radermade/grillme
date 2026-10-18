import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createManagedConsoleMachine } from "@grillme/machines";
import { CommandBar, Panel, StatusBadge } from "./primitives";
import { useUiRuntime } from "./runtime";

export function ManagedConsoleView({ labSessionId, checkpointId }: { labSessionId: string; checkpointId: string }) {
  const { connectivity, fixtures, managedConsole, platform } = useUiRuntime();
  const policy = fixtures.awsLabPolicy;
  const machine = useMemo(() => createManagedConsoleMachine(labSessionId, policy.id, policy.version, managedConsole, platform.navigation, platform.clock), [labSessionId, managedConsole, platform.clock, platform.navigation, policy.id, policy.version]);
  const [state, send] = useMachine(machine, {}); const { session, budget, validation, error } = state.context;
  useEffect(() => connectivity.subscribe((status) => send({ type: status === "online" ? "NETWORK_ONLINE" : "NETWORK_OFFLINE" })), [connectivity, send]);
  useEffect(() => { if (!state.matches("active")) return; const timer = window.setInterval(() => send({ type: "POLL" }), 30_000); return () => window.clearInterval(timer); }, [state.value, send]);
  if (state.matches("restoring") || state.matches("launching")) return <Panel title="Managed console companion"><p role="status">Preparing a one-time restricted console launch…</p></Panel>;
  if (state.matches("idle")) return <Panel title="Managed console companion" className="accent-cyan"><p>Open an isolated, policy-restricted console in a separate browser context. No AWS credentials are returned to Grill Me.</p><p>This local build uses a controlled provider and opens no real AWS environment.</p><button className="primary" onClick={() => send({ type: "LAUNCH" })}>Open managed console</button></Panel>;
  if (state.matches("offline")) return <Panel title="Managed console offline"><p role="alert">Console status and validation require a network connection.</p><button className="secondary" onClick={() => send({ type: "STOP" })}>End managed session</button></Panel>;
  if (state.matches("failed")) return <Panel title="Managed console unavailable"><p role="alert">{error?.message}</p><CommandBar><button onClick={() => send({ type: "RETRY" })}>Retry</button>{session && <button onClick={() => send({ type: "STOP" })}>End session</button>}</CommandBar></Panel>;
  if (state.matches("revoking") || state.matches("expired")) return <Panel title="Ending managed console"><p role="status">Revoking access before resource cleanup…</p></Panel>;
  if (state.matches("ended")) return <Panel title="Managed console ended"><p>Access was revoked and controlled resources were cleaned.</p></Panel>;
  if (state.matches("inconclusive")) return <Panel title="Validation inconclusive"><p role="alert">{validation?.feedback.join(" ")}</p><p>Your work was not marked incorrect.</p><CommandBar><button onClick={() => send({ type: "RETRY" })}>Retry validation</button><button onClick={() => send({ type: "STOP" })}>End session</button></CommandBar></Panel>;
  return <Panel title="Managed console companion" className="accent-cyan"><StatusBadge tone={session?.status === "active" ? "success" : "warning"}>{session?.status ?? "checking"}</StatusBadge><p>Region: {session?.region} · Expires: {session ? new Date(session.expiresAt).toLocaleTimeString() : "unknown"}</p><p>Spend: ${budget?.spentUsd.toFixed(2) ?? "0.00"} / ${session?.spendLimitUsd.toFixed(2) ?? "0.00"}</p>{validation && <p role="status">Last validation: {validation.status}</p>}<CommandBar label="Managed console actions"><button className="primary" disabled={!state.matches("active")} onClick={() => send({ type: "VALIDATE", checkpointId })}>Validate observable state</button><button className="secondary" disabled={!state.matches("active")} onClick={() => send({ type: "POLL" })}>Refresh status</button><button className="secondary" onClick={() => send({ type: "STOP" })}>End managed session</button></CommandBar></Panel>;
}