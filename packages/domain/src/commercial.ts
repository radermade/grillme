export type CommercialEntitlement = {
  schemaVersion: 1;
  userId: string;
  plan: "private-beta" | "trial" | "individual" | "team";
  status: "active" | "past-due" | "expired" | "cancelled";
  courseIds: string[];
  features: string[];
  expiresAt: string | null;
  graceExpiresAt: string | null;
};

export type PrivacyRequest = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  type: "export" | "delete";
  occurredAt: string;
};
export type PrivacyRequestReceipt = {
  requestId: string;
  type: "export" | "delete";
  status: "accepted" | "ready" | "scheduled" | "complete";
  availableUntil: string | null;
};

export type ReleaseChannel = "dev" | "beta" | "stable";
export type ReleaseManifest = {
  schemaVersion: 1;
  channel: ReleaseChannel;
  version: string;
  minimumSupportedVersion: string;
  rolloutPercent: number;
  rollbackVersion: string | null;
  status: "draft" | "active" | "paused" | "rolled-back";
  macosSigned: boolean;
  windowsSigned: boolean;
  publishedAt: string;
};
export type ReleaseAssignment = {
  channel: ReleaseChannel;
  currentVersion: string;
  assignedVersion: string;
  action: "none" | "update" | "rollback" | "unsupported";
};
