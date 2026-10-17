import { assign, fromPromise, setup } from "xstate";
import type { ConsoleDriftJourney, ConsoleDriftSuspicion, ConsoleMappingRelease } from "@grillme/domain";
import type { ConsoleDriftDependencies, ConsoleDriftRunResult } from "./console-drift-contracts";
import { createConsoleDriftService } from "./console-drift";

type Context = { journeyId: string; region: string; journey: ConsoleDriftJourney | null; identityHandle: string | null; result: ConsoleDriftRunResult | null; suspicion: ConsoleDriftSuspicion | null; release: ConsoleMappingRelease | null; error: string | null };
type Event = { type: "START" } | { type: "RETRY" } | { type: "CANCEL" } | { type: "REVIEW"; input: unknown } | { type: "CREATE_RELEASE"; previousPresentationVersion: string; nextPresentationVersion: string } | { type: "PUBLISH"; input: unknown };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;
export const createConsoleDriftMachine = (journeyId: string, region: string, deps: ConsoleDriftDependencies) => {
  const service = createConsoleDriftService(deps);
  const recordAudit = (operation: "run" | "observe" | "diff" | "review" | "release" | "cleanup", outcome: "allowed" | "denied" | "completed" | "failed", costUnits = 0) => deps.audit.record({ schemaVersion: 1, id: deps.ids.create(), journeyId, operation, outcome, costUnits, occurredAt: deps.clock.now() });
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      prepare: fromPromise<ConsoleDriftJourney>(async () => {
        try { const journey = await service.prepare(journeyId, region); await recordAudit("run", "allowed"); return journey; }
        catch (error) { await recordAudit("run", "denied"); throw error; }
      }),
      authorize: fromPromise<{ handle: string; issuedAt: string; expiresAt: string }, { journey: ConsoleDriftJourney }>(async ({ input }) => service.authorize(input.journey, region)),
      crawlAndDiff: fromPromise<ConsoleDriftRunResult, { journey: ConsoleDriftJourney; identityHandle: string }>(async ({ input, signal }) => {
        try {
          const observation = await service.crawl(input.journey, region, input.identityHandle, signal);
          await recordAudit("observe", "completed", observation.costUnits);
          const result = await service.diff(input.journey, observation);
          await recordAudit("diff", "completed", observation.costUnits);
          return result;
        }
        finally {
          try { await deps.crawler.cleanup({ journey: input.journey, region, identityHandle: input.identityHandle }); }
          finally { await deps.identity.revoke(input.identityHandle); }
        }
      }),
      review: fromPromise<ConsoleDriftSuspicion, { suspicionId: string; input: unknown }>(async ({ input }) => { const reviewed = await service.review(input.suspicionId, input.input); await recordAudit("review", "completed"); return reviewed; }),
      createRelease: fromPromise<ConsoleMappingRelease, { suspicionId: string; previous: string; next: string }>(async ({ input }) => service.createRelease(input.suspicionId, input.previous, input.next)),
      publish: fromPromise<ConsoleMappingRelease, { releaseId: string; input: unknown }>(async ({ input }) => { const released = await service.release(input.releaseId, input.input); await recordAudit("release", "completed"); return released; }),
      cleanup: fromPromise<void, { identityHandle: string | null }>(async ({ input }) => { if (input.identityHandle) await deps.identity.revoke(input.identityHandle); await service.cleanup(); await recordAudit("cleanup", "completed"); }),
    },
    delays: { crawlTimeout: ({ context }) => (context.journey?.maxDurationSeconds ?? 600) * 1_000 },
    guards: {
      hasJourney: ({ context }) => !!context.journey,
      hasIdentity: ({ context }) => !!context.journey && !!context.identityHandle,
      hasSuspicion: ({ context }) => !!context.result?.suspicion,
      accepted: ({ context }) => context.suspicion?.status === "accepted",
      hasRelease: ({ context }) => !!context.release,
    },
    actions: {
      prepared: assign(({ event }) => ({ journey: output<ConsoleDriftJourney>(event), error: null })),
      authorized: assign(({ event }) => ({ identityHandle: output<{ handle: string }>(event).handle, error: null })),
      completed: assign(({ event }) => { const result = output<ConsoleDriftRunResult>(event); return { result, suspicion: result.suspicion, identityHandle: null, error: null }; }),
      reviewed: assign(({ event }) => ({ suspicion: output<ConsoleDriftSuspicion>(event), error: null })),
      releaseCreated: assign(({ event }) => ({ release: output<ConsoleMappingRelease>(event), error: null })),
      released: assign(({ event }) => ({ release: output<ConsoleMappingRelease>(event), error: null })),
      failed: assign({ error: () => "The bounded console canary run failed safely." }),
      cleaned: assign({ identityHandle: () => null }),
      clear: assign({ result: () => null, suspicion: () => null, release: () => null, error: () => null }),
    },
  }).createMachine({
    id: "consoleDrift", initial: "scheduled",
    context: { journeyId, region, journey: null, identityHandle: null, result: null, suspicion: null, release: null, error: null },
    states: {
      scheduled: { on: { START: { target: "authorizing", actions: "clear" } } },
      authorizing: { invoke: { src: "prepare", onDone: { target: "acquiringIdentity", actions: "prepared" }, onError: { target: "cleaningFailure", actions: "failed" } }, on: { CANCEL: "cleaningCancelled" } },
      acquiringIdentity: { invoke: { src: "authorize", input: ({ context }) => ({ journey: context.journey! }), onDone: { target: "navigating", actions: "authorized" }, onError: { target: "cleaningFailure", actions: "failed" } }, on: { CANCEL: "cleaningCancelled" } },
      navigating: { invoke: { src: "crawlAndDiff", input: ({ context }) => ({ journey: context.journey!, identityHandle: context.identityHandle! }), onDone: { target: "runResult", actions: "completed" }, onError: { target: "cleaningFailure", actions: "failed" } }, after: { crawlTimeout: "cleaningTimedOut" }, on: { CANCEL: "cleaningCancelled" } },
      runResult: { always: [{ target: "suspectedDrift", guard: "hasSuspicion" }, { target: "cleaningNoDrift" }] },
      suspectedDrift: { on: { REVIEW: { target: "reviewing" }, CANCEL: "cleaningCancelled" } },
      reviewing: { invoke: { src: "review", input: ({ context, event }) => ({ suspicionId: context.suspicion!.id, input: event.type === "REVIEW" ? event.input : null }), onDone: { target: "reviewResult", actions: "reviewed" }, onError: { target: "suspectedDrift", actions: "failed" } } },
      reviewResult: { always: [{ target: "accepted", guard: "accepted" }, { target: "cleaningRejected" }] },
      accepted: { on: { CREATE_RELEASE: { target: "creatingRelease" }, CANCEL: "cleaningCancelled" } },
      creatingRelease: { invoke: { src: "createRelease", input: ({ context, event }) => ({ suspicionId: context.suspicion!.id, previous: event.type === "CREATE_RELEASE" ? event.previousPresentationVersion : "", next: event.type === "CREATE_RELEASE" ? event.nextPresentationVersion : "" }), onDone: { target: "awaitingReleaseApproval", actions: "releaseCreated" }, onError: { target: "accepted", actions: "failed" } } },
      awaitingReleaseApproval: { on: { PUBLISH: { target: "publishing", guard: "hasRelease" }, CANCEL: "cleaningCancelled" } },
      publishing: { invoke: { src: "publish", input: ({ context, event }) => ({ releaseId: context.release!.id, input: event.type === "PUBLISH" ? event.input : null }), onDone: { target: "cleaningReleased", actions: "released" }, onError: { target: "awaitingReleaseApproval", actions: "failed" } } },
      cleaningNoDrift: { invoke: { src: "cleanup", input: ({ context }) => ({ identityHandle: context.identityHandle }), onDone: { target: "closedNoDrift", actions: "cleaned" }, onError: { target: "cleanupFailed", actions: "failed" } } },
      cleaningRejected: { invoke: { src: "cleanup", input: ({ context }) => ({ identityHandle: context.identityHandle }), onDone: { target: "closedRejected", actions: "cleaned" }, onError: { target: "cleanupFailed", actions: "failed" } } },
      cleaningReleased: { invoke: { src: "cleanup", input: ({ context }) => ({ identityHandle: context.identityHandle }), onDone: { target: "closedReleased", actions: "cleaned" }, onError: { target: "cleanupFailed", actions: "failed" } } },
      cleaningCancelled: { invoke: { src: "cleanup", input: ({ context }) => ({ identityHandle: context.identityHandle }), onDone: { target: "closedCancelled", actions: "cleaned" }, onError: { target: "cleanupFailed", actions: "failed" } } },
      cleaningTimedOut: { invoke: { src: "cleanup", input: ({ context }) => ({ identityHandle: context.identityHandle }), onDone: { target: "timedOut", actions: "cleaned" }, onError: { target: "cleanupFailed", actions: "failed" } } },
      cleaningFailure: { invoke: { src: "cleanup", input: ({ context }) => ({ identityHandle: context.identityHandle }), onDone: { target: "failed", actions: "cleaned" }, onError: { target: "cleanupFailed", actions: "failed" } } },
      failed: { on: { RETRY: "scheduled" } }, cleanupFailed: { on: { RETRY: "cleaningFailure" } }, timedOut: { on: { RETRY: "scheduled" } },
      closedNoDrift: { type: "final" }, closedRejected: { type: "final" }, closedReleased: { type: "final" }, closedCancelled: { type: "final" },
    },
  });
};