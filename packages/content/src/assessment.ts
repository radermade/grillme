import { z } from "zod";
import type { Assessment } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const text = z.string().min(1).max(1_000);
const choice = z.object({ id, label: z.string().min(1).max(300) }).strict();
const base = {
  id,
  prompt: text,
  skillIds: z.array(id).min(1).max(10),
  rationale: text,
};
const singleChoice = z.object({
  ...base,
  type: z.literal("single-choice"),
  choices: z.array(choice).min(2).max(10),
  correctOptionId: id,
}).strict();
const multipleChoice = z.object({
  ...base,
  type: z.literal("multiple-choice"),
  choices: z.array(choice).min(2).max(10),
  correctOptionIds: z.array(id).min(1).max(10),
}).strict();
const ordering = z.object({
  ...base,
  type: z.literal("ordering"),
  items: z.array(choice).min(2).max(10),
  correctOrder: z.array(id).min(2).max(10),
}).strict();
const shortText = z.object({
  ...base,
  type: z.literal("short-text"),
  requiredConcepts: z.array(z.object({
    label: z.string().min(1).max(200),
    terms: z.array(z.string().min(1).max(100)).min(1).max(10),
  }).strict()).min(1).max(10),
}).strict();

export const assessmentSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  version: z.string().min(1).max(50),
  courseId: id,
  courseVersion: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: text,
  skills: z.array(z.object({
    id,
    title: z.string().min(1).max(200),
    remediation: text,
    reviewPrompt: text,
    reviewAnswer: text,
  }).strict()).min(1).max(100),
  activities: z.array(z.discriminatedUnion("type", [singleChoice, multipleChoice, ordering, shortText])).min(1).max(100),
}).strict().superRefine((assessment, context) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const skillIds = assessment.skills.map(({ id: skillId }) => skillId);
  if (!unique(skillIds)) context.addIssue({ code: "custom", message: "Skill IDs must be unique." });
  const activityIds = assessment.activities.map(({ id: activityId }) => activityId);
  if (!unique(activityIds)) context.addIssue({ code: "custom", message: "Activity IDs must be unique." });
  for (const activity of assessment.activities) {
    if (activity.skillIds.some((skillId) => !skillIds.includes(skillId))) {
      context.addIssue({ code: "custom", message: "Activity references an unknown skill." });
    }
    if (activity.type === "single-choice" && !activity.choices.some(({ id: choiceId }) => choiceId === activity.correctOptionId)) {
      context.addIssue({ code: "custom", message: "Single-choice answer is not a choice." });
    }
    if (activity.type === "multiple-choice") {
      const choices = activity.choices.map(({ id: choiceId }) => choiceId);
      if (!unique(activity.correctOptionIds) || activity.correctOptionIds.some((answer) => !choices.includes(answer))) {
        context.addIssue({ code: "custom", message: "Multiple-choice answers are invalid." });
      }
    }
    if (activity.type === "ordering") {
      const items = activity.items.map(({ id: itemId }) => itemId);
      if (!unique(items) || !unique(activity.correctOrder) || !items.every((item) => activity.correctOrder.includes(item)) || items.length !== activity.correctOrder.length) {
        context.addIssue({ code: "custom", message: "Ordering answer must include every item once." });
      }
    }
  }
});

export const parseAssessment = (input: unknown): Assessment => assessmentSchema.parse(input) as Assessment;