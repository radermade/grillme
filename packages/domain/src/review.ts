export type ReviewItem = {
  skillId: string;
  title: string;
  prompt: string;
  answer: string;
  reason: string;
  removalCriteria: string;
  dueAt: string;
  intervalDays: number;
  successfulReviews: number;
  sourceAssessmentId: string;
};

export type ReviewSchedule = {
  schemaVersion: 1;
  courseId: string;
  courseVersion: string;
  items: ReviewItem[];
  updatedAt: string;
};

export type ReviewEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "skill.reviewed";
  courseId: string;
  courseVersion: string;
  skillId: string;
  confidence: number;
  removed: boolean;
  nextDueAt: string | null;
  occurredAt: string;
};