import type { LabOperation, LabSession, LabValidation } from "@grillme/domain";
import type { PrivateLabDefinition, SandboxProvider } from "./lab-contracts";

export const createControlledSandboxProvider = (): SandboxProvider => {
  const environments = new Map<string, Set<LabOperation>>();
  return {
    async provision({ sessionId }) { environments.set(sessionId, new Set()); return { environmentId: sessionId, connectionTicket: `controlled-${sessionId}` }; },
    async status(environmentId) { return environments.has(environmentId) ? "ready" : "missing"; },
    async operate(environmentId, operation) {
      const state = environments.get(environmentId);
      if (!state) throw new Error("Environment unavailable.");
      if (operation === "reset-workspace") state.clear(); else state.add(operation);
    },
    async validate(environmentId, checks: PrivateLabDefinition["validators"][string], provenance: LabSession["provenance"], observedAt: string): Promise<LabValidation> {
      const state = environments.get(environmentId);
      if (!state) throw new Error("Environment unavailable.");
      const failed = checks.filter(({ operation, expected }) => state.has(operation) !== expected);
      const { compatibilityId: _, compatibilityVersion: __, ...validationProvenance } = provenance;
      return { schemaVersion: 1, status: failed.length === 0 ? "passed" : "failed", provenance: validationProvenance, failedCheckIds: failed.map(({ id }) => id), feedback: failed.map(({ message }) => message), evidence: checks.map(({ id, operation, expected }) => ({ checkId: id, observed: String(state.has(operation)), expected: String(expected) })), inconclusiveReason: null, observedAt };
    },
    async destroy(environmentId) { environments.delete(environmentId); },
  };
};

export const createMemoryLabSessionStore = (): import("./lab-contracts").LabSessionStore => {
  const records = new Map<string, import("./lab-contracts").LabSessionRecord>();
  return { async get(id) { return records.get(id) ?? null; }, async put(record) { records.set(record.session.id, record); }, async listActive() { return [...records.values()].filter(({ stopped }) => !stopped); } };
};
