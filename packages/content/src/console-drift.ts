import { z } from "zod";
import type { ConsoleDriftBaseline, ConsoleDriftJourney, ConsoleDriftObservation } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const version = z.string().min(1).max(50);
const timestamp = z.iso.datetime({ offset: true });
const route = z.string().min(1).max(500).regex(/^\/[a-zA-Z0-9/_?=&.-]*$/);
const approval = z.enum(["pending", "approved", "denied"]);
const page = z.object({
  origin: z.url(),
  route,
  labels: z.array(z.string().min(1).max(200)).max(100),
  landmarks: z.array(z.object({ targetId: id, role: id, label: z.string().min(1).max(200) }).strict()).max(100),
  screenshotArtifactId: id.nullable(),
}).strict();
export const consoleDriftJourneySchema = z.object({
  schemaVersion: z.literal(1), id, version, status: z.enum(["draft", "approved", "disabled"]), serviceId: id,
  allowedOrigins: z.array(z.url()).min(1).max(5), allowedRegions: z.array(z.string().regex(/^[a-z]{2}-[a-z]+-\d$/)).min(1).max(10), startRoute: route,
  steps: z.array(z.object({ id, action: z.enum(["navigate", "activate", "observe"]), targetId: id, route: route.optional() }).strict()).min(1).max(30),
  capture: z.object({ labels: z.boolean(), landmarks: z.boolean(), routes: z.boolean(), screenshot: z.enum(["disabled", "encrypted"]) }).strict(),
  maxPages: z.number().int().min(1).max(30), maxDurationSeconds: z.number().int().min(10).max(600), maxCostUnits: z.number().int().min(1).max(100), retentionDays: z.number().int().min(1).max(90),
  identity: z.literal("workload-federation"), dedicatedCanaryAccount: z.literal(true),
  approvals: z.object({ legal: approval, security: approval, privacy: approval, awsUsage: approval }).strict(),
  owners: z.object({ credentials: id, incidents: id, retention: id, contentReview: id }).strict(),
}).strict().superRefine((journey, context) => {
  if (journey.allowedOrigins.some((value) => new URL(value).protocol !== "https:")) context.addIssue({ code: "custom", message: "Crawler origins must use HTTPS." });
  if (journey.steps.filter(({ action }) => action === "navigate").length > journey.maxPages) context.addIssue({ code: "custom", message: "Journey exceeds its page limit." });
  if (new Set(journey.steps.map(({ id: stepId }) => stepId)).size !== journey.steps.length) context.addIssue({ code: "custom", message: "Journey step IDs must be unique." });
});
export const consoleDriftObservationSchema = z.object({ schemaVersion: z.literal(1), id, journeyId: id, journeyVersion: version, region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), pages: z.array(page).max(30), redactedFields: z.array(id).max(30), costUnits: z.number().min(0).max(100), startedAt: timestamp, completedAt: timestamp, expiresAt: timestamp }).strict();
export const consoleDriftBaselineSchema = z.object({ schemaVersion: z.literal(1), id, journeyId: id, journeyVersion: version, presentationVersion: version, pages: z.array(page).max(30), approvedBy: id, approvedAt: timestamp }).strict();
export const parseConsoleDriftJourney = (value: unknown): ConsoleDriftJourney => consoleDriftJourneySchema.parse(value) as ConsoleDriftJourney;
export const parseConsoleDriftObservation = (value: unknown): ConsoleDriftObservation => consoleDriftObservationSchema.parse(value) as ConsoleDriftObservation;
export const parseConsoleDriftBaseline = (value: unknown): ConsoleDriftBaseline => consoleDriftBaselineSchema.parse(value) as ConsoleDriftBaseline;
export const consoleDriftRecordSchema = z.object({ schemaVersion: z.literal(1), id, journeyId: id, baselineId: id, observationId: id, changes: z.array(z.object({ id, type: z.enum(["label", "landmark", "route", "screenshot", "availability"]), targetId: id.nullable(), previous: z.string().max(500).nullable(), current: z.string().max(500).nullable() }).strict()).max(500), detectedAt: timestamp }).strict();
export const consoleDriftSuspicionSchema = z.object({ schemaVersion: z.literal(1), id, driftRecordId: id, journeyId: id, status: z.enum(["awaiting-review", "accepted", "rejected", "released"]), suggestedClassification: z.enum(["cosmetic", "navigational", "semantic", "service-availability"]), classification: z.enum(["cosmetic", "navigational", "semantic", "service-availability", "false-positive"]).nullable(), guidanceAction: z.enum(["none", "mark-stale", "disable-new-sessions"]), reviewerId: id.nullable(), reviewerNotes: z.string().max(1_000).nullable(), reviewedAt: timestamp.nullable() }).strict();
export const consoleMappingReleaseSchema = z.object({ schemaVersion: z.literal(1), id, suspicionId: id, journeyId: id, previousPresentationVersion: version, nextPresentationVersion: version, status: z.enum(["candidate", "released"]), approvals: z.object({ content: approval, regression: approval }).strict(), releasedBy: id.nullable(), releasedAt: timestamp.nullable() }).strict();
export const consoleDriftReviewSchema = z.object({ decision: z.enum(["accepted", "rejected"]), classification: z.enum(["cosmetic", "navigational", "semantic", "service-availability", "false-positive"]), guidanceAction: z.enum(["none", "mark-stale", "disable-new-sessions"]), reviewerId: id, notes: z.string().min(1).max(1_000) }).strict().superRefine((review, context) => {
  if (review.decision === "accepted" && review.classification === "false-positive") context.addIssue({ code: "custom", message: "Accepted drift cannot be a false positive." });
  if (review.decision === "rejected" && review.classification !== "false-positive") context.addIssue({ code: "custom", message: "Rejected drift must be classified as a false positive." });
});
export const consoleMappingReleaseInputSchema = z.object({ nextPresentationVersion: version, releasedBy: id, approvals: z.object({ content: z.literal("approved"), regression: z.literal("approved") }).strict() }).strict();
export const parseConsoleDriftRecord = (value: unknown) => consoleDriftRecordSchema.parse(value);
export const parseConsoleDriftSuspicion = (value: unknown) => consoleDriftSuspicionSchema.parse(value);
export const parseConsoleMappingRelease = (value: unknown) => consoleMappingReleaseSchema.parse(value);
export const parseConsoleDriftReview = (value: unknown) => consoleDriftReviewSchema.parse(value);
export const parseConsoleMappingReleaseInput = (value: unknown) => consoleMappingReleaseInputSchema.parse(value);