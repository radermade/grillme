import { assign, fromPromise, setup } from "xstate";
import { parseSummary, parseSyncEvents, parseSyncPushResult } from "@grillme/content";
import type { AuthoritativeProgressSummary, SyncConflict, SyncEvent } from "@grillme/domain";
import type { ConnectivityPort, StoragePort, SyncPort } from "@grillme/platform";

const queueKey = (courseId: string, courseVersion: string) => `sync-pending:${courseId}:${courseVersion}`;
const summaryKey = (courseId: string, courseVersion: string) => `sync-summary:${courseId}:${courseVersion}`;
type Context = { courseId: string; pending: SyncEvent[]; summary: AuthoritativeProgressSummary | null; conflicts: SyncConflict[]; attempts: number; error: string | null };
type Event = { type: "SYNC" } | { type: "ENQUEUE"; event: SyncEvent } | { type: "RETRY" } | { type: "NETWORK_OFFLINE" } | { type: "NETWORK_ONLINE" } | { type: "RESOLVE_CONFLICTS" };
type Loaded = { pending: SyncEvent[]; summary: AuthoritativeProgressSummary | null };
type Pushed = { acceptedIds: string[]; conflicts: SyncConflict[] };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;

export const createSyncMachine = (courseId: string, courseVersion: string, storage: StoragePort, remote: SyncPort, connectivity: ConnectivityPort) => {
  const persistQueue = async (pending: SyncEvent[]) => storage.set(queueKey(courseId, courseVersion), pending);
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<Loaded>(async () => ({ pending: parseSyncEvents(await storage.get(queueKey(courseId, courseVersion))) ?? [], summary: parseSummary(await storage.get(summaryKey(courseId, courseVersion))) })),
      push: fromPromise<Pushed, { pending: SyncEvent[] }>(async ({ input }) => {
        const result = parseSyncPushResult(await remote.push(input.pending));
        if (!result) throw new Error("Invalid sync response.");
        return result;
      }),
      pull: fromPromise<AuthoritativeProgressSummary>(async () => {
        const summary = parseSummary(await remote.pull(courseId, courseVersion));
        if (!summary) throw new Error("Invalid summary.");
        return summary;
      }),
      persist: fromPromise<void, { pending: SyncEvent[] }>(async ({ input }) => persistQueue(input.pending)),
    },
    guards: { online: () => connectivity.current() === "online", hasPending: ({ context }) => context.pending.length > 0, retryAvailable: ({ context }) => context.attempts < 3 },
    actions: {
      loaded: assign(({ event }) => ({ ...output<Loaded>(event), error: null })),
      enqueue: assign(({ context, event }) => event.type === "ENQUEUE" && event.event.courseId === courseId && event.event.courseVersion === courseVersion && !context.pending.some(({ idempotencyKey }) => idempotencyKey === event.event.idempotencyKey) ? { pending: [...context.pending, event.event] } : {}),
      pushed: assign(({ context, event }) => { const result = output<Pushed>(event); const accepted = new Set(result.acceptedIds); return { pending: context.pending.filter(({ id }) => !accepted.has(id)), conflicts: result.conflicts, attempts: 0, error: null }; }),
      pulled: assign(({ event }) => ({ summary: output<AuthoritativeProgressSummary>(event), error: null })),
      incrementAttempt: assign({ attempts: ({ context }) => context.attempts + 1 }),
      failed: assign({ error: () => "Progress synchronization is temporarily unavailable." }),
      clearConflicts: assign({ conflicts: () => [] }),
    },
  }).createMachine({
    id: "synchronization",
    initial: "loading",
    context: { courseId, pending: [], summary: null, conflicts: [], attempts: 0, error: null },
    on: { ENQUEUE: { actions: "enqueue" } },
    states: {
      loading: { invoke: { src: "load", onDone: { target: "idle", actions: "loaded" }, onError: { target: "failed", actions: "failed" } } },
      idle: {
        on: {
          ENQUEUE: { target: "persisting", actions: "enqueue" },
          SYNC: [{ target: "offline", guard: ({ context }) => connectivity.current() === "offline" }, { target: "pushing", guard: "hasPending" }, { target: "pulling", guard: "online" }],
          NETWORK_OFFLINE: "offline",
        },
      },
      persisting: { invoke: { src: "persist", input: ({ context }) => ({ pending: context.pending }), onDone: "idle", onError: { target: "degraded", actions: "failed" } } },
      pushing: { invoke: { src: "push", input: ({ context }) => ({ pending: context.pending }), onDone: { target: "reconciling", actions: "pushed" }, onError: [{ target: "backoff", guard: "retryAvailable", actions: ["incrementAttempt", "failed"] }, { target: "failed", actions: "failed" }] } },
      reconciling: { always: [{ target: "conflict", guard: ({ context }) => context.conflicts.length > 0 }, { target: "persistingAfterPush" }] },
      persistingAfterPush: { invoke: { src: "persist", input: ({ context }) => ({ pending: context.pending }), onDone: "pulling", onError: { target: "degraded", actions: "failed" } } },
      pulling: { invoke: { src: "pull", onDone: { target: "savingSummary", actions: "pulled" }, onError: [{ target: "backoff", guard: "retryAvailable", actions: ["incrementAttempt", "failed"] }, { target: "failed", actions: "failed" }] } },
      savingSummary: { invoke: { src: "persist", input: ({ context }) => ({ pending: context.pending }), onDone: "idle", onError: { target: "degraded", actions: "failed" } }, entry: ({ context }) => { if (context.summary) void storage.set(summaryKey(courseId, courseVersion), context.summary); } },
      conflict: { on: { RESOLVE_CONFLICTS: { target: "persistingAfterPush", actions: "clearConflicts" }, ENQUEUE: { actions: "enqueue" } } },
      backoff: { after: { 1000: [{ target: "offline", guard: ({ context }) => connectivity.current() === "offline" }, { target: "pushing", guard: "hasPending" }, { target: "pulling" }] }, on: { NETWORK_OFFLINE: "offline", RETRY: [{ target: "pushing", guard: "hasPending" }, { target: "pulling" }] } },
      offline: { on: { ENQUEUE: { target: "persistingOffline", actions: "enqueue" }, NETWORK_ONLINE: [{ target: "pushing", guard: "hasPending" }, { target: "pulling" }] } },
      persistingOffline: { invoke: { src: "persist", input: ({ context }) => ({ pending: context.pending }), onDone: "offline", onError: { target: "degraded", actions: "failed" } } },
      degraded: { on: { RETRY: "loading", NETWORK_OFFLINE: "offline" } },
      failed: { on: { RETRY: "loading", NETWORK_OFFLINE: "offline" } },
    },
  });
};
