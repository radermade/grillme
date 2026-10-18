import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ReadinessEvidence, SyncEvent } from "@grillme/domain";
import type { ApiPath, PlatformPorts, StoragePort, SyncQueuePort, UpdatePort } from "@grillme/platform";
import { assessmentReadinessEvidence, createDeterministicConsolePort, grillReadinessEvidence, labReadinessEvidence, mockReadinessEvidence, scenarioReadinessEvidence } from "@grillme/evaluation";
import { learningFixtures, parseAssessment, parseAssessmentResponse, parseGrillEvidence, parseLab, parseLabEvidence, parseMock, parseMockEvidence, parseScenario, parseScenarioEvidence } from "@grillme/content";

const storage: StoragePort = {
  async get(key) {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") as unknown; }
    catch { return null; }
  },
  async set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  async append(key, value) {
    const current = await this.get(key);
    const values = Array.isArray(current) ? current : [];
    const idempotencyKey = value && typeof value === "object" && "idempotencyKey" in value
      ? String(value.idempotencyKey)
      : null;
    if (idempotencyKey && values.some((entry) =>
      entry && typeof entry === "object" && "idempotencyKey" in entry
      && String(entry.idempotencyKey) === idempotencyKey)) return;
    localStorage.setItem(key, JSON.stringify([...values, value]));
  },
  async remove(key) { localStorage.removeItem(key); },
};

const syncListeners = new Set<(event: SyncEvent) => void>();
export const syncQueue: SyncQueuePort = {
  async enqueue(event) {
    await storage.append(`sync-pending:${event.courseId}:${event.courseVersion}`, event);
    syncListeners.forEach((listener) => listener(event));
  },
  subscribe(listener) {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
  },
};

