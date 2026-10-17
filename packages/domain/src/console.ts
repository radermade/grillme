import type { ScenarioMode } from "./scenario";

export type ConsoleValue = string | number | boolean;
export type ConsoleResource = {
  id: string;
  targetId: string;
  serviceId: string;
  type: string;
  name: string;
  status: "pending" | "active" | "warning" | "error";
  properties: Record<string, ConsoleValue>;
  updatedAt: string;
};
export type ConsoleLogEntry = {
  id: string;
  level: "info" | "warning" | "error";
  category: string;
  message: string;
  occurredAt: string;
};
export type SemanticConsoleState = {
  resources: ConsoleResource[];
  relationships: { id: string; from: string; to: string; type: string }[];
  logs: ConsoleLogEntry[];
};
export type SemanticConsoleField = {
  id: string;
  label: string;
  type: "text" | "select";
  required: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
};
export type SemanticConsoleOperation = {
  id: string;
  targetId: string;
  serviceId: string;
  label: string;
  description: string;
  formId: string;
};
export type SemanticConsoleCheckpoint = {
  id: string;
  title: string;
  objective: string;
  operationId: string;
  intent: string;
  instruction: string;
  rationale: string;
  expectedOutcome: string;
  hints: string[];
};
export type SemanticConsoleDefinition = {
  schemaVersion: 1;
  id: string;
  version: string;
  simulatorVersion: string;
  courseId: string;
  courseVersion: string;
  title: string;
  description: string;
  skillIds: string[];
  mapping: {
    semanticVersion: string;
    awsVersion: string;
    presentationVersion: string;
    lastVerifiedAt: string;
  };
  services: { id: string; targetId: string; name: string; description: string }[];
  views: { id: string; targetId: string; serviceId: string; title: string; type: "list" | "details" | "form" | "logs" }[];
  forms: { id: string; targetId: string; title: string; fields: SemanticConsoleField[] }[];
  operations: SemanticConsoleOperation[];
  checkpoints: SemanticConsoleCheckpoint[];
  initialState: SemanticConsoleState;
  debrief: { rootCause: string; prevention: string; explanation: string };
};
export type ConsoleOperationRequest = { scenarioId: string; scenarioVersion: string; operationId: string; values: Record<string, ConsoleValue>; state: SemanticConsoleState };
export type ConsoleOperationResult = { schemaVersion: 1; operationId: string; state: SemanticConsoleState; changedResourceIds: string[] };
export type ConsoleValidation = import("./validator").LabValidation & { passedCheckIds: string[] };

export type ConsoleProgress = {
  schemaVersion: 1;
  scenarioId: string;
  scenarioVersion: string;
  simulatorVersion: string;
  semanticVersion: string;
  awsVersion: string;
  presentationVersion: string;
  mappingVerifiedAt: string;
  sessionId: string;
  mode: ScenarioMode;
  checkpointIndex: number;
  state: SemanticConsoleState;
  checkpointStart: SemanticConsoleState;
  hintLevel: number;
  resets: number;
  attempts: number;
  completedCheckpointIds: string[];
  updatedAt: string;
};
export type ConsoleEvidenceEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "console.validated";
  courseId: string;
  courseVersion: string;
  scenarioId: string;
  scenarioVersion: string;
  simulatorVersion: string;
  semanticVersion: string;
  awsVersion: string;
  presentationVersion: string;
  mappingVerifiedAt: string;
  sessionId: string;
  mode: ScenarioMode;
  checkpointId: string;
  status: ConsoleValidation["status"];
  validatorId: string;
  validatorVersion: string;
  passedCheckIds: string[];
  failedCheckIds: string[];
  hintsUsed: number;
  resets: number;
  attemptNumber: number;
  occurredAt: string;
};