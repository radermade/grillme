export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
export type ThemeSettings = {
  schemaVersion: 1;
  preference: ThemePreference;
};
