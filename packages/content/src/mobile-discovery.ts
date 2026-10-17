import { z } from "zod";
import type { MobileDiscoveryRecord } from "@grillme/domain";

const workflow = z.enum(["reading", "review", "short-grill", "readiness", "lab"]);
const score = z.number().int().min(1).max(5);
export const mobileDiscoverySchema = z.object({
  schemaVersion: z.literal(1), cohortSize: z.number().int().min(1).max(10_000), observationDays: z.number().int().min(7).max(365),
  mobileSizedSessions: z.number().int().nonnegative(), totalSessions: z.number().int().positive(), shortSessions: z.number().int().nonnegative(),
  workflowDemand: z.record(workflow, z.number().int().nonnegative()),
  candidates: z.array(z.object({ id: z.enum(["tauri-mobile", "react-native", "pwa"]), capability: score, accessibility: score, distribution: score, teamCost: score }).strict()).length(3),
}).strict().superRefine((record, context) => {
  if (record.mobileSizedSessions > record.totalSessions || record.shortSessions > record.totalSessions) context.addIssue({ code: "custom", message: "Session subsets cannot exceed total sessions." });
  if (new Set(record.candidates.map(({ id }) => id)).size !== 3) context.addIssue({ code: "custom", message: "Each mobile candidate must be evaluated once." });
});
export const parseMobileDiscovery = (value: unknown): MobileDiscoveryRecord => mobileDiscoverySchema.parse(value) as MobileDiscoveryRecord;
