export type ScenarioMode = "walkthrough" | "practice" | "challenge";
export type ScenarioKind = "architecture" | "debugging";

export type ScenarioWorkspace = {
  selectedComponents: string[];
  connections: { from: string; to: string }[];
  settings: Record<string, string>;
  diagnosis: string;
};

export type ScenarioCheck =
  | { id: string; type: "component-selected"; componentId: string; message: string }
  | { id: string; type: "component-absent"; componentId: string; message: string }
  | { id: string; type: "connection"; from: string; to: string; message: string }
  | { id: string; type: "setting"; settingId: string; value: string; message: string }
  | { id: string; type: "diagnosis-concepts"; concepts: string[][]; message: string };

export type ScenarioCheckpoint = {
  id: string;
  title: string;
  objective: string;
  instruction: string;
  rationale: string;
  hints: string[];
  checks: ScenarioCheck[];
};

export type Scenario = {
  schemaVersion: 1;
  id: string;
  version: string;
  courseId: string;
  courseVersion: string;
  kind: ScenarioKind;
  title: string;
  description: string;
  skillIds: string[];
  availableComponents: { id: string; label: string }[];
  availableSettings: { id: string; label: string; options: string[] }[];
  resources: { id: string; type: "code" | "log" | "config" | "test-output"; title: string; body: string }[];
  initialWorkspace: ScenarioWorkspace;
  checkpoints: ScenarioCheckpoint[];
  debrief: { rootCause: string; prevention: string; explanation: string };
};

export type ScenarioValidation = {
  passed: boolean;
  passedCheckIds: string[];
  failedCheckIds: string[];
  feedback: string[];
};

export type ScenarioProgress = {
  schemaVersion: 1;
  scenarioId: string;
  scenarioVersion: string;
  sessionId: string;
  mode: ScenarioMode;
  checkpointIndex: number;
  workspace: ScenarioWorkspace;
  checkpointStart: ScenarioWorkspace;
  hintLevel: number;
  resets: number;
  attempts: number;
  completedCheckpointIds: string[];
  updatedAt: string;
};

export type ScenarioEvidenceEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "scenario.validated";
  courseId: string;
  courseVersion: string;
  scenarioId: string;
  scenarioVersion: string;
  sessionId: string;
  mode: ScenarioMode;
  checkpointId: string;
  passed: boolean;
  passedCheckIds: string[];
  failedCheckIds: string[];
  hintsUsed: number;
  resets: number;
  attemptNumber: number;
  occurredAt: string;
};