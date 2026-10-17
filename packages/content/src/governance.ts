import { z } from "zod";
import type { ContentReport, ContentReportReceipt, CourseReleaseManifest } from "@grillme/domain";

const id = z.string().min(1).max(200);
const timestamp = z.iso.datetime({ offset: true });
const decision = z.enum(["pending", "approved", "changes-required"]);
export const courseReleaseManifestSchema = z.object({
  schemaVersion: z.literal(1), courseId: id, courseVersion: id, status: z.enum(["draft", "review", "released", "withdrawn"]),
  sourceUrls: z.array(z.url()).min(1).max(50), sourceRetrievedAt: z.iso.date(), skillIds: z.array(id).min(1).max(100),
  approvals: z.object({ product: decision, technical: decision, instructional: decision, accessibility: decision, lab: decision }).strict(),
  correctionOwner: z.string().min(1).max(200).nullable(), nextReviewAt: timestamp, knownLimitations: z.array(z.string().min(1).max(1_000)).max(50),
}).strict().superRefine((manifest, context) => {
  if (manifest.status === "released" && (Object.values(manifest.approvals).some((value) => value !== "approved") || !manifest.correctionOwner)) context.addIssue({ code: "custom", message: "Released content requires all approvals and a correction owner." });
});
export const contentReportSchema = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, courseId: id, courseVersion: id, contentId: id, category: z.enum(["technical-error", "unclear", "accessibility", "stale", "unsafe"]), summary: z.string().min(1).max(500), occurredAt: timestamp }).strict();
export const contentReportReceiptSchema = z.object({ reportId: id, status: z.literal("reported"), severity: z.enum(["critical", "high", "normal"]) }).strict();
export const parseCourseReleaseManifest = (value: unknown): CourseReleaseManifest => courseReleaseManifestSchema.parse(value) as CourseReleaseManifest;
export const parseContentReport = (value: unknown): ContentReport | null => contentReportSchema.safeParse(value).data ?? null;
export const parseContentReportReceipt = (value: unknown): ContentReportReceipt | null => contentReportReceiptSchema.safeParse(value).data ?? null;
