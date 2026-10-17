import type { AwsLabOperation } from "@grillme/domain";
import type { AwsLeaseRecord, AwsLeaseStore, RestrictedAwsProvider } from "./aws-lab-contracts";

export const createControlledAwsProvider = (): RestrictedAwsProvider => {
  const handles = new Set<string>();
  return {
    async issue({ leaseId }) { const providerHandle = `private:${leaseId}`; handles.add(providerHandle); return { providerHandle }; },
    async execute(providerHandle, operation: AwsLabOperation) {
      if (!handles.has(providerHandle)) throw new Error("Provider lease unavailable.");
      return { costUsd: operation.estimatedCostUsd };
    },
    async revoke(providerHandle) { handles.delete(providerHandle); },
    async listActiveHandles() { return [...handles]; },
  };
};

export const createMemoryAwsLeaseStore = (): AwsLeaseStore => {
  const records = new Map<string, AwsLeaseRecord>();
  const locks = new Map<string, Promise<void>>();
  const exclusive = async <T>(leaseId: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(leaseId) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    locks.set(leaseId, queued);
    await previous;
    try { return await operation(); } finally { release(); if (locks.get(leaseId) === queued) locks.delete(leaseId); }
  };
  return {
    async findBySession(sessionId) { return [...records.values()].find(({ lease }) => lease.labSessionId === sessionId && lease.status === "active") ?? null; },
    async get(leaseId) { return records.get(leaseId) ?? null; },
    async put(record) { records.set(record.lease.id, record); },
    putIfAbsentSession(record) {
      return exclusive(`session:${record.lease.labSessionId}`, async () => {
        const existing = [...records.values()].find(({ lease }) => lease.labSessionId === record.lease.labSessionId && lease.status === "active");
        if (existing) return { created: false, existing } as const;
        records.set(record.lease.id, record);
        return { created: true } as const;
      });
    },
    transitionToRevoking(leaseId) {
      return exclusive(leaseId, async () => {
        const record = records.get(leaseId);
        if (!record) return null;
        if (record.lease.status !== "active") return record;
        const next = { ...record, revision: record.revision + 1, lease: { ...record.lease, status: "revoking" as const } };
        records.set(leaseId, next);
        return next;
      });
    },
    reserveOperation(leaseId, operation) {
      return exclusive(leaseId, async () => {
        const record = records.get(leaseId);
        if (!record || record.lease.status !== "active") return { status: "inactive" } as const;
        const receipt = record.receipts[operation.idempotencyKey];
        if (receipt) return { status: "duplicate", receipt } as const;
        if (record.reservations[operation.idempotencyKey] !== undefined) return { status: "conflict" } as const;
        const reserved = Object.values(record.reservations).reduce((sum, value) => sum + value, 0);
        if (record.lease.spentUsd + reserved + operation.estimatedCostUsd > record.lease.spendLimitUsd) return { status: "spend-exceeded" } as const;
        const next = { ...record, revision: record.revision + 1, reservations: { ...record.reservations, [operation.idempotencyKey]: operation.estimatedCostUsd } };
        records.set(leaseId, next);
        return { status: "reserved", record: next } as const;
      });
    },
    completeOperation(leaseId, operation, costUsd, occurredAt) {
      return exclusive(leaseId, async () => {
        const record = records.get(leaseId);
        if (!record) throw new Error("Lease unavailable.");
        const receipt = { schemaVersion: 1 as const, operationId: operation.id, leaseId, status: "accepted" as const, costUsd, spentUsd: record.lease.spentUsd + costUsd, occurredAt };
        const reservations = { ...record.reservations };
        delete reservations[operation.idempotencyKey];
        records.set(leaseId, { ...record, revision: record.revision + 1, lease: { ...record.lease, spentUsd: receipt.spentUsd }, receipts: { ...record.receipts, [operation.idempotencyKey]: receipt }, reservations });
        return receipt;
      });
    },
    cancelOperation(leaseId, idempotencyKey) {
      return exclusive(leaseId, async () => {
        const record = records.get(leaseId);
        if (!record) return;
        const reservations = { ...record.reservations };
        delete reservations[idempotencyKey];
        records.set(leaseId, { ...record, revision: record.revision + 1, reservations });
      });
    },
    async listActive() { return [...records.values()].filter(({ lease }) => lease.status === "active" || lease.status === "revoking"); },
  };
};
