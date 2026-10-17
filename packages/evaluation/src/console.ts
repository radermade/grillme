import type { ConsoleValidation, SemanticConsoleState } from "@grillme/domain";

const result = (checks: Array<{ id: string; passed: boolean; message: string }>): ConsoleValidation => ({
  status: checks.every(({ passed }) => passed) ? "passed" : "failed",
  passedCheckIds: checks.filter(({ passed }) => passed).map(({ id }) => id),
  failedCheckIds: checks.filter(({ passed }) => !passed).map(({ id }) => id),
  feedback: checks.filter(({ passed }) => !passed).map(({ message }) => message),
});

export function validateSemanticConsoleState(checkpointId: string, state: SemanticConsoleState): ConsoleValidation {
  const guardrail = state.resources.find(({ id }) => id === "safe-output");
  const invocation = state.resources.find(({ id }) => id === "model-invocation");
  if (checkpointId === "create") return result([
    { id: "guardrail-created", passed: guardrail?.status === "active", message: "Create the active safe-output guardrail." },
  ]);
  if (checkpointId === "configure") return result([
    { id: "strict-policy", passed: guardrail?.properties.policy === "strict", message: "Set the guardrail content policy to strict." },
    { id: "output-blocking", passed: guardrail?.properties["block-output"] === true, message: "Enable unsafe output blocking." },
  ]);
  if (checkpointId === "inspect") return result([
    { id: "inspected", passed: state.logs.some(({ category }) => category === "inspection"), message: "Inspect the guardrail details." },
    { id: "observable-active", passed: guardrail?.status === "active", message: "Confirm the active guardrail state." },
  ]);
  if (checkpointId === "troubleshoot") return result([
    { id: "guardrail-attached", passed: invocation?.properties["guardrail-attached"] === true, message: "Attach safe-output to the invocation." },
    { id: "attachment-relationship", passed: state.relationships.some(({ from, to, type }) => from === "model-invocation" && to === "safe-output" && type === "uses-guardrail"), message: "Create the invocation-to-guardrail relationship." },
  ]);
  return { status: "inconclusive", passedCheckIds: [], failedCheckIds: [], feedback: ["This checkpoint is not supported by the simulator."] };
}