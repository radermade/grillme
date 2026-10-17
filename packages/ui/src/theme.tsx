import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useMachine } from "@xstate/react";
import { createThemeMachine } from "@grillme/machines";
import type { ResolvedTheme, ThemePreference } from "@grillme/domain";
import { useUiRuntime } from "./runtime";

const ThemeContext = createContext<{
  preference: ThemePreference;
  resolved: ResolvedTheme;
  select(preference: ThemePreference): void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { platform } = useUiRuntime();
  const query = useMemo(() => matchMedia("(prefers-color-scheme: dark)"), []);
  const machine = useMemo(() => createThemeMachine(platform.storage, () => query.matches ? "dark" : "light"), [platform.storage, query]);
  const [state, send] = useMachine(machine, {});
  useEffect(() => {
    const update = (event: MediaQueryListEvent) => send({ type: "SYSTEM_CHANGED", theme: event.matches ? "dark" : "light" });
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [query, send]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.context.resolved;
    document.documentElement.style.colorScheme = state.context.resolved;
  }, [state.context.resolved]);
  return <ThemeContext.Provider value={{ preference: state.context.preference, resolved: state.context.resolved, select: (preference) => send({ type: "SELECT", preference }) }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider is required.");
  return theme;
}
