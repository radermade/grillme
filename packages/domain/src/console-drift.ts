export type DriftApproval = "pending" | "approved" | "denied";
export type DriftClassification = "cosmetic" | "navigational" | "semantic" | "service-availability" | "false-positive";
export type DriftReviewDecision = "accepted" | "rejected";

export type ConsoleDriftJourney = {
  schemaVersion: 1;
  id: string;
  version: string;
  status: "draft" | "approved" | "disabled";
  serviceId: string;
  allowedOrigins: string[];
  allowedRegions: string[];
  startRoute: string;
  steps: { id: string; action: "navigate" | "activate" | "observe"; targetId: string; route?: string }[];
  capture: { labels: boolean; landmarks: boolean; routes: boolean; screenshot: "disabled" | "encrypted" };
  maxPages: number;
  maxDurationSeconds: number;
  maxCostUnits: number;
  retentionDays: number;
  identity: "workload-federation";
  dedicatedCanaryAccount: true;
  approvals: { legal: DriftApproval; security: DriftApproval; privacy: DriftApproval; awsUsage: DriftApproval };
  owners: { credentials: string; incidents: string; retention: string; contentReview: string };
};

export type ConsoleDriftLandmark = { targetId: string; role: string; label: string };
export type ConsoleDriftPage = { origin: string; route: string; labels: string[]; landmarks: ConsoleDriftLandmark[]; screenshotArtifactId: string | null };
export type ConsoleDriftObservation = {
  schemaVersion: 1;
  id: string;
  journeyId: string;
  journeyVersion: string;
  region: string;
  pages: ConsoleDriftPage[];
  redactedFields: string[];
  costUnits: number;
  startedAt: string;
  completedAt: string;
  expiresAt: string;
};
export type ConsoleDriftBaseline = {
  schemaVersion: 1;
  id: string;
  journeyId: string;
  journeyVersion: string;
  presentationVersion: string;
  pages: ConsoleDriftPage[];
  approvedBy: string;
  approvedAt: string;
};

export type ConsoleDriftChange = {
  id: string;
  type: "label" | "landmark" | "route" | "screenshot" | "availability";
  targetId: string | null;
  previous: string | null;
  current: string | null;
};
export type ConsoleDriftRecord = {
  schemaVersion: 1;
  id: string;
  journeyId: string;
  baselineId: string;
  observationId: string;
  changes: ConsoleDriftChange[];
  detectedAt: string;
};
export type ConsoleDriftSuspicion = {
  schemaVersion: 1;
  id: string;
  driftRecordId: string;
  journeyId: string;
  status: "awaiting-review" | "accepted" | "rejected" | "released";
  suggestedClassification: Exclude<DriftClassification, "false-positive">;
  classification: DriftClassification | null;
  guidanceAction: "none" | "mark-stale" | "disable-new-sessions";
  reviewerId: string | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
};
export type ConsoleMappingRelease = {
  schemaVersion: 1;
  id: string;
  suspicionId: string;
  journeyId: string;
  previousPresentationVersion: string;
  nextPresentationVersion: string;
  status: "candidate" | "released";
  approvals: { content: DriftApproval; regression: DriftApproval };
  releasedBy: string | null;
  releasedAt: string | null;
};
export type ConsoleDriftAuditEvent = {
  schemaVersion: 1;
  id: string;
  journeyId: string;
  operation: "run" | "observe" | "diff" | "review" | "release" | "cleanup";
  outcome: "allowed" | "denied" | "completed" | "failed";
  costUnits: number;
  occurredAt: string;
};