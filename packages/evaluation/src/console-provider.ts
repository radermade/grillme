import type { ConsoleOperationRequest, ConsoleOperationResult, ConsoleResource, ConsoleValue, SemanticConsoleState } from "@grillme/domain";
import type { ConsolePort } from "@grillme/platform";
import { validateSemanticConsoleState } from "./console";

const clone = (state: SemanticConsoleState): SemanticConsoleState => structuredClone(state);
const text = (values: Record<string, ConsoleValue>, key: string) => typeof values[key] === "string" ? values[key] : "";
const log = (state: SemanticConsoleState, prefix: string, category: string, message: string, now: string) => state.logs.push({ id: `${prefix}-${now.replace(/[^0-9]/g, "")}`, level: "info", category, message, occurredAt: now });

export function createDeterministicConsolePort(now: () => string): ConsolePort {
  return {
    async operate(request: ConsoleOperationRequest): Promise<ConsoleOperationResult> {
      const state = clone(request.state);
      const timestamp = now();
      if (request.scenarioId !== "bedrock-guardrail-console" || request.scenarioVersion !== "1.0.0") throw new Error("CONSOLE_SCENARIO_UNSUPPORTED");
      if (request.operationId === "create-guardrail") {
        if (text(request.values, "name") !== "safe-output" || text(request.values, "policy") !== "standard") throw new Error("CONSOLE_INPUT_INVALID");
        const resource: ConsoleResource = { id: "safe-output", targetId: "guardrail-policy", serviceId: "amazon-bedrock", type: "guardrail", name: "safe-output", status: "active", properties: { policy: "standard", "block-output": false }, updatedAt: timestamp };
        state.resources = [...state.resources.filter(({ id }) => id !== resource.id), resource];
        log(state, "create", "configuration", "Guardrail safe-output created.", timestamp);
        return { schemaVersion: 1, operationId: request.operationId, state, changedResourceIds: [resource.id] };
      }
      const guardrail = state.resources.find(({ id }) => id === "safe-output");
      if (!guardrail) throw new Error("CONSOLE_RESOURCE_MISSING");
      if (request.operationId === "configure-guardrail") {
        if (text(request.values, "policy") !== "strict" || text(request.values, "block-output") !== "on") throw new Error("CONSOLE_INPUT_INVALID");
        guardrail.properties = { ...guardrail.properties, policy: "strict", "block-output": true }; guardrail.updatedAt = timestamp;
        log(state, "configure", "configuration", "Guardrail strict output controls saved.", timestamp);
        return { schemaVersion: 1, operationId: request.operationId, state, changedResourceIds: [guardrail.id] };
      }
      if (request.operationId === "inspect-guardrail") {
        log(state, "inspect", "inspection", "Guardrail details inspected.", timestamp);
        return { schemaVersion: 1, operationId: request.operationId, state, changedResourceIds: [] };
      }
      if (request.operationId === "troubleshoot-invocation") {
        if (text(request.values, "action") !== "attach-guardrail") throw new Error("CONSOLE_INPUT_INVALID");
        const invocation = state.resources.find(({ id }) => id === "model-invocation");
        if (!invocation) throw new Error("CONSOLE_RESOURCE_MISSING");
        invocation.properties = { ...invocation.properties, "guardrail-attached": true }; invocation.status = "active"; invocation.updatedAt = timestamp;
        state.relationships = [...state.relationships.filter(({ id }) => id !== "invocation-guardrail"), { id: "invocation-guardrail", from: invocation.id, to: guardrail.id, type: "uses-guardrail" }];
        log(state, "attach", "troubleshooting", "Guardrail attached to model invocation.", timestamp);
        return { schemaVersion: 1, operationId: request.operationId, state, changedResourceIds: [invocation.id] };
      }
      throw new Error("CONSOLE_OPERATION_UNSUPPORTED");
    },
    async validate(scenarioId, scenarioVersion, checkpointId, state) {
      if (scenarioId !== "bedrock-guardrail-console" || scenarioVersion !== "1.0.0") throw new Error("CONSOLE_SCENARIO_UNSUPPORTED");
      return validateSemanticConsoleState(checkpointId, state, now());
    },
  };
}