import { assign, fromPromise, setup } from "xstate";
import { parseSupportSnapshot } from "@grillme/content";
import type { SupportSnapshot } from "@grillme/domain";
import type { SupportPort } from "@grillme/platform";

type Context = { snapshot: SupportSnapshot; error: string | null };
type Event = { type: "SUBMIT" } | { type: "RETRY" } | { type: "RESET" };
export const createSupportMachine = (snapshot: SupportSnapshot, remote: SupportPort) => {
  const validated = parseSupportSnapshot(snapshot);
  if (!validated) throw new Error("Invalid support snapshot.");
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: { submit: fromPromise(async () => remote.submit(validated)) },
    actions: { failed: assign({ error: () => "Support diagnostics could not be submitted." }), clear: assign({ error: null }) },
  }).createMachine({
    id: "supportDiagnostics",
    initial: "ready",
    context: { snapshot: validated, error: null },
    states: {
      ready: { on: { SUBMIT: "submitting" } },
      submitting: { invoke: { src: "submit", onDone: "submitted", onError: { target: "failed", actions: "failed" } } },
      submitted: { on: { RESET: { target: "ready", actions: "clear" } } },
      failed: { on: { RETRY: "submitting", RESET: { target: "ready", actions: "clear" } } },
    },
  });
};
