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
export {
  evaluationResultSchema,
  grillProgressSchema,
  grillSchema,
  parseEvaluationResult,
  parseGrill,
  parseGrillEvidence,
  parseGrillProgress,
} from "./grill";
export { parseScenario, parseScenarioEvidence, parseScenarioProgress, scenarioEvidenceSchema, scenarioSchema } from "./scenario";
export {
  accountSessionSchema,
  parseAccountSession,
  parseSyncConflicts,
  parseSyncEvent,
  parseSyncEvents,
  parseSyncPushResult,
  parseSummary,
} from "./sync";
export { labEvidenceSchema, labProgressSchema, labSchema, labSessionSchema, parseLab, parseLabEvidence, parseLabProgress, parseLabSession, parseLabValidation } from "./lab";
export { awsCredentialLeaseSchema, awsLabOperationSchema, awsLabPolicySchema, awsOperationReceiptSchema, parseAwsCredentialLease, parseAwsLabOperation, parseAwsLabPolicy, parseAwsOperationReceipt } from "./aws-lab";
export { parseReadinessEvidence, parseReadinessRules, readinessEvidenceSchema, readinessRuleSetSchema } from "./readiness";
export { mockEvidenceSchema, mockProgressSchema, mockSchema, parseMock, parseMockEvidence, parseMockProgress } from "./mock";
export { auditSkillCoverage, parseCoverageActivities } from "./coverage";
export type { CoverageActivity, SkillCoverage } from "./coverage";
export { contentReportReceiptSchema, contentReportSchema, courseReleaseManifestSchema, parseContentReport, parseContentReportReceipt, parseCourseReleaseManifest } from "./governance";
export { analyticsConsentSchema, parseAnalyticsConsent, parseProductAnalyticsEvent, parseProductAnalyticsEvents, parseSupportSnapshot, productAnalyticsEventSchema, supportSnapshotSchema } from "./operations";
export { learningFixtures } from "./fixtures";
export type { LearningFixtures } from "./fixtures";
export { commercialEntitlementSchema, parseCommercialEntitlement, parsePrivacyRequest, parsePrivacyRequestReceipt, parseReleaseAssignment, parseReleaseManifest, privacyRequestReceiptSchema, privacyRequestSchema, releaseAssignmentSchema, releaseManifestSchema } from "./commercial";
export { mobileDiscoverySchema, parseMobileDiscovery } from "./mobile-discovery";
export { parseThemeSettings, themeSettingsSchema } from "./theme";
export { parseConsoleOperationResult, parseConsoleProgress, parseConsoleValidation, parseSemanticConsole, parseSemanticConsoleState, semanticConsoleSchema } from "./console";
