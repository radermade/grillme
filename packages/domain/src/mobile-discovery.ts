export type MobileWorkflow = "reading" | "review" | "short-grill" | "readiness" | "lab";
export type MobileCandidate = "tauri-mobile" | "react-native" | "pwa" | "defer";

export type MobileDiscoveryRecord = {
  schemaVersion: 1;
  cohortSize: number;
  observationDays: number;
  mobileSizedSessions: number;
  totalSessions: number;
  shortSessions: number;
  workflowDemand: Record<MobileWorkflow, number>;
  candidates: Array<{
    id: Exclude<MobileCandidate, "defer">;
    capability: number;
    accessibility: number;
    distribution: number;
    teamCost: number;
  }>;
};

export type MobileDecision = {
  decision: MobileCandidate;
  prioritizedWorkflows: MobileWorkflow[];
  reasons: string[];
};
