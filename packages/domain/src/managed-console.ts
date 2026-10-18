import type { LabValidation, ValidationProvenance } from "./validator";

export type ManagedConsoleSession = {
  schemaVersion: 1;
  id: string;
  labSessionId: string;
  policyId: string;
  policyVersion: string;
  status: "active" | "revoking" | "revoked" | "expired";
  region: string;
  issuedAt: string;
  expiresAt: string;
  spendLimitUsd: number;
  spentUsd: number;
  provenance: ValidationProvenance & { compatibilityId: string; compatibilityVersion: string };
};
export type ManagedConsoleLaunch = {
  schemaVersion: 1;
  session: ManagedConsoleSession;
  launchUrl: string;
  launchExpiresAt: string;
};
export type ManagedConsoleBudget = {
  schemaVersion: 1;
  sessionId: string;
  spendLimitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  exhausted: boolean;
  observedAt: string;
};
export type ManagedConsoleValidation = LabValidation;
export type ManagedConsoleAuditEvent = {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  labSessionId: string;
  userId: string;
  operation: "allocate" | "launch" | "restore" | "status" | "validate" | "budget" | "revoke-access" | "cleanup" | "sweep";
  outcome: "allowed" | "denied" | "completed" | "failed" | "inconclusive";
  costUsd: number;
  occurredAt: string;
};