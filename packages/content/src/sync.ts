import { z } from "zod";
import type { AccountSession, AuthoritativeProgressSummary, SyncConflict, SyncEvent, SyncPushResult } from "@grillme/domain";

const id = z.string().min(1).max(200);
const timestamp = z.iso.datetime({ offset: true });
export const accountSessionSchema = z.object({
  schemaVersion: z.literal(1), userId: id, displayName: z.string().min(1).max(200),
  accessExpiresAt: timestamp, offlineGraceExpiresAt: timestamp,
  entitlements: z.array(z.object({ courseId: id, features: z.array(id).max(50), expiresAt: timestamp.nullable() }).strict()).max(100),
}).strict();
export const syncEventSchema = z.object({
  schemaVersion: z.literal(1), id, idempotencyKey: id,
  type: z.enum(["lesson.completed", "assessment.responded", "skill.reviewed", "grill.turn-evaluated", "scenario.validated", "lab.session-ended", "mock.completed"]),
  courseId: id, courseVersion: id, entityId: id, attempt: z.number().int().min(1).max(10_000),
  scored: z.boolean(), outcome: z.number().min(0).max(1).nullable(), occurredAt: timestamp,
  metadata: z.record(z.string().min(1).max(100), z.union([z.string().max(500), z.number().finite(), z.boolean()])),
}).strict();
const conflictSchema = z.object({ eventId: id, code: z.enum(["CONTENT_VERSION_MISMATCH", "SCORED_ATTEMPT_CONFLICT"]), message: z.string().min(1).max(300) }).strict();
const pushResultSchema = z.object({ acceptedIds: z.array(id).max(1_000), conflicts: z.array(conflictSchema).max(1_000) }).strict();
export const summarySchema = z.object({ schemaVersion: z.literal(1), courseId: id, courseVersion: id, completedLessonIds: z.array(id), acceptedScoredEventIds: z.array(id), updatedAt: timestamp }).strict();
export const parseAccountSession = (value: unknown): AccountSession | null => accountSessionSchema.safeParse(value).data ?? null;
export const parseSyncEvent = (value: unknown): SyncEvent | null => syncEventSchema.safeParse(value).data ?? null;
export const parseSyncEvents = (value: unknown): SyncEvent[] | null => z.array(syncEventSchema).max(1_000).safeParse(value).data ?? null;
export const parseSyncConflicts = (value: unknown): SyncConflict[] | null => z.array(conflictSchema).max(1_000).safeParse(value).data ?? null;
export const parseSyncPushResult = (value: unknown): SyncPushResult | null => pushResultSchema.safeParse(value).data ?? null;
export const parseSummary = (value: unknown): AuthoritativeProgressSummary | null => summarySchema.safeParse(value).data ?? null;
