import { z } from "zod";
import { parseEvaluationResult } from "@grillme/content";
import type { EvaluationResult, GrillPrompt } from "@grillme/domain";
import type { EvaluationEnvelope } from "./contracts";

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const requestSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: id,
  turnId: id,
  promptId: id,
  rubricId: id,
  rubricVersion: z.string().min(1).max(50),
  response: z.string().min(1).max(5_000),
  confidence: z.number().int().min(1).max(5),
}).strict();

const envelopeSchema = z.object({
  authorization: z.string().min(1).max(4_096),
  requestId: id,
  request: requestSchema,
}).strict();

export const parseEvaluationEnvelope = (input: unknown): EvaluationEnvelope | null => {
  const result = envelopeSchema.safeParse(input);
  return result.success ? result.data : null;
};

export const validateProviderResult = (
  input: unknown,
  prompt: GrillPrompt,
  provider: { id: string; version: string; modelVersion: string },
): EvaluationResult | null => {
  const result = parseEvaluationResult(input);
  if (!result
    || result.rubricId !== prompt.rubric.id
    || result.rubricVersion !== prompt.rubric.version
    || result.evaluatorId !== provider.id
    || result.evaluatorVersion !== provider.version
    || result.modelVersion !== provider.modelVersion) return null;
  const concepts = prompt.rubric.concepts.map(({ id }) => id);
  const misconceptions = prompt.rubric.misconceptions.map(({ id }) => id);
  const allConcepts = [...result.coveredConceptIds, ...result.missingConceptIds];
  if (new Set(allConcepts).size !== allConcepts.length
    || concepts.some((id) => !allConcepts.includes(id))
    || allConcepts.some((id) => !concepts.includes(id))
    || result.misconceptionIds.some((id) => !misconceptions.includes(id))
    || result.evidence.some(({ conceptId }) => !result.coveredConceptIds.includes(conceptId))) return null;
  return result;
};