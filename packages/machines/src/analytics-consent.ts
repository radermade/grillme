import { assign, fromPromise, setup } from "xstate";
import { parseAnalyticsConsent, parseProductAnalyticsEvent, parseProductAnalyticsEvents } from "@grillme/content";
import type { AnalyticsConsent, ProductAnalyticsEvent } from "@grillme/domain";
import type { ClockPort, ProductAnalyticsPort, StoragePort } from "@grillme/platform";

const consentKey = "analytics-consent:v1";
const queueKey = "analytics-pending:v1";
type Context = { consent: AnalyticsConsent; pending: ProductAnalyticsEvent[]; error: string | null };
type Event = { type: "OPT_IN" } | { type: "OPT_OUT" } | { type: "RECORD"; event: ProductAnalyticsEvent } | { type: "FLUSH" } | { type: "RETRY" };
type Loaded = { consent: AnalyticsConsent; pending: ProductAnalyticsEvent[] };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;
export const createAnalyticsConsentMachine = (storage: StoragePort, remote: ProductAnalyticsPort, clock: ClockPort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: {
    load: fromPromise<Loaded>(async () => ({ consent: parseAnalyticsConsent(await storage.get(consentKey)) ?? { schemaVersion: 1, productAnalytics: false, updatedAt: clock.now() }, pending: parseProductAnalyticsEvents(await storage.get(queueKey)) })),
    persist: fromPromise<void, { consent: AnalyticsConsent; pending: ProductAnalyticsEvent[] }>(async ({ input }) => { await storage.set(consentKey, input.consent); await storage.set(queueKey, input.pending); }),
    flush: fromPromise<void, { pending: ProductAnalyticsEvent[] }>(async ({ input }) => { if (input.pending.length) await remote.submit(input.pending); }),
    erase: fromPromise(async () => { await remote.delete(); await storage.remove(queueKey); }),
  },
  guards: { optedIn: ({ context }) => context.consent.productAnalytics, hasPending: ({ context }) => context.pending.length > 0, validEvent: ({ event }) => event.type === "RECORD" && parseProductAnalyticsEvent(event.event) !== null },
  actions: {
    loaded: assign(({ event }) => ({ ...output<Loaded>(event), error: null })),
    optIn: assign({ consent: () => ({ schemaVersion: 1 as const, productAnalytics: true, updatedAt: clock.now() }), error: null }),
    optOut: assign({ consent: () => ({ schemaVersion: 1 as const, productAnalytics: false, updatedAt: clock.now() }), pending: () => [], error: null }),
    queue: assign(({ context, event }) => { const value = event.type === "RECORD" ? parseProductAnalyticsEvent(event.event) : null; return value && context.consent.productAnalytics && !context.pending.some(({ idempotencyKey }) => idempotencyKey === value.idempotencyKey) ? { pending: [...context.pending, value] } : {}; }),
    flushed: assign({ pending: () => [], error: null }),
    failed: assign({ error: () => "Analytics preferences could not be synchronized." }),
  },
}).createMachine({
  id: "analyticsConsent",
  initial: "loading",
  context: { consent: { schemaVersion: 1, productAnalytics: false, updatedAt: clock.now() }, pending: [], error: null },
  states: {
    loading: { invoke: { src: "load", onDone: { target: "ready", actions: "loaded" }, onError: { target: "failed", actions: "failed" } } },
    ready: { on: { OPT_IN: { target: "saving", actions: "optIn" }, OPT_OUT: { target: "persistingOptOut", actions: "optOut" }, RECORD: { target: "saving", guard: "validEvent", actions: "queue" }, FLUSH: { target: "flushing", guard: "hasPending" } } },
    persistingOptOut: { invoke: { src: "persist", input: ({ context }) => ({ consent: context.consent, pending: context.pending }), onDone: "erasing", onError: { target: "failed", actions: "failed" } } },
    saving: { invoke: { src: "persist", input: ({ context }) => ({ consent: context.consent, pending: context.pending }), onDone: "ready", onError: { target: "failed", actions: "failed" } } },
    flushing: { invoke: { src: "flush", input: ({ context }) => ({ pending: context.pending }), onDone: { target: "saving", actions: "flushed" }, onError: { target: "failed", actions: "failed" } } },
    erasing: { invoke: { src: "erase", onDone: "ready", onError: { target: "deletionFailed", actions: "failed" } } },
    deletionFailed: { on: { RETRY: "erasing" } },
    failed: { on: { RETRY: "loading", OPT_OUT: { target: "persistingOptOut", actions: "optOut" } } },
  },
});
