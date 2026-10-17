import { z } from "zod";
import type { CommercialEntitlement, PrivacyRequest, PrivacyRequestReceipt, ReleaseAssignment, ReleaseManifest } from "@grillme/domain";

const id = z.string().min(1).max(200);
const timestamp = z.iso.datetime({ offset: true });
const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
export const commercialEntitlementSchema = z.object({ schemaVersion: z.literal(1), userId: id, plan: z.enum(["private-beta", "trial", "individual", "team"]), status: z.enum(["active", "past-due", "expired", "cancelled"]), courseIds: z.array(id).max(100), features: z.array(id).max(100), expiresAt: timestamp.nullable(), graceExpiresAt: timestamp.nullable() }).strict();
export const privacyRequestSchema = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, type: z.enum(["export", "delete"]), occurredAt: timestamp }).strict();
export const privacyRequestReceiptSchema = z.object({ requestId: id, type: z.enum(["export", "delete"]), status: z.enum(["accepted", "ready", "scheduled", "complete"]), availableUntil: timestamp.nullable() }).strict();
export const releaseManifestSchema = z.object({ schemaVersion: z.literal(1), channel: z.enum(["dev", "beta", "stable"]), version: semver, minimumSupportedVersion: semver, rolloutPercent: z.number().int().min(0).max(100), rollbackVersion: semver.nullable(), status: z.enum(["draft", "active", "paused", "rolled-back"]), macosSigned: z.boolean(), windowsSigned: z.boolean(), publishedAt: timestamp }).strict().superRefine((manifest, context) => { if (manifest.channel === "stable" && manifest.status === "active" && (!manifest.macosSigned || !manifest.windowsSigned)) context.addIssue({ code: "custom", message: "Stable releases require signed macOS and Windows artifacts." }); if (manifest.status === "rolled-back" && !manifest.rollbackVersion) context.addIssue({ code: "custom", message: "Rollback releases require a rollback version." }); });
export const releaseAssignmentSchema = z.object({ channel: z.enum(["dev", "beta", "stable"]), currentVersion: semver, assignedVersion: semver, action: z.enum(["none", "update", "rollback", "unsupported"]) }).strict();
export const parseCommercialEntitlement = (value: unknown): CommercialEntitlement | null => commercialEntitlementSchema.safeParse(value).data ?? null;
export const parsePrivacyRequest = (value: unknown): PrivacyRequest | null => privacyRequestSchema.safeParse(value).data ?? null;
export const parsePrivacyRequestReceipt = (value: unknown): PrivacyRequestReceipt | null => privacyRequestReceiptSchema.safeParse(value).data ?? null;
export const parseReleaseManifest = (value: unknown): ReleaseManifest => releaseManifestSchema.parse(value) as ReleaseManifest;
export const parseReleaseAssignment = (value: unknown): ReleaseAssignment | null => releaseAssignmentSchema.safeParse(value).data ?? null;
