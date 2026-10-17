import type { ConsoleValidation, SemanticConsoleState } from "@grillme/domain";

const provenance = {
  validatorId: "bedrock-semantic-console", validatorVersion: "1.0.0", bundleId: "bedrock-console-bundle", bundleVersion: "1.0.0",
  mappingId: "bedrock-guardrail-console", mappingVersion: "1.0.0", presentationMappingVersion: "1.0.0", templateId: "semantic-console-state", templateVersion: "1.0.0",
  region: "us-east-1", provider: "simulator" as const, providerAdapterVersion: "1.0.0",
};
const result = (checks: Array<{ id: string; passed: boolean; message: string }>, observedAt = new Date(0).toISOString()): ConsoleValidation => ({
  schemaVersion: 1,
  status: checks.every(({ passed }) => passed) ? "passed" : "failed",
  provenance,
  passedCheckIds: checks.filter(({ passed }) => passed).map(({ id }) => id),
  failedCheckIds: checks.filter(({ passed }) => !passed).map(({ id }) => id),
  feedback: checks.filter(({ passed }) => !passed).map(({ message }) => message),
  evidence: checks.map(({ id, passed }) => ({ checkId: id, observed: String(passed), expected: "true" })),
  inconclusiveReason: null,
  observedAt,
});

export function validateSemanticConsoleState(checkpointId: string, state: SemanticConsoleState, observedAt = new Date(0).toISOString()): ConsoleValidation {
  const guardrail = state.resources.find(({ id }) => id === "safe-output");
  const invocation = state.resources.find(({ id }) => id === "model-invocation");
  if (checkpointId === "create") return result([
    { id: "guardrail-created", passed: guardrail?.status === "active", message: "Create the active safe-output guardrail." },
  ], observedAt);
  if (checkpointId === "configure") return result([
    { id: "strict-policy", passed: guardrail?.properties.policy === "strict", message: "Set the guardrail content policy to strict." },
    { id: "output-blocking", passed: guardrail?.properties["block-output"] === true, message: "Enable unsafe output blocking." },
  ], observedAt);
  if (checkpointId === "inspect") return result([
    { id: "inspected", passed: state.logs.some(({ category }) => category === "inspection"), message: "Inspect the guardrail details." },
    { id: "observable-active", passed: guardrail?.status === "active", message: "Confirm the active guardrail state." },
  ], observedAt);
  if (checkpointId === "troubleshoot") return result([
    { id: "guardrail-attached", passed: invocation?.properties["guardrail-attached"] === true, message: "Attach safe-output to the invocation." },
    { id: "attachment-relationship", passed: state.relationships.some(({ from, to, type }) => from === "model-invocation" && to === "safe-output" && type === "uses-guardrail"), message: "Create the invocation-to-guardrail relationship." },
  ], observedAt);
  return { schemaVersion: 1, status: "inconclusive", provenance, passedCheckIds: [], failedCheckIds: [], feedback: ["This checkpoint is not supported by the simulator."], evidence: [], inconclusiveReason: "unavailable-evidence", observedAt };
}
