export type SyncEventType =
  | "lesson.completed"
  | "assessment.responded"
  | "skill.reviewed"
  | "grill.turn-evaluated"
  | "scenario.validated"
  | "lab.session-ended"
  | "mock.completed";

export type SyncEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: SyncEventType;
  courseId: string;
  courseVersion: string;
  entityId: string;
  attempt: number;
  scored: boolean;
  outcome: number | null;
  occurredAt: string;
  metadata: Record<string, string | number | boolean>;
};

export type SyncConflict = {
  eventId: string;
  code: "CONTENT_VERSION_MISMATCH" | "SCORED_ATTEMPT_CONFLICT";
  message: string;
};

export type AuthoritativeProgressSummary = {
  schemaVersion: 1;
  courseId: string;
  courseVersion: string;
  completedLessonIds: string[];
  acceptedScoredEventIds: string[];
  updatedAt: string;
};
export type SyncPushResult = {
  acceptedIds: string[];
  conflicts: SyncConflict[];
};
