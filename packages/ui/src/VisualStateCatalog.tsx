import { CodeSurface, CommandBar, Panel, ProgressMeter, ResourceTable, StatusBadge } from "./primitives";
import { ThemeProvider } from "./theme";

const states = [
  { id: "loading", tone: "info", title: "Loading", detail: "Restoring versioned workspace state…" },
  { id: "empty", tone: "neutral", title: "Empty", detail: "No review items are due." },
  { id: "success", tone: "success", title: "Success", detail: "All observable checks passed." },
  { id: "degraded", tone: "warning", title: "Degraded", detail: "Work is available, but this result is not saved yet." },
  { id: "conflict", tone: "warning", title: "Conflict", detail: "A scored attempt requires deliberate reconciliation." },
  { id: "expired", tone: "error", title: "Expired", detail: "The temporary environment reached its TTL." },
  { id: "failure", tone: "error", title: "Failure", detail: "The operation failed safely and can be retried." },
] as const;

export function VisualStateCatalog() {
  return <ThemeProvider><main className="visual-state-catalog"><p className="eyebrow">Development fixture</p><h1>Portable visual states</h1><p>Deterministic fixtures for desktop and web review. These are presentation states, not workflow substitutes.</p>
    <div className="visual-state-grid">{states.map((state) => <Panel key={state.id} className={`visual-state ${state.id}`}><div data-visual-state={state.id}><StatusBadge tone={state.tone}>{state.title}</StatusBadge><h2>{state.title} state</h2><p role={state.id === "failure" ? "alert" : "status"}>{state.detail}</p>{state.id === "loading" && <ProgressMeter label="Restore progress" value={2} max={3} />}{state.id === "conflict" && <ResourceTable caption="Conflicting evidence" columns={["Attempt", "Version", "Decision"]} rows={[["attempt-2", "1.0.0", "Review required"]]} />}{state.id === "expired" && <CodeSurface label="Cleanup log">[info] access revoked{"\n"}[info] resources cleaned</CodeSurface>}<CommandBar label={`${state.title} actions`}><button className="primary">Primary action</button><button className="secondary">Secondary action</button></CommandBar></div></Panel>)}</div>
  </main></ThemeProvider>;
}