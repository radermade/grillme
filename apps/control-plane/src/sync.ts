import { parseSyncEvents } from "@grillme/content";
import type { AuthoritativeProgressSummary, SyncConflict, SyncEvent, SyncPushResult } from "@grillme/domain";
import type { AuthService } from "./contracts";

export interface EntitlementService {
  authorize(input: { userId: string; courseId: string; courseVersion: string; feature: "progress-sync" }): Promise<"allowed" | "forbidden" | "version-conflict">;
}
export interface EventStore {
  list(userId: string, courseId: string): Promise<SyncEvent[]>;
  append(userId: string, event: SyncEvent): Promise<"accepted" | "duplicate" | "scored-conflict">;
}
export class SyncServiceError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN", message: string) { super(message); this.name = "SyncServiceError"; }
}
export const deriveSummary = (courseId: string, courseVersion: string, events: SyncEvent[], now: string): AuthoritativeProgressSummary => ({
  schemaVersion: 1,
  courseId,
  courseVersion,
  completedLessonIds: [...new Set(events.filter(({ type }) => type === "lesson.completed").map(({ entityId }) => entityId))],
  acceptedScoredEventIds: events.filter(({ scored }) => scored).map(({ id }) => id),
  updatedAt: now,
});

export const createSyncService = (deps: { auth: AuthService; entitlements: EntitlementService; events: EventStore; now(): string }) => ({
  async push(authorization: string, input: unknown): Promise<SyncPushResult> {
    const auth = await deps.auth.authenticate(authorization);
    if (!auth) throw new SyncServiceError("UNAUTHORIZED", "Authentication is required.");
    const events = parseSyncEvents(input);
    if (!events?.length) throw new SyncServiceError("INVALID_REQUEST", "Sync events are invalid.");
    const acceptedIds: string[] = [];
    const conflicts: SyncConflict[] = [];
    for (const event of events) {
      const access = await deps.entitlements.authorize({ userId: auth.userId, courseId: event.courseId, courseVersion: event.courseVersion, feature: "progress-sync" });
      if (access === "forbidden") throw new SyncServiceError("FORBIDDEN", "Course access is unavailable.");
      if (access === "version-conflict") {
        conflicts.push({ eventId: event.id, code: "CONTENT_VERSION_MISMATCH", message: "Progress targets a course version that is no longer current." });
        continue;
      }
      const result = await deps.events.append(auth.userId, event);
      if (result === "scored-conflict") {
        conflicts.push({ eventId: event.id, code: "SCORED_ATTEMPT_CONFLICT", message: "A different scored result already exists for this attempt." });
        continue;
      }
      acceptedIds.push(event.id);
    }
    return { acceptedIds, conflicts };
  },
  async pull(authorization: string, courseId: string, courseVersion: string): Promise<AuthoritativeProgressSummary> {
    const auth = await deps.auth.authenticate(authorization);
    if (!auth) throw new SyncServiceError("UNAUTHORIZED", "Authentication is required.");
    if (!courseId || courseId.length > 200 || !courseVersion || courseVersion.length > 200) throw new SyncServiceError("INVALID_REQUEST", "Course is invalid.");
    const access = await deps.entitlements.authorize({ userId: auth.userId, courseId, courseVersion, feature: "progress-sync" });
    if (access !== "allowed") throw new SyncServiceError("FORBIDDEN", "Course access is unavailable.");
    const events = await deps.events.list(auth.userId, courseId);
    return deriveSummary(courseId, courseVersion, events.filter((event) => event.courseVersion === courseVersion), deps.now());
  },
});
