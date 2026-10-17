import { assign, fromPromise, setup } from "xstate";
import type { UpdatePort } from "@grillme/platform";

export type AppMetadata = { version: string };
type BootstrapResult = { metadata: AppMetadata; update: { available: boolean; version?: string } };
type BootstrapDoneEvent = { output: BootstrapResult };
const bootstrapResult = (event: unknown): BootstrapResult =>
  (event as BootstrapDoneEvent).output;
export type AppMachineDeps = { loadMetadata(): Promise<AppMetadata>; updates: UpdatePort };

export const createAppMachine = (deps: AppMachineDeps) => setup({
  types: {
    context: {} as { metadata: AppMetadata | null; updateVersion: string | null; error: string | null },
    events: {} as { type: "RETRY" } | { type: "DISMISS_UPDATE" },
  },
  actors: {
    bootstrap: fromPromise<BootstrapResult>(async () => {
      const metadata = await deps.loadMetadata();
      const update = await deps.updates.check();
      return { metadata, update };
    }),
  },
  actions: {
    loaded: assign(({ event }) => {
      const output = bootstrapResult(event);
      return {
        metadata: output.metadata,
        updateVersion: output.update.available ? output.update.version ?? "available" : null,
        error: null,
      };
    }),
    failed: assign({ error: () => "The application could not finish starting." }),
  },
  guards: { updateAvailable: ({ event }) => bootstrapResult(event).update.available },
}).createMachine({
  id: "app",
  initial: "bootstrapping",
  context: { metadata: null, updateVersion: null, error: null },
  states: {
    bootstrapping: {
      invoke: {
        src: "bootstrap",
        onDone: [
          { guard: "updateAvailable", target: "updateAvailable", actions: "loaded" },
          { target: "ready", actions: "loaded" },
        ],
        onError: { target: "failed", actions: "failed" },
      },
    },
    updateAvailable: { on: { DISMISS_UPDATE: "ready" } },
    ready: {},
    failed: { on: { RETRY: "bootstrapping" } },
  },
});