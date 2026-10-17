export type RubricConcept = {
  id: string;
  label: string;
  terms: string[];
  remediation: string;
  probe: string;
};

export type RubricMisconception = {
  id: string;
  label: string;
  terms: string[];
  correction: string;
  probe: string;
};

export type GrillRubric = {
  id: string;
  version: string;
  concepts: RubricConcept[];
  misconceptions: RubricMisconception[];
};

export type GrillPrompt = {
  id: string;
  skillId: string;
  question: string;
  reason: string;
  hint: string;
  rubric: GrillRubric;
};

export type Grill = {
  schemaVersion: 1;
  id: string;
  version: string;
  courseId: string;
  courseVersion: string;
  title: string;
  description: string;
  maxTurns: number;
  maxEvaluationAttempts: number;
  evaluationBudget: number;
  prompts: GrillPrompt[];
};

export type EvaluationRequest = {
  schemaVersion: 1;
  sessionId: string;
  turnId: string;
  promptId: string;
  rubricId: string;
  rubricVersion: string;
  response: string;
  confidence: number;
};

export type EvaluationResult = {
  schemaVersion: 1;
  rubricId: string;
  rubricVersion: string;
  evaluatorId: string;
  evaluatorVersion: string;
  modelVersion: string | null;
  coveredConceptIds: string[];
  missingConceptIds: string[];
  misconceptionIds: string[];
  evidence: { conceptId: string; excerpt: string }[];
  score: number;
  feedback: string;
  followUp: { question: string; reason: string } | null;
  costUnits: number;
};

export type GrillTurn = {
  id: string;
  promptId: string;
  skillId: string;
  question: string;
  reason: string;
  response: string;
  confidence: number;
  evaluation: EvaluationResult;
  attemptNumber: number;
  occurredAt: string;
};

export type GrillProgress = {
  schemaVersion: 1;
  grillId: string;
  grillVersion: string;
  sessionId: string;
  turns: GrillTurn[];
  budgetUsed: number;
  currentPromptId: string;
  pendingQuestion: string | null;
  pendingReason: string | null;
  updatedAt: string;
};

export type GrillEvidenceEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "grill.turn-evaluated";
  courseId: string;
  courseVersion: string;
  grillId: string;
  grillVersion: string;
  sessionId: string;
  turn: GrillTurn;
};

export type GrillChallengeEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "grill.feedback-challenged" | "grill.content-reported";
  courseId: string;
  courseVersion: string;
  grillId: string;
  sessionId: string;
  turnId: string;
  occurredAt: string;
};

export type GrillSummary = {
  sessionId: string;
  turnsCompleted: number;
  budgetUsed: number;
  demonstratedConceptIds: string[];
  missingConceptIds: string[];
  misconceptionIds: string[];
  reviewSkillIds: string[];
};