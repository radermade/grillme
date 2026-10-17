import type { ReadinessEvidence, SyncEvent } from "@grillme/domain";
import type { ApiPath, AuthPort, ConnectivityPort, PlatformPorts, StoragePort, SyncPort, SyncQueuePort, UpdatePort } from "@grillme/platform";
import { learningFixtures, parseAssessment, parseAssessmentResponse, parseGrillEvidence, parseLab, parseLabEvidence, parseMock, parseMockEvidence, parseScenario, parseScenarioEvidence } from "@grillme/content";
import { assessmentReadinessEvidence, createDeterministicConsolePort, grillReadinessEvidence, labReadinessEvidence, mockReadinessEvidence, scenarioReadinessEvidence } from "@grillme/evaluation";

import { browserStorage } from "./storage";

const api = import.meta.env.VITE_CONTROL_PLANE_URL as string | undefined;
const apiBase = (): URL => {
  const url = new URL(api ?? location.origin, location.origin);
  if (url.origin !== location.origin) throw new Error("CONTROL_PLANE_MUST_BE_SAME_ORIGIN");
  return url;
};
const post = async (path: ApiPath, body: unknown): Promise<unknown> => {
  const response = await fetch(new URL(path, apiBase()), { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body), redirect: "error", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error(response.status === 401 ? "SESSION_REVOKED" : "SERVICE_UNAVAILABLE");
  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
};
export const storage: StoragePort = browserStorage;
export const connectivity: ConnectivityPort = {
  current: () => navigator.onLine ? "online" : "offline",
  subscribe(listener) { const online = () => listener("online"); const offline = () => listener("offline"); window.addEventListener("online", online); window.addEventListener("offline", offline); return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); }; },
};
export const auth: AuthPort = {
  callback() {
    const parameters = new URLSearchParams(location.search);
    const code = parameters.get("code")?.slice(0, 2048);
    const state = parameters.get("state")?.slice(0, 2048);
    if (!code || !state) return null;
    history.replaceState(null, "", location.pathname);
    return { code, state };
  },
  restore: () => post("/session/browser", {}),
  async beginAuthorization() { const url = new URL("/session/authorize", apiBase()); url.searchParams.set("returnTo", `${location.origin}${location.pathname}`); location.assign(url); },
  completeAuthorization: ({ code, state }) => post("/session/browser/callback", { code, state }),
  refresh: () => post("/session/browser/refresh", {}),
  async signOut() { await post("/session/browser/revoke", {}); },
};
const syncListeners = new Set<(event: SyncEvent) => void>();
export const queue: SyncQueuePort = {
  async enqueue(event) { const key = `sync-pending:${event.courseId}:${event.courseVersion}`; await storage.append(key, event); syncListeners.forEach((listener) => listener(event)); },
  subscribe(listener) { syncListeners.add(listener); return () => syncListeners.delete(listener); },
};
export const remote: SyncPort = { push: (events) => post("/sync/push", events), pull: (courseId, courseVersion) => post("/sync/pull", { courseId, courseVersion }) };
export const clock = { now: () => new Date().toISOString() };

export const labs: import("@grillme/platform").LabPort = {
  async provision(labId, labVersion) {
    const value = await post("/lab/provision", { labId, labVersion });
    if (!value || typeof value !== "object" || !("session" in value)) throw new Error("INVALID_LAB_SESSION");
    return (value as { session: unknown }).session;
  },
  status: (sessionId) => post("/lab/status", { sessionId }),
  async operate(sessionId, operation) { await post("/lab/operate", { sessionId, operation }); },
  validate: (sessionId, checkpointId, attemptId) => post("/lab/validate", { sessionId, checkpointId, attemptId }),
  stop: (sessionId) => post("/lab/stop", { sessionId }),
};

export const restrictedAws: import("@grillme/platform").AwsLabPort = {
  restore: (labSessionId) => post("/aws-lab/restore", { labSessionId }),
  issue: (labSessionId, policyId, policyVersion) => post("/aws-lab/issue", { labSessionId, policyId, policyVersion }),
  execute: (leaseId, operation) => post("/aws-lab/execute", { leaseId, operation }),
  async revoke(leaseId) { await post("/aws-lab/revoke", { leaseId }); },
};

export const contentReports: import("@grillme/platform").ContentReportPort = {
  submit: (report) => post("/content/report", report),
};

export const analytics: import("@grillme/platform").ProductAnalyticsPort = { async submit(events) { await post("/operations/analytics", events); }, async delete() { await post("/operations/analytics/delete", {}); } };
export const privacy: import("@grillme/platform").PrivacyPort = { request: (value) => post("/operations/privacy", value) };
export const entitlements: import("@grillme/platform").EntitlementPort = { load: () => post("/operations/entitlement", {}) };
export const releases: import("@grillme/platform").ReleasePort = { assignment: (channel, currentVersion) => post("/operations/release", { channel, currentVersion }) };
export const support: import("@grillme/platform").SupportPort = { async submit(snapshot) { await post("/operations/support", snapshot); }, export: () => post("/operations/support/export", {}) };
export const platform: PlatformPorts = {
  storage,
  telemetry: { record: () => undefined },
  clock,
  ids: { create: () => crypto.randomUUID() },
  navigation: {
    async openExternal(value) {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("Only secure external links are allowed.");
      window.open(url, "_blank", "noopener,noreferrer");
    },
  },
  syncQueue: queue,
};

export const updates: UpdatePort = { async check() { return { available: false }; } };
export const semanticConsole = createDeterministicConsolePort(clock.now);
export const loadMetadata = async (): Promise<{ version: string }> => ({ version: "web" });

export const readinessEvidence: import("@grillme/platform").ReadinessEvidencePort = {
  async load() {
    const courseId = "aws-aip-c01";
    const courseVersion = "0.1.0";
    const output: ReadinessEvidence[] = [];
    const assessment = parseAssessment(learningFixtures.assessment);
    const responses = await storage.get(`assessment-responses:${assessment.id}:${assessment.version}`);
    if (Array.isArray(responses)) for (const value of responses) {
      const parsed = parseAssessmentResponse(value);
      if (parsed) output.push(assessmentReadinessEvidence(parsed, courseId, courseVersion));
    }
    const grillEvents = await storage.get("grill-events:structured-output-grill:1.0.0");
    if (Array.isArray(grillEvents)) for (const value of grillEvents) {
      const parsed = parseGrillEvidence(value);
      if (parsed) output.push(grillReadinessEvidence(parsed));
    }
    for (const source of learningFixtures.scenarios) {
      const scenario = parseScenario(source);
      const events = await storage.get(`scenario-events:${scenario.id}:${scenario.version}`);
      if (Array.isArray(events)) for (const value of events) {
        const parsed = parseScenarioEvidence(value);
        if (parsed) output.push(scenarioReadinessEvidence(parsed, scenario.skillIds, scenario.kind));
      }
    }
    const lab = parseLab(learningFixtures.lab);
    const labEvents = await storage.get(`lab-events:${lab.id}:${lab.version}`);
    if (Array.isArray(labEvents)) for (const value of labEvents) {
      const parsed = parseLabEvidence(value);
      if (parsed) output.push(labReadinessEvidence(parsed, ["bedrock-integration", "structured-output", "output-safety", "safe-observability", "retry-reliability"]));
    }
    const mock = parseMock(learningFixtures.mock);
    for (const event of parseMockEvidence(await storage.get(`mock-events:${mock.id}:${mock.version}`))) {
      output.push(...mockReadinessEvidence(event));
    }
    return output;
  },
};
