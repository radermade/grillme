import { assign, fromPromise, setup } from "xstate";
import { parseCommercialEntitlement } from "@grillme/content";
import type { CommercialEntitlement } from "@grillme/domain";
import type { ClockPort, EntitlementPort } from "@grillme/platform";

type Context = { entitlement: CommercialEntitlement | null; error: string | null };
type Event = { type: "REFRESH" } | { type: "TICK" } | { type: "RETRY" };
type Done = { output: CommercialEntitlement };
const activeAt = (entitlement: CommercialEntitlement, now: string) => entitlement.status === "active" && (!entitlement.expiresAt || Date.parse(entitlement.expiresAt) > Date.parse(now));
const graceAt = (entitlement: CommercialEntitlement, now: string) => entitlement.status === "past-due" && !!entitlement.graceExpiresAt && Date.parse(entitlement.graceExpiresAt) > Date.parse(now);
export const createEntitlementMachine = (remote: EntitlementPort, clock: ClockPort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: { load: fromPromise<CommercialEntitlement>(async () => { const value = parseCommercialEntitlement(await remote.load()); if (!value) throw new Error("Invalid entitlement."); return value; }) },
  guards: { active: ({ event }) => activeAt((event as unknown as Done).output, clock.now()), grace: ({ event }) => graceAt((event as unknown as Done).output, clock.now()), currentlyActive: ({ context }) => !!context.entitlement && activeAt(context.entitlement, clock.now()), currentlyGrace: ({ context }) => !!context.entitlement && graceAt(context.entitlement, clock.now()) },
  actions: { loaded: assign(({ event }) => ({ entitlement: (event as unknown as Done).output, error: null })), failed: assign({ error: () => "Entitlement status could not be loaded." }) },
}).createMachine({
  id: "commercialEntitlement",
  initial: "loading",
  context: { entitlement: null, error: null },
  states: {
    loading: { invoke: { src: "load", onDone: [{ target: "active", guard: "active", actions: "loaded" }, { target: "grace", guard: "grace", actions: "loaded" }, { target: "blocked", actions: "loaded" }], onError: { target: "failed", actions: "failed" } } },
    active: { on: { REFRESH: "loading", TICK: [{ target: "active", guard: "currentlyActive" }, { target: "blocked" }] } },
    grace: { on: { REFRESH: "loading", TICK: [{ target: "grace", guard: "currentlyGrace" }, { target: "blocked" }] } },
    blocked: { on: { REFRESH: "loading" } },
    failed: { on: { RETRY: "loading" } },
  },
});
