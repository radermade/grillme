import { assign, fromPromise, setup } from "xstate";
import { parseManagedConsoleBudget, parseManagedConsoleLaunch, parseManagedConsoleSession, parseManagedConsoleValidation } from "@grillme/content";
import type { AppError, ManagedConsoleBudget, ManagedConsoleSession, ManagedConsoleValidation } from "@grillme/domain";
import type { ClockPort, ManagedConsolePort, NavigationPort } from "@grillme/platform";

type Context = { labSessionId: string; policyId: string; policyVersion: string; session: ManagedConsoleSession | null; budget: ManagedConsoleBudget | null; validation: ManagedConsoleValidation | null; checkpointId: string | null; error: AppError | null };
type Event = { type: "LAUNCH" } | { type: "POLL" } | { type: "VALIDATE"; checkpointId: string } | { type: "STOP" } | { type: "NETWORK_OFFLINE" } | { type: "NETWORK_ONLINE" } | { type: "TICK" } | { type: "RETRY" };
type Done<T> = { output: T }; const output = <T>(event: unknown) => (event as Done<T>).output;
export const createManagedConsoleMachine = (labSessionId: string, policyId: string, policyVersion: string, remote: ManagedConsolePort, navigation: NavigationPort, clock: ClockPort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: {
    restore: fromPromise(async () => parseManagedConsoleSession(await remote.restore(labSessionId))),
    launchAndOpen: fromPromise<ManagedConsoleSession>(async () => {
      const value = parseManagedConsoleLaunch(await remote.launch(labSessionId, policyId, policyVersion));
      if (!value) throw new Error("Launch unavailable.");
      try { await navigation.openExternal(value.launchUrl); }
      catch (error) { await remote.revokeForLab(labSessionId).catch(() => undefined); throw error; }
      return value.session;
    }),
    status: fromPromise<ManagedConsoleSession, { id: string }>(async ({ input }) => { const value = parseManagedConsoleSession(await remote.status(input.id)); if (!value) throw new Error("Status unavailable."); return value; }),
    budget: fromPromise<ManagedConsoleBudget, { id: string }>(async ({ input }) => { const value = parseManagedConsoleBudget(await remote.budget(input.id)); if (!value) throw new Error("Budget unavailable."); return value; }),
    validate: fromPromise<ManagedConsoleValidation, { id: string; checkpointId: string }>(async ({ input }) => { const value = parseManagedConsoleValidation(await remote.validate(input.id, input.checkpointId)); if (!value) throw new Error("Validation unavailable."); return value; }),
    revoke: fromPromise<ManagedConsoleSession, { id: string }>(async ({ input }) => { const value = parseManagedConsoleSession(await remote.revoke(input.id)); if (!value) throw new Error("Revocation unavailable."); return value; }),
  },
  guards: {
    restored: ({ event }) => { const value = output<ManagedConsoleSession | null>(event); return !!value && value.labSessionId === labSessionId && value.status === "active" && Date.parse(value.expiresAt) > Date.parse(clock.now()); },
    hasSession: ({ context }) => !!context.session,
    expired: ({ context }) => !!context.session && Date.parse(context.session.expiresAt) <= Date.parse(clock.now()),
    budgetExhausted: ({ context }) => !!context.budget?.exhausted,
    validationInconclusive: ({ context }) => context.validation?.status === "inconclusive",
  },
  actions: {
    restored: assign(({ event }) => ({ session: output<ManagedConsoleSession>(event), error: null })),
    launched: assign(({ event }) => ({ session: output<ManagedConsoleSession>(event), error: null })),
    status: assign(({ event }) => ({ session: output<ManagedConsoleSession>(event), error: null })),
    budget: assign(({ context, event }) => { const budget = output<ManagedConsoleBudget>(event); return { budget, session: budget.exhausted && context.session ? { ...context.session, status: "revoked" as const } : context.session, error: null }; }),
    stageValidation: assign(({ event }) => event.type === "VALIDATE" ? { checkpointId: event.checkpointId } : {}),
    validated: assign(({ event }) => ({ validation: output<ManagedConsoleValidation>(event), error: null })),
    revoked: assign(({ event }) => ({ session: output<ManagedConsoleSession>(event), error: null })),
    expired: assign(({ context }) => ({ session: context.session ? { ...context.session, status: "expired" as const } : null })),
    failed: assign({ error: () => ({ code: "UNKNOWN" as const, message: "Managed console companion is temporarily unavailable." }) }),
    offline: assign({ error: () => ({ code: "UNKNOWN" as const, message: "Managed console access requires a network connection." }) }),
  },
}).createMachine({
  id: "managedConsole", initial: "restoring", context: { labSessionId, policyId, policyVersion, session: null, budget: null, validation: null, checkpointId: null, error: null },
  states: {
    restoring: { invoke: { src: "restore", onDone: [{ target: "reconnecting", guard: "restored", actions: "restored" }, { target: "idle" }], onError: "idle" } },
    idle: { on: { LAUNCH: "launching", NETWORK_OFFLINE: { actions: "offline" } } },
    launching: { invoke: { src: "launchAndOpen", onDone: { target: "active", actions: "launched" }, onError: { target: "failed", actions: "failed" } } },
    active: { always: [{ target: "expired", guard: "expired" }, { target: "ended", guard: "budgetExhausted" }], on: { POLL: "checkingStatus", VALIDATE: { target: "validating", actions: "stageValidation" }, STOP: "revoking", NETWORK_OFFLINE: { target: "offline", actions: "offline" }, TICK: { target: "expired", guard: "expired" } } },
    checkingStatus: { invoke: { src: "status", input: ({ context }) => ({ id: context.session!.id }), onDone: { target: "checkingBudget", actions: "status" }, onError: { target: "failed", actions: "failed" } } },
    checkingBudget: { invoke: { src: "budget", input: ({ context }) => ({ id: context.session!.id }), onDone: { target: "active", actions: "budget" }, onError: { target: "revoking", actions: "failed" } } },
    validating: { invoke: { src: "validate", input: ({ context }) => ({ id: context.session!.id, checkpointId: context.checkpointId! }), onDone: { target: "validationResult", actions: "validated" }, onError: { target: "failed", actions: "failed" } } },
    validationResult: { always: [{ target: "inconclusive", guard: "validationInconclusive" }, { target: "active" }] },
    inconclusive: { on: { RETRY: "validating", STOP: "revoking", NETWORK_OFFLINE: { target: "offline", actions: "offline" } } },
    offline: { on: { NETWORK_ONLINE: "reconnecting", STOP: { target: "revoking", guard: "hasSession" } } },
    reconnecting: { invoke: { src: "status", input: ({ context }) => ({ id: context.session!.id }), onDone: { target: "active", actions: "status" }, onError: { target: "expired", actions: "expired" } } },
    expired: { entry: "expired", always: [{ target: "revoking", guard: "hasSession" }, { target: "ended" }] },
    revoking: { invoke: { src: "revoke", input: ({ context }) => ({ id: context.session!.id }), onDone: { target: "ended", actions: "revoked" }, onError: { target: "failed", actions: "failed" } } },
    ended: {},
    failed: { on: { RETRY: [{ target: "reconnecting", guard: "hasSession" }, { target: "launching" }], STOP: { target: "revoking", guard: "hasSession" } } },
  },
});