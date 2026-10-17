import type { LabDefinition, LabOperation, LabSession, LabValidation } from "@grillme/domain";
import type { LabProvisionResponse, LabServiceDependencies, LabSessionRecord } from "./lab-contracts";

export class LabServiceError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "QUOTA_EXCEEDED" | "NOT_FOUND" | "EXPIRED", message: string) { super(message); this.name = "LabServiceError"; }
}
const addMinutes = (timestamp: string, minutes: number) => new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
const publicDefinition = (definition: Awaited<ReturnType<LabServiceDependencies["definitions"]["find"]>>): LabDefinition | null => {
  if (!definition) return null;
  const { validators: _, ...visible } = definition;
  return visible;
};
export const createLabService = (deps: LabServiceDependencies) => {
  const authorized = async (authorization: string, sessionId: string): Promise<LabSessionRecord> => {
    const auth = await deps.auth.authenticate(authorization);
    if (!auth) throw new LabServiceError("UNAUTHORIZED", "Authentication is required.");
    const record = await deps.sessions.get(sessionId);
    if (!record || record.userId !== auth.userId) throw new LabServiceError("NOT_FOUND", "Lab session is unavailable.");
    if (record.stopped || record.session.status === "cleaned") throw new LabServiceError("NOT_FOUND", "Lab session is unavailable.");
    if (Date.parse(record.session.expiresAt) <= Date.parse(deps.clock.now())) {
      await stopRecord(record, "expire");
      throw new LabServiceError("EXPIRED", "Lab session expired.");
    }
    return record;
  };
  const stopRecord = async (record: LabSessionRecord, operation: "stop" | "expire") => {
    if (!record.stopped) {
      await deps.credentialRevoker?.revokeForSession(record.session.id);
      await deps.provider.destroy(record.environmentId);
    }
    const session = { ...record.session, status: "cleaned" as const };
    await deps.sessions.put({ ...record, session, stopped: true });
    await deps.quota.release(record.session.id);
    await deps.audit.record({ sessionId: record.session.id, userId: record.userId, labId: record.session.labId, operation, outcome: "cleaned", occurredAt: deps.clock.now() });
    return session;
  };
  return {
    async definition(labId: string, labVersion: string): Promise<LabDefinition> {
      const definition = publicDefinition(await deps.definitions.find(labId, labVersion));
      if (!definition) throw new LabServiceError("NOT_FOUND", "Lab is unavailable.");
      return definition;
    },
    async provision(authorization: string, labId: string, labVersion: string): Promise<LabProvisionResponse> {
      const auth = await deps.auth.authenticate(authorization);
      if (!auth) throw new LabServiceError("UNAUTHORIZED", "Authentication is required.");
      const definition = await deps.definitions.find(labId, labVersion);
      if (!definition) throw new LabServiceError("NOT_FOUND", "Lab is unavailable.");
      if (!await deps.entitlements.authorize({ userId: auth.userId, courseId: definition.courseId, courseVersion: definition.courseVersion, feature: "sandbox-lab" })) throw new LabServiceError("FORBIDDEN", "Lab access is unavailable.");
      if ((await deps.sessions.listActive()).some(({ userId, stopped }) => userId === auth.userId && !stopped)) throw new LabServiceError("QUOTA_EXCEEDED", "Only one sandbox lab can run at a time.");
      const sessionId = deps.ids.create();
      if (!await deps.quota.reserve({ userId: auth.userId, sessionId, costUnits: definition.estimatedCostUnits, maxDurationMinutes: definition.maxDurationMinutes })) throw new LabServiceError("QUOTA_EXCEEDED", "Lab quota is exhausted.");
      const createdAt = deps.clock.now();
      const expiresAt = addMinutes(createdAt, definition.maxDurationMinutes);
      let environmentId: string | null = null;
      try {
        const provisioned = await deps.provider.provision({ sessionId, imageDigest: definition.imageDigest, expiresAt });
        environmentId = provisioned.environmentId;
        const session: LabSession = { schemaVersion: 1, id: sessionId, labId, labVersion, status: "ready", terminalPath: `/labs/${sessionId}/terminal`, editorPath: `/labs/${sessionId}/editor`, createdAt, expiresAt };
        await deps.sessions.put({ session, userId: auth.userId, environmentId: provisioned.environmentId, stopped: false, validationAttempts: {}, validationResults: {} });
        await deps.audit.record({ sessionId, userId: auth.userId, labId, operation: "provision", outcome: "ready", occurredAt: createdAt });
        return { session, connectionTicket: provisioned.connectionTicket };
      } catch (error) {
        if (environmentId) await deps.provider.destroy(environmentId).catch(() => undefined);
        await deps.quota.release(sessionId);
        throw error;
      }
    },
    async status(authorization: string, sessionId: string): Promise<LabSession> {
      const record = await authorized(authorization, sessionId);
      const status = await deps.provider.status(record.environmentId);
      if (status !== "ready") throw new LabServiceError("NOT_FOUND", "Lab environment is unavailable.");
      return record.session;
    },
    async operate(authorization: string, sessionId: string, operation: LabOperation): Promise<void> {
      const record = await authorized(authorization, sessionId);
      await deps.provider.operate(record.environmentId, operation);
      await deps.audit.record({ sessionId, userId: record.userId, labId: record.session.labId, operation: "operate", outcome: operation, occurredAt: deps.clock.now() });
    },
    async validate(authorization: string, sessionId: string, checkpointId: string, attemptId: string): Promise<LabValidation> {
      const record = await authorized(authorization, sessionId);
      const cached = record.validationResults[attemptId];
      if (cached) return cached;
      const definition = await deps.definitions.find(record.session.labId, record.session.labVersion);
      const checks = definition?.validators[checkpointId];
      if (!definition || !checks || !attemptId || attemptId.length > 300) throw new LabServiceError("INVALID_REQUEST", "Checkpoint is invalid.");
      const attempts = record.validationAttempts[checkpointId] ?? 0;
      if (attempts >= definition.maxAttempts) throw new LabServiceError("QUOTA_EXCEEDED", "Checkpoint attempt limit reached.");
      const result = await deps.provider.validate(record.environmentId, checks);
      await deps.sessions.put({ ...record, validationAttempts: { ...record.validationAttempts, [checkpointId]: attempts + 1 }, validationResults: { ...record.validationResults, [attemptId]: result } });
      await deps.audit.record({ sessionId, userId: record.userId, labId: record.session.labId, operation: "validate", outcome: result.passed ? "passed" : "failed", occurredAt: deps.clock.now() });
      return result;
    },
    async stop(authorization: string, sessionId: string): Promise<LabSession> {
      const auth = await deps.auth.authenticate(authorization);
      if (!auth) throw new LabServiceError("UNAUTHORIZED", "Authentication is required.");
      const record = await deps.sessions.get(sessionId);
      if (!record || record.userId !== auth.userId) throw new LabServiceError("NOT_FOUND", "Lab session is unavailable.");
      if (record.stopped) return record.session;
      return stopRecord(record, "stop");
    },
    async sweepExpired(): Promise<number> {
      const expired = (await deps.sessions.listActive()).filter(({ session, stopped }) => !stopped && Date.parse(session.expiresAt) <= Date.parse(deps.clock.now()));
      for (const record of expired) await stopRecord(record, "expire");
      return expired.length;
    },
  };
};
