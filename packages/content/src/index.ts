import { z } from "zod";
import type { Course } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const shortText = z.string().min(1).max(200);
const body = z.string().min(1).max(10_000);
const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), body }),
  z.object({ type: z.literal("code"), language: shortText, code: body }),
  z.object({ type: z.literal("callout"), tone: z.enum(["info", "warning"]), title: shortText, body }),
  z.object({ type: z.literal("diagram"), title: shortText, description: body, nodes: z.array(shortText).min(1).max(20) }),
]);
const activity = z.object({ id, type: z.enum(["reflection", "knowledge-check", "lab"]), title: shortText });
const lesson = z.object({ id, title: shortText, summary: body.max(500), blocks: z.array(block).min(1).max(100), activities: z.array(activity).max(20) });
const courseModule = z.object({ id, title: shortText, lessons: z.array(lesson).min(1).max(100) });

export const courseSchema = z.object({
  schemaVersion: z.literal(1), id, version: z.string().min(1).max(50), title: shortText,
  description: body.max(1_000), locale: z.string().min(2).max(20),
  sources: z.array(z.object({ title: shortText, url: z.url(), retrievedAt: z.iso.date() })).max(50),
  modules: z.array(courseModule).min(1).max(50),
});

export const parseCourse = (input: unknown): Course => courseSchema.parse(input) as Course;
export const lessonIds = (course: Course): string[] => course.modules.flatMap(({ lessons }) => lessons.map(({ id }) => id));

export { assessmentSchema, parseAssessment } from "./assessment";
export {
  assessmentProgressSchema,
  assessmentResponseSchema,
  reviewScheduleSchema,
  parseAssessmentProgress,
  parseAssessmentResponse,
  parseReviewSchedule,
} from "./progress";
