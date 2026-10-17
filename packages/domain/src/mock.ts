export type MockItem = {
  id: string;
  skillIds: string[];
  prompt: string;
  choices: { id: string; label: string }[];
  correctChoiceId: string;
  rationale: string;
};

export type MockDefinition = {
  schemaVersion: 1;
  id: string;
  version: string;
  courseId: string;
  courseVersion: string;
  title: string;
  description: string;
  durationMinutes: number;
  items: MockItem[];
};

export type MockResponse = { itemId: string; choiceId: string; correct: boolean; elapsedMs: number };
export type MockProgress = {
  schemaVersion: 1;
  mockId: string;
  mockVersion: string;
  sessionId: string;
  currentIndex: number;
  startedAt: string;
  expiresAt: string;
  responses: MockResponse[];
  updatedAt: string;
};

export type MockEvidenceEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "mock.completed";
  courseId: string;
  courseVersion: string;
  mockId: string;
  mockVersion: string;
  sessionId: string;
  skillScores: Record<string, number>;
  occurredAt: string;
};