export const platform: PlatformPorts = {
  storage,
  telemetry: { record: () => undefined },
  clock: { now: () => new Date().toISOString() },
  ids: { create: () => crypto.randomUUID() },
  navigation: {
    async openExternal(value) {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("Only secure external links are allowed.");
      if (!("__TAURI_INTERNALS__" in window)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      await openUrl(url.toString());
    },
  },
  syncQueue,
};

export const updates: UpdatePort = { async check() { return { available: false }; } };
export const semanticConsole = createDeterministicConsolePort(platform.clock.now);

export const loadMetadata = async (): Promise<{ version: string }> => {
  if (!("__TAURI_INTERNALS__" in window)) return { version: "web-preview" };
  try { return await invoke<{ version: string }>("app_metadata"); }
  catch { throw new Error("Application metadata is unavailable."); }
};

export const connectivity: import("@grillme/platform").ConnectivityPort = {
  current: () => navigator.onLine ? "online" : "offline",
  subscribe(listener) {
    const online = () => listener("online");
    const offline = () => listener("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  },
};

const previewSecrets = new Map<string, string>();
export const secureStorage: import("@grillme/platform").SecureStoragePort = {
  async get(key) { return "__TAURI_INTERNALS__" in window ? invoke<string | null>("secure_get", { key }) : previewSecrets.get(key) ?? null; },
  async set(key, value) {
    if (value.length === 0 || value.length > 4096) throw new Error("Secure value is invalid.");
    if ("__TAURI_INTERNALS__" in window) await invoke("secure_set", { key, value });
    else previewSecrets.set(key, value);
  },
  async remove(key) {
    if ("__TAURI_INTERNALS__" in window) await invoke("secure_remove", { key });
    else previewSecrets.delete(key);
  },
};

const apiBase = import.meta.env.VITE_CONTROL_PLANE_URL as string | undefined;
const sessionCacheKey = "account-session:v1";
const authorizeUrl = import.meta.env.VITE_AUTHORIZE_URL as string | undefined;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined;
const redirectUri = import.meta.env.VITE_AUTH_REDIRECT_URI as string | undefined;
let accessToken: string | null = null;
const secureUrl = (value: string): URL => {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("A secure service URL is required.");
  return url;
};
const request = async (path: ApiPath, body?: unknown): Promise<unknown> => {
  if (!apiBase) throw new Error("The control plane is not configured.");
  const response = await fetch(new URL(path, secureUrl(apiBase)), {
    method: "POST",
    headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "SESSION_REVOKED" : "SERVICE_UNAVAILABLE");
  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
};
const randomValue = () => crypto.randomUUID().replaceAll("-", "");
const sha256 = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
const base64Url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
type Grant = { session: unknown; accessToken: string; refreshToken: string };
const grant = (value: unknown): Grant => {
  if (!value || typeof value !== "object") throw new Error("INVALID_SESSION");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.accessToken !== "string" || typeof candidate.refreshToken !== "string") throw new Error("INVALID_SESSION");
  return { session: candidate.session, accessToken: candidate.accessToken, refreshToken: candidate.refreshToken };
};
const acceptGrant = async (value: unknown): Promise<unknown> => {
  const result = grant(value);
  accessToken = result.accessToken;
  await secureStorage.set("refresh-token", result.refreshToken);
  await storage.set(sessionCacheKey, result.session);
  return result.session;
};

export const auth: import("@grillme/platform").AuthPort = {
  callback: () => null,
  async restore() {
    const refreshToken = await secureStorage.get("refresh-token");
    if (!refreshToken) return null;
    if (connectivity.current() === "online") return acceptGrant(await request("/session/refresh", { refreshToken }));
    return storage.get(sessionCacheKey);
  },
  async beginAuthorization() {
    if (!authorizeUrl || !clientId || !redirectUri) throw new Error("Sign-in is not configured.");
    const verifier = `${randomValue()}${randomValue()}`;
    const state = randomValue();
    await secureStorage.set("pkce-verifier", verifier);
    await secureStorage.set("oauth-state", state);
    const url = secureUrl(authorizeUrl);
    url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirectUri, code_challenge_method: "S256", code_challenge: base64Url(await sha256(verifier)), state }).toString();
    await platform.navigation.openExternal(url.toString());
  },
  async completeAuthorization(callback) {
    const expectedState = await secureStorage.get("oauth-state");
    const verifier = await secureStorage.get("pkce-verifier");
    if (!expectedState || callback.state !== expectedState || !verifier || !redirectUri) throw new Error("INVALID_CALLBACK");
    await secureStorage.remove("oauth-state");
    await secureStorage.remove("pkce-verifier");
    return acceptGrant(await request("/session/exchange", { code: callback.code, verifier, redirectUri }));
  },
  async refresh() {
    const refreshToken = await secureStorage.get("refresh-token");
    if (!refreshToken) throw new Error("SESSION_EXPIRED");
    return acceptGrant(await request("/session/refresh", { refreshToken }));
  },
  async signOut() {
    const refreshToken = await secureStorage.get("refresh-token");
    try { if (refreshToken) await request("/session/revoke", { refreshToken }); } finally {
      accessToken = null;
      await storage.remove(sessionCacheKey);
      await Promise.all([secureStorage.remove("refresh-token"), secureStorage.remove("pkce-verifier"), secureStorage.remove("oauth-state"), secureStorage.remove("lab-connection-ticket")]);
    }
  },
};

export const syncRemote: import("@grillme/platform").SyncPort = {
  push: (events) => request("/sync/push", events),
  pull: (courseId, courseVersion) => request("/sync/pull", { courseId, courseVersion }),
};

const labGrant = (value: unknown): { session: unknown; connectionTicket: string } => {
  if (!value || typeof value !== "object") throw new Error("INVALID_LAB_SESSION");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.connectionTicket !== "string" || candidate.connectionTicket.length > 4096) throw new Error("INVALID_LAB_SESSION");
  return { session: candidate.session, connectionTicket: candidate.connectionTicket };
};
export const labs: import("@grillme/platform").LabPort = {
  async provision(labId, labVersion) {
    const result = labGrant(await request("/lab/provision", { labId, labVersion }));
    await secureStorage.set("lab-connection-ticket", result.connectionTicket);
    return result.session;
  },
  status: (sessionId) => request("/lab/status", { sessionId }),
  async operate(sessionId, operation) { await request("/lab/operate", { sessionId, operation }); },
  validate: (sessionId, checkpointId, attemptId) => request("/lab/validate", { sessionId, checkpointId, attemptId }),
  async stop(sessionId) {
    try { return await request("/lab/stop", { sessionId }); }
    finally { await secureStorage.remove("lab-connection-ticket"); }
  },
};

