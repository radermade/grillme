import { assign, fromPromise, setup } from "xstate";
import { parseAccountSession } from "@grillme/content";
import type { AccountSession, AuthorizationCallback } from "@grillme/domain";
import type { AuthPort, ClockPort, ConnectivityPort } from "@grillme/platform";

type Context = { session: AccountSession | null; error: string | null };
type Event =
  | { type: "SIGN_IN" }
  | ({ type: "CALLBACK" } & AuthorizationCallback)
  | { type: "REFRESH" }
  | { type: "SIGN_OUT" }
  | { type: "NETWORK_OFFLINE" }
  | { type: "NETWORK_ONLINE" }
  | { type: "TICK" }
  | { type: "RETRY" };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;
const validSession = (value: unknown): AccountSession => {
  const session = parseAccountSession(value);
  if (!session) throw new Error("Invalid session.");
  return session;
};

export const createAuthMachine = (auth: AuthPort, connectivity: ConnectivityPort, clock: ClockPort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: {
    restore: fromPromise(async () => auth.restore()),
    begin: fromPromise(async () => auth.beginAuthorization()),
    exchange: fromPromise<AccountSession, AuthorizationCallback>(async ({ input }) => validSession(await auth.completeAuthorization(input))),
    refresh: fromPromise(async () => validSession(await auth.refresh())),
    signOut: fromPromise(async () => auth.signOut()),
  },
  guards: {
    restoredActive: ({ event }) => {
      const session = parseAccountSession(output<unknown>(event));
      return !!session && Date.parse(session.accessExpiresAt) > Date.parse(clock.now());
    },
    restoredGrace: ({ event }) => {
      const session = parseAccountSession(output<unknown>(event));
      return !!session && connectivity.current() === "offline" && Date.parse(session.offlineGraceExpiresAt) > Date.parse(clock.now());
    },
    online: () => connectivity.current() === "online",
    graceValid: ({ context }) => !!context.session && Date.parse(context.session.offlineGraceExpiresAt) > Date.parse(clock.now()),
    accessExpired: ({ context }) => !!context.session && Date.parse(context.session.accessExpiresAt) <= Date.parse(clock.now()),
  },
  actions: {
    acceptRestored: assign(({ event }) => ({ session: parseAccountSession(output<unknown>(event)), error: null })),
    acceptSession: assign(({ event }) => ({ session: output<AccountSession>(event), error: null })),
    clearSession: assign({ session: null }),
    interrupted: assign({ error: () => "Sign-in was interrupted. Try again." }),
    refreshFailed: assign({ error: () => "Your session could not be refreshed." }),
  },
}).createMachine({
  id: "authentication",
  initial: "checking",
  context: { session: null, error: null },
  states: {
    checking: {
      invoke: { src: "restore", onDone: [{ target: "signedIn", guard: "restoredActive", actions: "acceptRestored" }, { target: "offlineGrace", guard: "restoredGrace", actions: "acceptRestored" }, { target: "signedOut" }], onError: "signedOut" },
      on: { CALLBACK: "exchanging" },
    },
    signedOut: { on: { SIGN_IN: "authorizing", CALLBACK: "exchanging" } },
    authorizing: {
      invoke: { src: "begin", onError: { target: "failed", actions: "interrupted" } },
      on: { CALLBACK: { target: "exchanging" }, SIGN_OUT: "signingOut" },
    },
    exchanging: {
      invoke: { src: "exchange", input: ({ event }) => event.type === "CALLBACK" ? { code: event.code, state: event.state } : { code: "", state: "" }, onDone: { target: "signedIn", actions: "acceptSession" }, onError: { target: "failed", actions: "interrupted" } },
    },
    signedIn: {
      on: {
        REFRESH: [{ target: "refreshing", guard: "online" }, { target: "offlineGrace", guard: "graceValid" }, { target: "expired" }],
        TICK: [{ target: "refreshing", guard: "accessExpired" }],
        NETWORK_OFFLINE: [{ target: "offlineGrace", guard: "graceValid" }, { target: "expired" }],
        SIGN_OUT: "signingOut",
      },
    },
    refreshing: { invoke: { src: "refresh", onDone: { target: "signedIn", actions: "acceptSession" }, onError: [{ target: "offlineGrace", guard: "graceValid", actions: "refreshFailed" }, { target: "expired", actions: "refreshFailed" }] } },
    offlineGrace: { on: { NETWORK_ONLINE: "refreshing", TICK: [{ target: "expired", guard: ({ context }) => !context.session || Date.parse(context.session.offlineGraceExpiresAt) <= Date.parse(clock.now()) }], SIGN_OUT: "signingOut" } },
    expired: { entry: "clearSession", invoke: { src: "signOut" }, on: { SIGN_IN: "authorizing", SIGN_OUT: "signingOut" } },
    signingOut: { invoke: { src: "signOut", onDone: { target: "signedOut", actions: "clearSession" }, onError: { target: "signedOut", actions: "clearSession" } } },
    failed: { on: { RETRY: "signedOut", SIGN_OUT: "signingOut" } },
  },
});
