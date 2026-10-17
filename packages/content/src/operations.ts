import { z } from "zod";
import type { AnalyticsConsent, ProductAnalyticsEvent, SupportSnapshot } from "@grillme/domain";

const id = z.string().min(1).max(200);
const timestamp = z.iso.datetime({ offset: true });
const base = { schemaVersion: z.literal(1), id, idempotencyKey: id, occurredAt: timestamp };
export const analyticsConsentSchema = z.object({ schemaVersion: z.literal(1), productAnalytics: z.boolean(), updatedAt: timestamp }).strict();
export const productAnalyticsEventSchema = z.discriminatedUnion("name", [
  z.object({ ...base, name: z.literal("app.opened"), fields: z.object({ appVersion: id, channel: z.enum(["dev", "beta", "stable"]), platform: z.enum(["desktop", "web"]) }).strict() }).strict(),
  z.object({ ...base, name: z.literal("learning.finished"), fields: z.object({ activityType: z.enum(["lesson", "assessment", "grill", "review", "scenario", "lab", "mock"]), outcome: z.enum(["completed", "abandoned", "failed"]), durationBucket: z.enum(["under-5m", "5-20m", "over-20m"]) }).strict() }).strict(),
  z.object({ ...base, name: z.literal("sync.finished"), fields: z.object({ outcome: z.enum(["synchronized", "conflict", "failed"]), pendingCount: z.number().int().min(0).max(100_000) }).strict() }).strict(),
  z.object({ ...base, name: z.literal("usage.costed"), fields: z.object({ capability: z.enum(["evaluation", "sandbox-lab", "restricted-aws-lab"]), costUnits: z.number().finite().min(0).max(100_000) }).strict() }).strict(),
  z.object({ ...base, name: z.literal("readiness.sampled"), fields: z.object({ score: z.number().int().min(0).max(100), sufficiency: z.enum(["insufficient", "limited", "sufficient"]) }).strict() }).strict(),
  z.object({ ...base, name: z.literal("support.requested"), fields: z.object({ category: z.enum(["content", "account", "sync", "lab", "accessibility"]) }).strict() }).strict(),
]);
export const supportSnapshotSchema = z.object({ schemaVersion: z.literal(1), appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/), platform: z.enum(["desktop", "web"]), releaseChannel: z.enum(["dev", "beta", "stable"]), connectivity: z.enum(["online", "offline"]), pendingSyncCount: z.number().int().min(0).max(100_000), activeWorkflow: z.enum(["startup", "course", "assessment", "grill", "training", "lab", "readiness", "mock", "review", "operations"]), errorCodes: z.array(z.enum(["CONTENT_INVALID", "STORAGE_FAILED", "NETWORK_UNAVAILABLE", "AUTH_EXPIRED", "SYNC_CONFLICT", "LAB_UNAVAILABLE", "UNKNOWN"])).max(100), generatedAt: timestamp }).strict();
export const parseAnalyticsConsent = (value: unknown): AnalyticsConsent | null => analyticsConsentSchema.safeParse(value).data ?? null;
export const parseProductAnalyticsEvent = (value: unknown): ProductAnalyticsEvent | null => productAnalyticsEventSchema.safeParse(value).data as ProductAnalyticsEvent | undefined ?? null;
export const parseProductAnalyticsEvents = (value: unknown): ProductAnalyticsEvent[] => z.array(productAnalyticsEventSchema).max(1_000).safeParse(value).data as ProductAnalyticsEvent[] | undefined ?? [];
export const parseSupportSnapshot = (value: unknown): SupportSnapshot | null => supportSnapshotSchema.safeParse(value).data ?? null;
