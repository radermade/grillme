import { assign, fromPromise, setup } from "xstate";
import { parseThemeSettings } from "@grillme/content";
import type { ResolvedTheme, ThemePreference, ThemeSettings } from "@grillme/domain";
import type { StoragePort } from "@grillme/platform";

const storageKey = "ui-theme:v1";
type Context = { preference: ThemePreference; resolved: ResolvedTheme; error: string | null };
type Event =
  | { type: "SELECT"; preference: ThemePreference }
  | { type: "SYSTEM_CHANGED"; theme: ResolvedTheme }
  | { type: "RETRY" };
type Loaded = { settings: ThemeSettings; system: ResolvedTheme };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;
const resolve = (preference: ThemePreference, system: ResolvedTheme): ResolvedTheme =>
  preference === "system" ? system : preference;

export const createThemeMachine = (storage: StoragePort, systemTheme: () => ResolvedTheme) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: {
    load: fromPromise<Loaded>(async () => ({
      settings: parseThemeSettings(await storage.get(storageKey)) ?? { schemaVersion: 1, preference: "dark" },
      system: systemTheme(),
    })),
    save: fromPromise<void, { preference: ThemePreference }>(async ({ input }) =>
      storage.set(storageKey, { schemaVersion: 1, preference: input.preference })),
  },
  actions: {
    loaded: assign(({ event }) => {
      const value = output<Loaded>(event);
      return { preference: value.settings.preference, resolved: resolve(value.settings.preference, value.system), error: null };
    }),
    selected: assign(({ event }) => event.type === "SELECT"
      ? { preference: event.preference, resolved: resolve(event.preference, systemTheme()), error: null }
      : {}),
    systemChanged: assign(({ context, event }) => event.type === "SYSTEM_CHANGED" && context.preference === "system"
      ? { resolved: event.theme }
      : {}),
    failed: assign({ error: () => "Theme preference could not be saved." }),
  },
}).createMachine({
  id: "theme",
  initial: "loading",
  context: { preference: "dark", resolved: "dark", error: null },
  states: {
    loading: { invoke: { src: "load", onDone: { target: "ready", actions: "loaded" }, onError: { target: "ready", actions: "failed" } } },
    ready: { on: { SELECT: { target: "saving", actions: "selected" }, SYSTEM_CHANGED: { actions: "systemChanged" } } },
    saving: { invoke: { src: "save", input: ({ context }) => ({ preference: context.preference }), onDone: "ready", onError: { target: "failed", actions: "failed" } } },
    failed: { on: { RETRY: "saving", SELECT: { target: "saving", actions: "selected" }, SYSTEM_CHANGED: { actions: "systemChanged" } } },
  },
});
