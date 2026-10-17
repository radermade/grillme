export type LabCheckpoint = {
  id: string;
  title: string;
  objective: string;
  instructions: string;
  hints: string[];
};

export type LabDefinition = {
  schemaVersion: 1;
  id: string;
  version: string;
  courseId: string;
  courseVersion: string;
  title: string;
  description: string;
  imageDigest: string;
  maxDurationMinutes: number;
  maxAttempts: number;
  estimatedCostUnits: number;
  starterFiles: { path: string; content: string }[];
  checkpoints: LabCheckpoint[];
  debrief: { explanation: string; prevention: string };
};

export type LabSession = {
  schemaVersion: 1;
  id: string;
  labId: string;
  labVersion: string;
  status: "provisioning" | "ready" | "stopping" | "expired" | "cleaned" | "failed";
  provenance: import("./validator").ValidationProvenance & { compatibilityId: string; compatibilityVersion: string };
  terminalPath: string;
  editorPath: string;
  createdAt: string;
  expiresAt: string;
};

export type LabOperation =
  | "set-retry-limit"
  | "enable-strict-schema"
  | "enable-output-blocking"
  | "sanitize-telemetry"
  | "reset-workspace";

export type LabProgress = {
  schemaVersion: 1;
  labId: string;
  labVersion: string;
  sessionId: string;
  checkpointIndex: number;
  hintLevel: number;
  attempts: number;
  validationRequests: number;
  completedCheckpointIds: string[];
  lastValidation: import("./validator").LabValidation | null;
  expiresAt: string;
  updatedAt: string;
};

export type LabEvidenceEvent = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "lab.checkpoint-validated" | "lab.session-ended";
  courseId: string;
  courseVersion: string;
  labId: string;
  labVersion: string;
  sessionId: string;
  checkpointId: string | null;
  passed: boolean;
  validatorId: string;
  validatorVersion: string;
  attemptNumber: number;
  hintsUsed: number;
  occurredAt: string;
};
