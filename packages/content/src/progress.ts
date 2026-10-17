import { z } from "zod";
import type { AssessmentProgress, AssessmentResponse, ReviewSchedule } from "@grillme/domain";

const id = z.string().min(1).max(100);
const iso = z.iso.datetime({ offset: true });
const answer = z.union([z.string().max(1_000), z.array(id).max(20)]);

export const assessmentResponseSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.literal("assessment.responded"),
  id,
  idempotencyKey: id,
  assessmentId: id,
  assessmentVersion: z.string().min(1).max(50),
  activityId: id,
  skillIds: z.array(id).min(1).max(10),
  answer,
  confidence: z.number().int().min(1).max(5),
  elapsedMs: z.number().int().nonnegative(),
  attemptNumber: z.number().int().positive(),
  correct: z.boolean(),
  occurredAt: iso,
}).strict();

export const assessmentProgressSchema = z.object({
  schemaVersion: z.literal(1),
  assessmentId: id,
  assessmentVersion: z.string().min(1).max(50),
  responses: z.array(assessmentResponseSchema).max(500),
  updatedAt: iso,
}).strict();
const reviewItem = z.object({
  skillId: id,
  title: z.string().min(1).max(200),
  prompt: z.string().min(1).max(1_000),
  answer: z.string().min(1).max(1_000),
  reason: z.string().min(1).max(1_000),
  removalCriteria: z.string().min(1).max(500),
  dueAt: iso,
  intervalDays: z.number().int().min(0).max(365),
  successfulReviews: z.number().int().min(0).max(2),
  sourceAssessmentId: id,
}).strict();

export const reviewScheduleSchema = z.object({
  schemaVersion: z.literal(1),
  courseId: id,
  courseVersion: z.string().min(1).max(50),
  items: z.array(reviewItem).max(500),
  updatedAt: iso,
}).strict();

export const parseAssessmentProgress = (input: unknown): AssessmentProgress | null => {
  const result = assessmentProgressSchema.safeParse(input);
  return result.success ? result.data as AssessmentProgress : null;
};
export const parseAssessmentResponse = (input: unknown): AssessmentResponse | null => {
  const result = assessmentResponseSchema.safeParse(input);
  return result.success ? result.data as AssessmentResponse : null;
};
export const parseReviewSchedule = (input: unknown): ReviewSchedule | null => {
  const result = reviewScheduleSchema.safeParse(input);
  return result.success ? result.data as ReviewSchedule : null;
};