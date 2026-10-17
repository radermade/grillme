import { z } from "zod";
import type { EvaluationResult, Grill, GrillEvidenceEvent, GrillProgress } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const version = z.string().min(1).max(50);
const text = z.string().min(1).max(2_000);
const terms = z.array(z.string().min(1).max(100)).min(1).max(20);
const concept = z.object({ id, label: text, terms, remediation: text, probe: text }).strict();
const misconception = z.object({ id, label: text, terms, correction: text, probe: text }).strict();
const rubric = z.object({
  id,
  version,
  concepts: z.array(concept).min(1).max(20),
  misconceptions: z.array(misconception).max(20),
}).strict();
const prompt = z.object({ id, skillId: id, question: text, reason: text, hint: text, rubric }).strict();

export const grillSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  version,
  courseId: id,
  courseVersion: version,
  title: z.string().min(1).max(200),
  description: text,
  maxTurns: z.number().int().min(1).max(10),
  maxEvaluationAttempts: z.number().int().min(1).max(3),
  evaluationBudget: z.number().int().min(1).max(100),
  prompts: z.array(prompt).min(1).max(50),
}).strict().superRefine((grill, context) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (!unique(grill.prompts.map(({ id: promptId }) => promptId))) {
    context.addIssue({ code: "custom", message: "Prompt IDs must be unique." });
  }
  for (const item of grill.prompts) {
    if (!unique(item.rubric.concepts.map(({ id: conceptId }) => conceptId))) {
      context.addIssue({ code: "custom", message: "Concept IDs must be unique per rubric." });
    }
  }
});

export const evaluationResultSchema = z.object({
  schemaVersion: z.literal(1),
  rubricId: id,
  rubricVersion: version,
  evaluatorId: id,
  evaluatorVersion: version,
  modelVersion: z.string().min(1).max(200).nullable(),
  coveredConceptIds: z.array(id).max(20),
  missingConceptIds: z.array(id).max(20),
  misconceptionIds: z.array(id).max(20),
  evidence: z.array(z.object({ conceptId: id, excerpt: z.string().min(1).max(240) }).strict()).max(20),
  score: z.number().min(0).max(1),
  feedback: text,
  followUp: z.object({ question: text, reason: text }).strict().nullable(),
  costUnits: z.number().int().min(0).max(100),
}).strict();
const turn = z.object({
  id,
  promptId: id,
  skillId: id,
  question: text,
  reason: text,
  response: z.string().min(1).max(5_000),
  confidence: z.number().int().min(1).max(5),
  evaluation: evaluationResultSchema,
  attemptNumber: z.number().int().min(1).max(3),
  occurredAt: z.iso.datetime({ offset: true }),
}).strict();

export const grillProgressSchema = z.object({
  schemaVersion: z.literal(1),
  grillId: id,
  grillVersion: version,
  sessionId: id,
  turns: z.array(turn).max(10),
  budgetUsed: z.number().int().min(0).max(100),
  currentPromptId: id,
  pendingQuestion: text.nullable(),
  pendingReason: text.nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

export const parseGrill = (input: unknown): Grill => grillSchema.parse(input) as Grill;
export const parseEvaluationResult = (input: unknown): EvaluationResult | null => {
  const result = evaluationResultSchema.safeParse(input);
  return result.success ? result.data as EvaluationResult : null;
};
export const parseGrillProgress = (input: unknown): GrillProgress | null => {
  const result = grillProgressSchema.safeParse(input);
  return result.success ? result.data as GrillProgress : null;
};

export const grillEvidenceSchema = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, type: z.literal("grill.turn-evaluated"), courseId: id, courseVersion: version, grillId: id, grillVersion: version, sessionId: id, turn }).strict();
export const parseGrillEvidence = (input: unknown): GrillEvidenceEvent | null => grillEvidenceSchema.safeParse(input).data as GrillEvidenceEvent | undefined ?? null;
