import { parseAwsLabOperation } from "@grillme/content";
import type { AwsCredentialLease, AwsLabOperation, AwsOperationReceipt } from "@grillme/domain";
import type { AwsLabServiceDependencies, AwsLeaseRecord } from "./aws-lab-contracts";

export class AwsLabServiceError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "EXPIRED" | "SPEND_EXCEEDED", message: string) { super(message); this.name = "AwsLabServiceError"; }
}
const addMinutes = (value: string, minutes: number) => new Date(Date.parse(value) + minutes * 60_000).toISOString();
const tagsMatch = (required: Record<string, string>, actual: Record<string, string>) => Object.entries(required).every(([key, value]) => actual[key] === value);
const allowedOperation = (record: AwsLeaseRecord, operation: AwsLabOperation) => {
  const { policy, lease } = record;
  return operation.region === policy.region
    && operation.region === lease.region
    && policy.allowedServices.includes(operation.service)
    && policy.allowedActions.includes(operation.action)
    && policy.resourcePrefixes.some((prefix) => operation.resource.startsWith(prefix))
    && tagsMatch(policy.requiredTags, operation.resourceTags)
    && operation.estimatedCostUsd <= policy.spendLimitUsd - lease.spentUsd;
};
export const createAwsLabService = (deps: AwsLabServiceDependencies) => {
  const authenticate = async (authorization: string) => {
    const auth = await deps.auth.authenticate(authorization);
    if (!auth) throw new AwsLabServiceError("UNAUTHORIZED", "Authentication is required.");
    return auth;
  };
  const revokeRecord = async (record: AwsLeaseRecord, operation: "revoke" | "expire" | "sweep") => {
    if (record.lease.status === "revoked" || record.lease.status === "expired") return record.lease;
    const revoking = await deps.leases.transitionToRevoking(record.lease.id);
    if (!revoking || revoking.lease.status === "revoked" || revoking.lease.status === "expired") return revoking?.lease ?? record.lease;
    await deps.provider.revoke(revoking.providerHandle);
    const latest = await deps.leases.get(record.lease.id) ?? revoking;
    const lease = { ...latest.lease, status: operation === "expire" ? "expired" as const : "revoked" as const };
    await deps.leases.put({ ...latest, lease });
    await deps.audit.record({ schemaVersion: 1, id: deps.ids.create(), leaseId: lease.id, labSessionId: lease.labSessionId, operation, outcome: "completed", policyId: record.policy.id, operationId: null, costUsd: 0, occurredAt: deps.clock.now() });
    return lease;
  };
  const ownedLease = async (authorization: string, leaseId: string) => {
    const auth = await authenticate(authorization);
    const record = await deps.leases.get(leaseId);
    if (!record || record.userId !== auth.userId) throw new AwsLabServiceError("NOT_FOUND", "Credential lease is unavailable.");
    if (record.lease.status !== "active") throw new AwsLabServiceError("EXPIRED", "Credential lease is not active.");
    if (Date.parse(record.lease.expiresAt) <= Date.parse(deps.clock.now())) {
      await revokeRecord(record, "expire");
      throw new AwsLabServiceError("EXPIRED", "Credential lease expired.");
    }
    return record;
  };
  return {
    async restore(authorization: string, labSessionId: string): Promise<AwsCredentialLease | null> {
      const auth = await authenticate(authorization);
      const record = await deps.leases.findBySession(labSessionId);
      if (!record || record.userId !== auth.userId) return null;
      if (Date.parse(record.lease.expiresAt) <= Date.parse(deps.clock.now())) { await revokeRecord(record, "expire"); return null; }
      return record.lease;
    },
    async issue(authorization: string, labSessionId: string, policyId: string, policyVersion: string): Promise<AwsCredentialLease> {
      const auth = await authenticate(authorization);
      const sessionRecord = await deps.labSessions.get(labSessionId);
      if (!sessionRecord || sessionRecord.userId !== auth.userId || sessionRecord.stopped || sessionRecord.session.status !== "ready") throw new AwsLabServiceError("NOT_FOUND", "Active lab session is required.");
      const policy = await deps.policies.find(policyId, policyVersion);
      if (!policy || policy.labId !== sessionRecord.session.labId || policy.labVersion !== sessionRecord.session.labVersion) throw new AwsLabServiceError("FORBIDDEN", "AWS lab policy is unavailable.");
      if (!await deps.entitlements.authorize({ userId: auth.userId, labId: policy.labId, labVersion: policy.labVersion, feature: "restricted-aws-lab" })) throw new AwsLabServiceError("FORBIDDEN", "Restricted AWS lab access is unavailable.");
      const current = await deps.leases.findBySession(labSessionId);
      if (current && Date.parse(current.lease.expiresAt) > Date.parse(deps.clock.now())) return current.lease;
      if (current) await revokeRecord(current, "expire");
      const issuedAt = deps.clock.now();
      const expiresAt = [addMinutes(issuedAt, policy.credentialDurationMinutes), sessionRecord.session.expiresAt].sort()[0]!;
      const lease: AwsCredentialLease = { schemaVersion: 1, id: deps.ids.create(), labSessionId, status: "active", region: policy.region, issuedAt, expiresAt, spendLimitUsd: policy.spendLimitUsd, spentUsd: 0 };
      const issued = await deps.provider.issue({ leaseId: lease.id, providerRoleConfigId: policy.providerRoleConfigId, region: policy.region, expiresAt, requiredTags: policy.requiredTags });
      const record: AwsLeaseRecord = { lease, userId: auth.userId, policy, providerHandle: issued.providerHandle, revision: 1, receipts: {}, reservations: {} };
      const stored = await deps.leases.putIfAbsentSession(record);
      if (!stored.created) {
        await deps.provider.revoke(issued.providerHandle);
        return stored.existing.lease;
      }
      await deps.audit.record({ schemaVersion: 1, id: deps.ids.create(), leaseId: lease.id, labSessionId, operation: "issue", outcome: "completed", policyId, operationId: null, costUsd: 0, occurredAt: issuedAt });
      return lease;
    },
    async execute(authorization: string, leaseId: string, input: unknown): Promise<AwsOperationReceipt> {
      const operation = parseAwsLabOperation(input);
      if (!operation) throw new AwsLabServiceError("INVALID_REQUEST", "AWS operation is invalid.");
      const record = await ownedLease(authorization, leaseId);
      if (!allowedOperation(record, operation)) {
        await deps.audit.record({ schemaVersion: 1, id: deps.ids.create(), leaseId, labSessionId: record.lease.labSessionId, operation: "execute", outcome: "denied", policyId: record.policy.id, operationId: operation.id, costUsd: 0, occurredAt: deps.clock.now() });
        throw new AwsLabServiceError(record.lease.spentUsd + operation.estimatedCostUsd > record.lease.spendLimitUsd ? "SPEND_EXCEEDED" : "FORBIDDEN", "AWS operation is outside the lab policy.");
      }
      const reservation = await deps.leases.reserveOperation(leaseId, operation);
      if (reservation.status === "duplicate") return reservation.receipt;
      if (reservation.status === "inactive") throw new AwsLabServiceError("EXPIRED", "Credential lease is not active.");
      if (reservation.status === "conflict") throw new AwsLabServiceError("INVALID_REQUEST", "AWS operation is already in progress.");
      if (reservation.status === "spend-exceeded") throw new AwsLabServiceError("SPEND_EXCEEDED", "AWS lab spend ceiling reached.");
      try {
        const result = await deps.provider.execute(reservation.record.providerHandle, operation);
        if (result.costUsd > operation.estimatedCostUsd) {
          await deps.leases.cancelOperation(leaseId, operation.idempotencyKey);
          await revokeRecord(reservation.record, "revoke");
          throw new AwsLabServiceError("SPEND_EXCEEDED", "Provider cost exceeded the reserved operation cost.");
        }
        const receipt = await deps.leases.completeOperation(leaseId, operation, result.costUsd, deps.clock.now());
        await deps.audit.record({ schemaVersion: 1, id: deps.ids.create(), leaseId, labSessionId: reservation.record.lease.labSessionId, operation: "execute", outcome: "completed", policyId: reservation.record.policy.id, operationId: operation.id, costUsd: result.costUsd, occurredAt: receipt.occurredAt });
        return receipt;
      } catch (error) {
        await deps.leases.cancelOperation(leaseId, operation.idempotencyKey);
        throw error;
      }
    },
    async revoke(authorization: string, leaseId: string): Promise<AwsCredentialLease> {
      const auth = await authenticate(authorization);
      const record = await deps.leases.get(leaseId);
      if (!record || record.userId !== auth.userId) throw new AwsLabServiceError("NOT_FOUND", "Credential lease is unavailable.");
      return revokeRecord(record, "revoke");
    },
    async revokeForSession(labSessionId: string): Promise<void> {
      const record = await deps.leases.findBySession(labSessionId);
      if (record) await revokeRecord(record, "revoke");
    },
    async revokeForUser(userId: string): Promise<void> {
      const records = (await deps.leases.listActive()).filter((record) => record.userId === userId);
      for (const record of records) await revokeRecord(record, "revoke");
    },
    async sweep(): Promise<{ expired: number; orphaned: number }> {
      const active = await deps.leases.listActive();
      const expired = active.filter(({ lease }) => Date.parse(lease.expiresAt) <= Date.parse(deps.clock.now()));
      for (const record of expired) await revokeRecord(record, "expire");
      const knownHandles = new Set((await deps.leases.listActive()).map(({ providerHandle }) => providerHandle));
      const orphaned = (await deps.provider.listActiveHandles()).filter((handle) => !knownHandles.has(handle));
      for (const handle of orphaned) await deps.provider.revoke(handle);
      return { expired: expired.length, orphaned: orphaned.length };
    },
  };
};
