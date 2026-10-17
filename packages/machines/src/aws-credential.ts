import { assign, fromPromise, setup } from "xstate";
import { parseAwsCredentialLease, parseAwsLabOperation, parseAwsLabPolicy, parseAwsOperationReceipt } from "@grillme/content";
import type { AppError, AwsCredentialLease, AwsLabOperation, AwsLabPolicy, AwsOperationReceipt } from "@grillme/domain";
import type { AwsLabPort, ClockPort, StoragePort } from "@grillme/platform";

const leaseKey = (labSessionId: string, policy: AwsLabPolicy) => `aws-lease:${labSessionId}:${policy.id}:${policy.version}`;
type Context = { policy: AwsLabPolicy; labSessionId: string; lease: AwsCredentialLease | null; pendingOperation: AwsLabOperation | null; lastReceipt: AwsOperationReceipt | null; error: AppError | null };
type Event = { type: "ISSUE" } | { type: "EXECUTE"; operation: AwsLabOperation } | { type: "REVOKE" } | { type: "NETWORK_OFFLINE" } | { type: "NETWORK_ONLINE" } | { type: "TICK" } | { type: "RETRY" };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;

export const createAwsCredentialMachine = (policySource: unknown, labSessionId: string, storage: StoragePort, remote: AwsLabPort, clock: ClockPort) => {
  const policy = parseAwsLabPolicy(policySource);
  const key = leaseKey(labSessionId, policy);
  const save = async (lease: AwsCredentialLease) => storage.set(key, lease);
  const clear = async () => storage.remove(key);
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      restoreLocal: fromPromise(async () => parseAwsCredentialLease(await storage.get(key))),
      restoreRemote: fromPromise<AwsCredentialLease, { labSessionId: string }>(async ({ input }) => { const lease = parseAwsCredentialLease(await remote.restore(input.labSessionId)); if (!lease) throw new Error("Lease unavailable."); return lease; }),
      issue: fromPromise(async () => { const lease = parseAwsCredentialLease(await remote.issue(labSessionId, policy.id, policy.version)); if (!lease) throw new Error("Lease invalid."); return lease; }),
      execute: fromPromise<AwsOperationReceipt, { leaseId: string; operation: AwsLabOperation }>(async ({ input }) => { const operation = parseAwsLabOperation(input.operation); if (!operation) throw new Error("Operation invalid."); const receipt = parseAwsOperationReceipt(await remote.execute(input.leaseId, operation)); if (!receipt) throw new Error("Receipt invalid."); return receipt; }),
      revoke: fromPromise<void, { leaseId: string }>(async ({ input }) => remote.revoke(input.leaseId)),
      persist: fromPromise<void, { lease: AwsCredentialLease }>(async ({ input }) => save(input.lease)),
      remove: fromPromise(clear),
    },
    guards: {
      localActive: ({ event }) => { const lease = output<AwsCredentialLease | null>(event); return !!lease && lease.labSessionId === labSessionId && lease.status === "active" && Date.parse(lease.expiresAt) > Date.parse(clock.now()) && lease.spentUsd < lease.spendLimitUsd; },
      hasLease: ({ context }) => !!context.lease,
      expired: ({ context }) => !!context.lease && Date.parse(context.lease.expiresAt) <= Date.parse(clock.now()),
      spendExhausted: ({ context }) => !!context.lease && context.lease.spentUsd >= context.lease.spendLimitUsd,
    },
    actions: {
      acceptLocal: assign(({ event }) => ({ lease: output<AwsCredentialLease | null>(event), error: null })),
      acceptLease: assign(({ event }) => ({ lease: output<AwsCredentialLease>(event), error: null })),
      stageOperation: assign(({ event }) => event.type === "EXECUTE" ? { pendingOperation: event.operation } : {}),
      acceptReceipt: assign(({ context, event }) => { const receipt = output<AwsOperationReceipt>(event); return { lastReceipt: receipt, pendingOperation: null, lease: context.lease ? { ...context.lease, spentUsd: receipt.spentUsd } : null, error: null }; }),
      markRevoking: assign(({ context }) => ({ lease: context.lease ? { ...context.lease, status: "revoking" as const } : null })),
      markRevoked: assign(({ context }) => ({ lease: context.lease ? { ...context.lease, status: "revoked" as const } : null, pendingOperation: null })),
      markExpired: assign(({ context }) => ({ lease: context.lease ? { ...context.lease, status: "expired" as const } : null, pendingOperation: null })),
      failed: assign({ error: () => ({ code: "UNKNOWN" as const, message: "Restricted AWS access is temporarily unavailable." }) }),
      offline: assign({ error: () => ({ code: "UNKNOWN" as const, message: "Restricted AWS labs require a network connection." }) }),
      clearLease: assign({ lease: null, pendingOperation: null }),
    },
  }).createMachine({
    id: "awsCredential",
    initial: "checking",
    context: { policy, labSessionId, lease: null, pendingOperation: null, lastReceipt: null, error: null },
    states: {
      checking: { invoke: { src: "restoreLocal", onDone: [{ target: "reconnecting", guard: "localActive", actions: "acceptLocal" }, { target: "idle" }], onError: "idle" } },
      idle: { on: { ISSUE: "requesting", NETWORK_OFFLINE: { actions: "offline" } } },
      requesting: { invoke: { src: "issue", onDone: { target: "persistingLease", actions: "acceptLease" }, onError: { target: "failed", actions: "failed" } } },
      persistingLease: { invoke: { src: "persist", input: ({ context }) => ({ lease: context.lease! }), onDone: "active", onError: { target: "revoking", actions: "failed" } } },
      active: { always: [{ target: "expired", guard: "expired" }, { target: "revoking", guard: "spendExhausted" }], on: { EXECUTE: { target: "executing", actions: "stageOperation" }, REVOKE: { target: "revoking", actions: "markRevoking" }, NETWORK_OFFLINE: { target: "reconnecting", actions: "offline" }, TICK: { target: "expired", guard: "expired" } } },
      executing: { invoke: { src: "execute", input: ({ context }) => ({ leaseId: context.lease!.id, operation: context.pendingOperation! }), onDone: { target: "persistingReceipt", actions: "acceptReceipt" }, onError: { target: "failed", actions: "failed" } } },
      persistingReceipt: { invoke: { src: "persist", input: ({ context }) => ({ lease: context.lease! }), onDone: "active", onError: { target: "revoking", actions: "failed" } } },
      reconnecting: { on: { NETWORK_ONLINE: "restoringRemote", REVOKE: { target: "revoking", guard: "hasLease", actions: "markRevoking" }, TICK: { target: "expired", guard: "expired" } } },
      restoringRemote: { invoke: { src: "restoreRemote", input: ({ context }) => ({ labSessionId: context.labSessionId }), onDone: { target: "active", actions: "acceptLease" }, onError: { target: "expired", actions: "markExpired" } } },
      revoking: { invoke: { src: "revoke", input: ({ context }) => ({ leaseId: context.lease!.id }), onDone: { target: "removing", actions: "markRevoked" }, onError: { target: "failed", actions: "failed" } } },
      expired: { entry: "markExpired", always: [{ target: "revoking", guard: "hasLease" }, { target: "removing" }] },
      removing: { invoke: { src: "remove", onDone: { target: "revoked", actions: "clearLease" }, onError: { target: "revoked", actions: "clearLease" } } },
      revoked: {},
      failed: { on: { RETRY: [{ target: "restoringRemote", guard: "hasLease" }, { target: "requesting" }], REVOKE: { target: "revoking", guard: "hasLease", actions: "markRevoking" } } },
    },
  });
};
