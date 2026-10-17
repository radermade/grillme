export type AwsIsolationModel = "dedicated-account-per-session" | "shared-account-tag-isolated";

export type AwsLabPolicy = {
  schemaVersion: 1;
  id: string;
  version: string;
  labId: string;
  labVersion: string;
  isolationModel: AwsIsolationModel;
  region: string;
  allowedServices: string[];
  allowedActions: string[];
  resourcePrefixes: string[];
  requiredTags: Record<string, string>;
  maxDurationMinutes: number;
  credentialDurationMinutes: number;
  spendLimitUsd: number;
};

export type AwsCredentialLease = {
  schemaVersion: 1;
  id: string;
  labSessionId: string;
  status: "active" | "revoking" | "revoked" | "expired";
  region: string;
  issuedAt: string;
  expiresAt: string;
  spendLimitUsd: number;
  spentUsd: number;
};

export type AwsLabOperation = {
  id: string;
  idempotencyKey: string;
  service: string;
  action: string;
  region: string;
  resource: string;
  resourceTags: Record<string, string>;
  estimatedCostUsd: number;
};

export type AwsOperationReceipt = {
  schemaVersion: 1;
  operationId: string;
  leaseId: string;
  status: "accepted" | "rejected";
  costUsd: number;
  spentUsd: number;
  occurredAt: string;
};

export type AwsCredentialAuditEvent = {
  schemaVersion: 1;
  id: string;
  leaseId: string;
  labSessionId: string;
  operation: "issue" | "execute" | "revoke" | "expire" | "sweep";
  outcome: "allowed" | "denied" | "completed" | "failed";
  policyId: string;
  operationId: string | null;
  costUsd: number;
  occurredAt: string;
};
