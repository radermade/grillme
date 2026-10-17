import { z } from "zod";
import type { ReadinessEvidence, ReadinessRuleSet } from "@grillme/domain";

const id = z.string().min(1).max(200);
const timestamp = z.iso.datetime({ offset: true });
const evidenceType = z.enum(["assessment", "explanation", "scenario", "debugging", "lab", "mock"]);
export const readinessEvidenceSchema = z.object({ id, courseId: id, courseVersion: id, skillIds: z.array(id).min(1).max(20), type: evidenceType, score: z.number().min(0).max(1), guided: z.boolean(), activityId: id, activityVersion: id, occurredAt: timestamp }).strict();
export const readinessRuleSetSchema = z.object({ schemaVersion: z.literal(1), id, version: id, maxAgeDays: z.number().int().min(1).max(365), weights: z.record(evidenceType, z.number().positive().max(10)), highImpactSkillIds: z.array(id).max(100), minimumEvidence: z.number().int().min(1).max(20), minimumTypes: z.number().int().min(1).max(6), demonstratingScore: z.number().min(0).max(1) }).strict();
export const parseReadinessEvidence = (value: unknown): ReadinessEvidence[] => z.array(readinessEvidenceSchema).max(10_000).parse(value) as ReadinessEvidence[];
export const parseReadinessRules = (value: unknown): ReadinessRuleSet => readinessRuleSetSchema.parse(value) as ReadinessRuleSet;
