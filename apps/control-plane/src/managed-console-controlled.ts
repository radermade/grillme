import type { LabValidation, ManagedConsoleSession, ValidationProvenance } from "@grillme/domain";
import type { ManagedConsoleProvider, ManagedConsoleRecord, ManagedConsoleStore } from "./managed-console-contracts";

export const createControlledManagedConsoleProvider = (now: () => string, ids: { create(): string }): ManagedConsoleProvider & { events: string[]; setSpent(providerHandle: string, spentUsd: number): void } => {
  const handles = new Map<string, { access: boolean; resources: boolean; spentUsd: number }>(); const events: string[] = [];
  return {
    events,
    setSpent(providerHandle, spentUsd) { const value = handles.get(providerHandle); if (value) value.spentUsd = spentUsd; },
    async allocate({ sessionId }) { const providerHandle = `private-managed:${sessionId}`; handles.set(providerHandle, { access: true, resources: true, spentUsd: 0 }); events.push(`allocate:${providerHandle}`); return { providerHandle }; },
    async createLaunch(providerHandle, expiresAt) { const state = handles.get(providerHandle); if (!state?.access) throw new Error("Access unavailable."); const launchExpiresAt = [new Date(Date.parse(now()) + 60_000).toISOString(), expiresAt].sort()[0]!; return { launchUrl: `https://console.invalid/federate/${ids.create()}`, launchExpiresAt }; },
    async status(providerHandle) { return handles.get(providerHandle)?.access ? "active" : "missing"; },
    async validate(providerHandle, checkpointId, provenance, observedAt): Promise<LabValidation> { if (!handles.get(providerHandle)?.access) throw new Error("Access unavailable."); if (checkpointId !== "reliability") return { schemaVersion: 1, status: "inconclusive", provenance, failedCheckIds: [], feedback: ["Checkpoint is unsupported by the controlled managed provider."], evidence: [], inconclusiveReason: "unavailable-evidence", observedAt }; return { schemaVersion: 1, status: "passed", provenance, failedCheckIds: [], feedback: [], evidence: [{ checkId: "managed-bedrock-observable", observed: "true", expected: "true" }], inconclusiveReason: null, observedAt }; },
    async budget(providerHandle) { const value = handles.get(providerHandle); if (!value) throw new Error("Provider unavailable."); return { spentUsd: value.spentUsd }; },
    async revokeAccess(providerHandle) { const value = handles.get(providerHandle); if (value) value.access = false; events.push(`revoke:${providerHandle}`); },
    async cleanupResources(providerHandle) { const value = handles.get(providerHandle); if (value) value.resources = false; events.push(`cleanup:${providerHandle}`); },
    async listActiveHandles() { return [...handles.entries()].filter(([, value]) => value.access || value.resources).map(([handle]) => handle); },
  };
};

export const createMemoryManagedConsoleStore = (): ManagedConsoleStore & { records: Map<string, ManagedConsoleRecord> } => {
  const records = new Map<string, ManagedConsoleRecord>();
  return {
    records,
    async findByLabSession(labSessionId) { return [...records.values()].find((record) => record.session.labSessionId === labSessionId && record.session.status === "active") ?? null; },
    async get(sessionId) { return records.get(sessionId) ?? null; },
    async put(record) { records.set(record.session.id, record); },
    async putIfAbsent(record) { const existing = [...records.values()].find((value) => value.session.labSessionId === record.session.labSessionId && value.session.status === "active"); if (existing) return { created: false, existing }; records.set(record.session.id, record); return { created: true }; },
    async consumeLaunch(sessionId) { const record = records.get(sessionId); if (!record || record.launchConsumedAt === "pending" || record.launchCount >= 3) return null; const next = { ...record, launchCount: record.launchCount + 1, launchConsumedAt: "pending", revision: record.revision + 1 }; records.set(sessionId, next); return next; },
    async finishLaunch(sessionId, issuedAt) { const record = records.get(sessionId); if (!record || record.launchConsumedAt !== "pending") return null; const next = { ...record, launchConsumedAt: issuedAt, revision: record.revision + 1 }; records.set(sessionId, next); return next; },
    async listActive() { return [...records.values()].filter(({ session, accessRevoked, resourcesCleaned }) => session.status === "active" || session.status === "revoking" || !accessRevoked || !resourcesCleaned); },
  };
};

export const createMemoryManagedConsoleAudit = () => { const events: import("@grillme/domain").ManagedConsoleAuditEvent[] = []; return { events, async record(value: import("@grillme/domain").ManagedConsoleAuditEvent) { events.push(value); } }; };