import type { LearningEvent, ReviewEvent, ScenarioEvidenceEvent, SyncEvent } from "@grillme/domain";

export const lessonSyncEvent = (event: LearningEvent): SyncEvent => ({
  schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: event.type,
  courseId: event.courseId, courseVersion: event.courseVersion, entityId: event.lessonId,
  attempt: 1, scored: false, outcome: null, occurredAt: event.occurredAt, metadata: {},
});
export const reviewSyncEvent = (event: ReviewEvent): SyncEvent => ({
  schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: event.type,
  courseId: event.courseId, courseVersion: event.courseVersion, entityId: event.skillId,
  attempt: 1, scored: false, outcome: null, occurredAt: event.occurredAt,
  metadata: { confidence: event.confidence, removed: event.removed },
});
export const scenarioSyncEvent = (event: ScenarioEvidenceEvent): SyncEvent => ({
  schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: event.type,
  courseId: event.courseId, courseVersion: event.courseVersion, entityId: `${event.scenarioId}:${event.checkpointId}`,
  attempt: event.attemptNumber, scored: event.mode === "challenge", outcome: event.passed ? 1 : 0,
  occurredAt: event.occurredAt, metadata: { mode: event.mode, hintsUsed: event.hintsUsed, resets: event.resets },
});
export const assessmentSyncEvent = (event: import("@grillme/domain").AssessmentResponse, courseId: string, courseVersion: string): SyncEvent => ({
  schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: event.type,
  courseId, courseVersion, entityId: `${event.assessmentId}:${event.activityId}`,
  attempt: event.attemptNumber, scored: true, outcome: event.correct ? 1 : 0, occurredAt: event.occurredAt,
  metadata: { confidence: event.confidence, elapsedMs: event.elapsedMs },
});
export const grillSyncEvent = (event: import("@grillme/domain").GrillEvidenceEvent): SyncEvent => ({
  schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: event.type,
  courseId: event.courseId, courseVersion: event.courseVersion, entityId: `${event.grillId}:${event.turn.promptId}`,
  attempt: event.turn.attemptNumber, scored: true, outcome: event.turn.evaluation.score, occurredAt: event.turn.occurredAt,
  metadata: { confidence: event.turn.confidence, evaluatorId: event.turn.evaluation.evaluatorId },
});
export const mockSyncEvent = (event: import("@grillme/domain").MockEvidenceEvent): SyncEvent => ({ schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: event.type, courseId: event.courseId, courseVersion: event.courseVersion, entityId: event.mockId, attempt: 1, scored: true, outcome: Object.values(event.skillScores).reduce((sum, score) => sum + score, 0) / Math.max(1, Object.keys(event.skillScores).length), occurredAt: event.occurredAt, metadata: { skills: Object.keys(event.skillScores).length } });
export const labSyncEvent = (event: import("@grillme/domain").LabEvidenceEvent): SyncEvent => ({ schemaVersion: 1, id: event.id, idempotencyKey: event.idempotencyKey, type: "lab.session-ended", courseId: event.courseId, courseVersion: event.courseVersion, entityId: event.labId, attempt: event.attemptNumber || 1, scored: true, outcome: event.passed ? 1 : 0, occurredAt: event.occurredAt, metadata: { hintsUsed: event.hintsUsed } });
