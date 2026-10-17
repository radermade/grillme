import { assign, fromPromise, setup } from "xstate";
import { parseReleaseAssignment } from "@grillme/content";
import type { ReleaseAssignment, ReleaseChannel } from "@grillme/domain";
import type { ReleasePort } from "@grillme/platform";

type Context = { channel: ReleaseChannel; currentVersion: string; assignment: ReleaseAssignment | null; error: string | null };
type Event = { type: "CHECK" } | { type: "RETRY" } | { type: "DISMISS" };
type Done = { output: ReleaseAssignment };
export const createReleaseMachine = (channel: ReleaseChannel, currentVersion: string, remote: ReleasePort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: { check: fromPromise<ReleaseAssignment>(async () => { const value = parseReleaseAssignment(await remote.assignment(channel, currentVersion)); if (!value) throw new Error("Invalid release assignment."); return value; }) },
  actions: { loaded: assign(({ event }) => ({ assignment: (event as unknown as Done).output, error: null })), failed: assign({ error: () => "Release status could not be checked." }), dismiss: assign({ assignment: null }) },
  guards: { update: ({ event }) => (event as unknown as Done).output.action === "update", rollback: ({ event }) => (event as unknown as Done).output.action === "rollback", unsupported: ({ event }) => (event as unknown as Done).output.action === "unsupported" },
}).createMachine({
  id: "releaseAssignment",
  initial: "checking",
  context: { channel, currentVersion, assignment: null, error: null },
  states: {
    checking: { invoke: { src: "check", onDone: [{ target: "updateAvailable", guard: "update", actions: "loaded" }, { target: "rollbackRequired", guard: "rollback", actions: "loaded" }, { target: "unsupported", guard: "unsupported", actions: "loaded" }, { target: "current", actions: "loaded" }], onError: { target: "failed", actions: "failed" } } },
    current: { on: { CHECK: "checking" } },
    updateAvailable: { on: { DISMISS: { target: "current", actions: "dismiss" }, CHECK: "checking" } },
    rollbackRequired: { on: { CHECK: "checking" } },
    unsupported: { on: { CHECK: "checking" } },
    failed: { on: { RETRY: "checking" } },
  },
});