export const restrictedAws: import("@grillme/platform").AwsLabPort = {
  restore: (labSessionId) => request("/aws-lab/restore", { labSessionId }),
  issue: (labSessionId, policyId, policyVersion) => request("/aws-lab/issue", { labSessionId, policyId, policyVersion }),
  execute: (leaseId, operation) => request("/aws-lab/execute", { leaseId, operation }),
  async revoke(leaseId) { await request("/aws-lab/revoke", { leaseId }); },
};
export const managedConsole: import("@grillme/platform").ManagedConsolePort = {
  launch: (labSessionId, policyId, policyVersion) => request("/managed-console/launch", { labSessionId, policyId, policyVersion }),
  restore: (labSessionId) => request("/managed-console/restore", { labSessionId }),
  status: (sessionId) => request("/managed-console/status", { sessionId }),
  budget: (sessionId) => request("/managed-console/budget", { sessionId }),
  validate: (sessionId, checkpointId) => request("/managed-console/validate", { sessionId, checkpointId }),
  revoke: (sessionId) => request("/managed-console/revoke", { sessionId }),
  revokeForLab: (labSessionId) => request("/managed-console/revoke-for-lab", { labSessionId }),
};

export const readinessEvidence: import("@grillme/platform").ReadinessEvidencePort = {
  async load() {
    const courseId = "aws-aip-c01";
    const courseVersion = "0.1.0";
    const output: ReadinessEvidence[] = [];
    const assessment = parseAssessment(learningFixtures.assessment);
    const responses = await storage.get(`assessment-responses:${assessment.id}:${assessment.version}`);
    if (Array.isArray(responses)) for (const value of responses) { const parsed = parseAssessmentResponse(value); if (parsed) output.push(assessmentReadinessEvidence(parsed, courseId, courseVersion)); }
    const grillEvents = await storage.get("grill-events:structured-output-grill:1.0.0");
    if (Array.isArray(grillEvents)) for (const value of grillEvents) { const parsed = parseGrillEvidence(value); if (parsed) output.push(grillReadinessEvidence(parsed)); }
    for (const source of learningFixtures.scenarios) {
      const scenario = parseScenario(source);
      const events = await storage.get(`scenario-events:${scenario.id}:${scenario.version}`);
      if (Array.isArray(events)) for (const value of events) { const parsed = parseScenarioEvidence(value); if (parsed) output.push(scenarioReadinessEvidence(parsed, scenario.skillIds, scenario.kind)); }
    }
    const lab = parseLab(learningFixtures.lab);
    const labEvents = await storage.get(`lab-events:${lab.id}:${lab.version}`);
    if (Array.isArray(labEvents)) for (const value of labEvents) { const parsed = parseLabEvidence(value); if (parsed) output.push(labReadinessEvidence(parsed, ["bedrock-integration", "structured-output", "output-safety", "safe-observability", "retry-reliability"])); }
    const mock = parseMock(learningFixtures.mock);
    for (const event of parseMockEvidence(await storage.get(`mock-events:${mock.id}:${mock.version}`))) output.push(...mockReadinessEvidence(event));
    return output;
  },
};

export const contentReports: import("@grillme/platform").ContentReportPort = {
  submit: (report) => request("/content/report", report),
};

export const analytics: import("@grillme/platform").ProductAnalyticsPort = {
  async submit(events) { await request("/operations/analytics", events); },
  async delete() { await request("/operations/analytics/delete"); },
};
export const privacy: import("@grillme/platform").PrivacyPort = { request: (value) => request("/operations/privacy", value) };
export const entitlements: import("@grillme/platform").EntitlementPort = { load: () => request("/operations/entitlement") };
export const releases: import("@grillme/platform").ReleasePort = { assignment: (channel, currentVersion) => request("/operations/release", { channel, currentVersion }) };
export const support: import("@grillme/platform").SupportPort = {
  async submit(snapshot) { await request("/operations/support", snapshot); },
  async export() { return request("/operations/support/export"); },
};

export const workspaceNavigation: import("@grillme/ui").WorkspaceNavigation = {
  current: () => ({ view: "course" }),
  navigate: () => undefined,
  subscribe: () => () => undefined,
};
