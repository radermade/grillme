import type { ConsoleDriftAuditEvent, ConsoleDriftBaseline, ConsoleDriftJourney, ConsoleDriftObservation, ConsoleDriftRecord, ConsoleDriftSuspicion, ConsoleMappingRelease } from "@grillme/domain";
import type { ConsoleDriftAuditStore, ConsoleDriftCrawlerProvider, ConsoleDriftIdentityProvider, ConsoleDriftJourneyRepository, ConsoleDriftStore } from "./console-drift-contracts";

export const bedrockDriftJourney: ConsoleDriftJourney = {
  schemaVersion: 1, id: "bedrock-guardrails-canary", version: "1.0.0", status: "approved", serviceId: "amazon-bedrock",
  allowedOrigins: ["https://console.invalid"], allowedRegions: ["us-east-1"], startRoute: "/bedrock/home",
  steps: [
    { id: "open-bedrock", action: "navigate", targetId: "service-search-bedrock", route: "/bedrock/home" },
    { id: "open-guardrails", action: "activate", targetId: "bedrock-guardrails" },
    { id: "observe-guardrails", action: "observe", targetId: "guardrails-list" },
  ],
  capture: { labels: true, landmarks: true, routes: true, screenshot: "disabled" },
  maxPages: 3, maxDurationSeconds: 60, maxCostUnits: 3, retentionDays: 30,
  identity: "workload-federation", dedicatedCanaryAccount: true,
  approvals: { legal: "approved", security: "approved", privacy: "approved", awsUsage: "approved" },
  owners: { credentials: "platform-security", incidents: "crawler-operations", retention: "privacy-operations", contentReview: "content-governance" },
};
export const bedrockDriftBaseline: ConsoleDriftBaseline = {
  schemaVersion: 1, id: "bedrock-guardrails-baseline", journeyId: bedrockDriftJourney.id, journeyVersion: bedrockDriftJourney.version, presentationVersion: "1.0.0",
  pages: [{ origin: "https://console.invalid", route: "/bedrock/home", labels: ["Guardrails"], landmarks: [{ targetId: "bedrock-guardrails", role: "link", label: "Guardrails" }], screenshotArtifactId: null }],
  approvedBy: "content-governance", approvedAt: "2026-10-17T00:00:00.000Z",
};
export const createControlledDriftCrawler = (clock: { now(): string }, ids: { create(): string }): ConsoleDriftCrawlerProvider => ({
  async crawl({ journey, region }, signal) {
    if (signal.aborted) throw new Error("Crawler cancelled.");
    const startedAt = clock.now(); const completedAt = clock.now();
    return { schemaVersion: 1, id: ids.create(), journeyId: journey.id, journeyVersion: journey.version, region,
      pages: [{ origin: "https://console.invalid", route: "/bedrock/home", labels: ["Safety guardrails", "Account 123456789012"], landmarks: [{ targetId: "bedrock-guardrails", role: "link", label: "Safety guardrails" }], screenshotArtifactId: null }],
      redactedFields: [], costUnits: 1, startedAt, completedAt, expiresAt: completedAt } satisfies ConsoleDriftObservation;
  },
  async cleanup() {},
});
export const createControlledDriftIdentity = (clock: { now(): string }) => {
  const handles = new Set<string>();
  const provider: ConsoleDriftIdentityProvider = {
    async authorize({ journeyId, maxDurationSeconds }) { const handle = `workload:${journeyId}`; const issuedAt = clock.now(); handles.add(handle); return { handle, issuedAt, expiresAt: new Date(Date.parse(issuedAt) + maxDurationSeconds * 1_000).toISOString() }; },
    async revoke(handle) { handles.delete(handle); },
    async listActiveHandles() { return [...handles]; },
  };
  return provider;
};
export const createMemoryDriftRepository = (journeys: ConsoleDriftJourney[]): ConsoleDriftJourneyRepository => ({ async find(id) { return journeys.find((journey) => journey.id === id) ?? null; } });
export const createMemoryDriftStore = (baselines: ConsoleDriftBaseline[]): ConsoleDriftStore & { observations: ConsoleDriftObservation[]; records: ConsoleDriftRecord[]; suspicions: ConsoleDriftSuspicion[]; releases: ConsoleMappingRelease[] } => {
  const observations: ConsoleDriftObservation[] = []; const records: ConsoleDriftRecord[] = []; const suspicions: ConsoleDriftSuspicion[] = []; const releases: ConsoleMappingRelease[] = [];
  return {
    observations, records, suspicions, releases,
    async baseline(journeyId, journeyVersion) { return baselines.find((value) => value.journeyId === journeyId && value.journeyVersion === journeyVersion) ?? null; },
    async putObservation(value) { observations.push(value); }, async putRecord(value) { records.push(value); },
    async putSuspicion(value) { const index = suspicions.findIndex(({ id }) => id === value.id); if (index < 0) suspicions.push(value); else suspicions[index] = value; },
    async suspicion(id) { return suspicions.find((value) => value.id === id) ?? null; },
    async putRelease(value) { const index = releases.findIndex(({ id }) => id === value.id); if (index < 0) releases.push(value); else releases[index] = value; },
    async release(id) { return releases.find((value) => value.id === id) ?? null; },
    async guidanceAction(journeyId) {
      const reviewed = suspicions.filter((value) => value.journeyId === journeyId && (value.status === "accepted" || value.status === "released"));
      if (reviewed.some(({ guidanceAction }) => guidanceAction === "disable-new-sessions")) return "disable-new-sessions";
      if (reviewed.some(({ guidanceAction }) => guidanceAction === "mark-stale")) return "mark-stale";
      return "none";
    },
    async removeExpired(now) { const before = observations.length; const kept = observations.filter(({ expiresAt }) => Date.parse(expiresAt) > Date.parse(now)); observations.splice(0, observations.length, ...kept); return before - observations.length; },
  };
};
export const createMemoryDriftAudit = (): ConsoleDriftAuditStore & { events: ConsoleDriftAuditEvent[] } => { const events: ConsoleDriftAuditEvent[] = []; return { events, async record(event) { events.push(event); } }; };
