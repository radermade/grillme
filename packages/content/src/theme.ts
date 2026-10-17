import { z } from "zod";
import type { ThemeSettings } from "@grillme/domain";

export const themeSettingsSchema = z.object({
  schemaVersion: z.literal(1),
  preference: z.enum(["dark", "light", "system"]),
}).strict();

export const parseThemeSettings = (value: unknown): ThemeSettings | null =>
  themeSettingsSchema.safeParse(value).data ?? null;
