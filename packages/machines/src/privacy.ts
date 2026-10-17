import { assign, fromPromise, setup } from "xstate";
import { parsePrivacyRequestReceipt } from "@grillme/content";
import type { PrivacyRequest, PrivacyRequestReceipt } from "@grillme/domain";
import type { ClockPort, IdPort, PrivacyPort } from "@grillme/platform";

type Context = { pending: PrivacyRequest | null; receipt: PrivacyRequestReceipt | null; error: string | null };
type Event = { type: "REQUEST_EXPORT" } | { type: "REQUEST_DELETE" } | { type: "RETRY" } | { type: "RESET" };
type Done = { output: PrivacyRequestReceipt };
export const createPrivacyMachine = (remote: PrivacyPort, ids: IdPort, clock: ClockPort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: { submit: fromPromise<PrivacyRequestReceipt, { request: PrivacyRequest }>(async ({ input }) => { const receipt = parsePrivacyRequestReceipt(await remote.request(input.request)); if (!receipt) throw new Error("Invalid privacy receipt."); return receipt; }) },
  actions: {
    stageExport: assign(() => { const id = ids.create(); return { pending: { schemaVersion: 1 as const, id, idempotencyKey: id, type: "export" as const, occurredAt: clock.now() }, error: null }; }),
    stageDelete: assign(() => { const id = ids.create(); return { pending: { schemaVersion: 1 as const, id, idempotencyKey: id, type: "delete" as const, occurredAt: clock.now() }, error: null }; }),
    accepted: assign(({ event }) => ({ receipt: (event as unknown as Done).output, pending: null, error: null })),
    failed: assign({ error: () => "The privacy request could not be submitted." }),
    reset: assign({ pending: null, receipt: null, error: null }),
  },
}).createMachine({
  id: "privacyRequest",
  initial: "idle",
  context: { pending: null, receipt: null, error: null },
  states: {
    idle: { on: { REQUEST_EXPORT: { target: "requesting", actions: "stageExport" }, REQUEST_DELETE: { target: "confirmingDeletion", actions: "stageDelete" } } },
    confirmingDeletion: { on: { REQUEST_DELETE: "requesting", RESET: { target: "idle", actions: "reset" } } },
    requesting: { invoke: { src: "submit", input: ({ context }) => ({ request: context.pending! }), onDone: { target: "accepted", actions: "accepted" }, onError: { target: "failed", actions: "failed" } } },
    accepted: { on: { RESET: { target: "idle", actions: "reset" } } },
    failed: { on: { RETRY: "requesting", RESET: { target: "idle", actions: "reset" } } },
  },
});
