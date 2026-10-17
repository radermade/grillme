export type SkillDefinition = {
  id: string;
  title: string;
  remediation: string;
  reviewPrompt: string;
  reviewAnswer: string;
};

export type Choice = { id: string; label: string };
type ActivityBase = { id: string; prompt: string; skillIds: string[]; rationale: string };
export type AssessmentActivity =
  | (ActivityBase & { type: "single-choice"; choices: Choice[]; correctOptionId: string })
  | (ActivityBase & { type: "multiple-choice"; choices: Choice[]; correctOptionIds: string[] })
  | (ActivityBase & { type: "ordering"; items: Choice[]; correctOrder: string[] })
  | (ActivityBase & { type: "short-text"; requiredConcepts: { label: string; terms: string[] }[] });

export type Assessment = {
  schemaVersion: 1;
  id: string;
  version: string;
  courseId: string;
  courseVersion: string;
  title: string;
  description: string;
  skills: SkillDefinition[];
  activities: AssessmentActivity[];
};

export type AssessmentAnswer = string | string[];
export type AssessmentResponse = {
  schemaVersion: 1;
  type: "assessment.responded";
  id: string;
  idempotencyKey: string;
  assessmentId: string;
  assessmentVersion: string;
  activityId: string;
  skillIds: string[];
  answer: AssessmentAnswer;
  confidence: number;
  elapsedMs: number;
  attemptNumber: number;
  correct: boolean;
  occurredAt: string;
};

export type SkillGap = {
  skillId: string;
  title: string;
  correct: number;
  total: number;
  accuracy: number;
  averageConfidence: number;
  weak: boolean;
  remediation: string;
};

export type AssessmentProgress = {
  schemaVersion: 1;
  assessmentId: string;
  assessmentVersion: string;
  responses: AssessmentResponse[];
  updatedAt: string;
};
