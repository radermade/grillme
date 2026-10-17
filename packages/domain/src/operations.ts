export type AnalyticsConsent = {
  schemaVersion: 1;
  productAnalytics: boolean;
  updatedAt: string;
};

export type ProductAnalyticsEvent =
  | { schemaVersion: 1; id: string; idempotencyKey: string; name: "app.opened"; occurredAt: string; fields: { appVersion: string; channel: "dev" | "beta" | "stable"; platform: "desktop" | "web" } }
  | { schemaVersion: 1; id: string; idempotencyKey: string; name: "learning.finished"; occurredAt: string; fields: { activityType: "lesson" | "assessment" | "grill" | "review" | "scenario" | "lab" | "mock"; outcome: "completed" | "abandoned" | "failed"; durationBucket: "under-5m" | "5-20m" | "over-20m" } }
  | { schemaVersion: 1; id: string; idempotencyKey: string; name: "sync.finished"; occurredAt: string; fields: { outcome: "synchronized" | "conflict" | "failed"; pendingCount: number } }
  | { schemaVersion: 1; id: string; idempotencyKey: string; name: "usage.costed"; occurredAt: string; fields: { capability: "evaluation" | "sandbox-lab" | "restricted-aws-lab"; costUnits: number } }
  | { schemaVersion: 1; id: string; idempotencyKey: string; name: "readiness.sampled"; occurredAt: string; fields: { score: number; sufficiency: "insufficient" | "limited" | "sufficient" } }
  | { schemaVersion: 1; id: string; idempotencyKey: string; name: "support.requested"; occurredAt: string; fields: { category: "content" | "account" | "sync" | "lab" | "accessibility" } };

export type BetaMetrics = {
  activeLearners: number;
  returningLearners: number;
  returnRate: number;
  learningCompletions: number;
  learningFailures: number;
  grillCompletionRate: number;
  labSuccessRate: number;
  reviewCompletionRate: number;
  learnersWithReadinessIncrease: number;
  supportRequests: number;
  supportRequestsPerActiveLearner: number;
  syncConflicts: number;
  totalCostUnits: number;
  costPerActiveLearner: number;
};

export type SupportSnapshot = {
  schemaVersion: 1;
  appVersion: string;
  platform: "desktop" | "web";
  releaseChannel: "dev" | "beta" | "stable";
  connectivity: "online" | "offline";
  pendingSyncCount: number;
  activeWorkflow: "startup" | "course" | "assessment" | "grill" | "training" | "lab" | "readiness" | "mock" | "review" | "operations";
  errorCodes: Array<"CONTENT_INVALID" | "STORAGE_FAILED" | "NETWORK_UNAVAILABLE" | "AUTH_EXPIRED" | "SYNC_CONFLICT" | "LAB_UNAVAILABLE" | "UNKNOWN">;
  generatedAt: string;
};
