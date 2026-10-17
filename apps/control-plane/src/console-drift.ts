import { parseConsoleDriftBaseline, parseConsoleDriftJourney, parseConsoleDriftObservation, parseConsoleDriftReview, parseConsoleMappingReleaseInput } from "@grillme/content";
import type { ConsoleDriftChange, ConsoleDriftObservation, ConsoleDriftPage, ConsoleDriftRecord, ConsoleDriftSuspicion, ConsoleMappingRelease } from "@grillme/domain";
import type { ConsoleDriftDependencies, ConsoleDriftRunResult } from "./console-drift-contracts";

export class ConsoleDriftError extends Error {
  constructor(readonly code: "NOT_APPROVED" | "NOT_FOUND" | "OUT_OF_POLICY" | "BUDGET_EXCEEDED" | "INVALID_REVIEW" | "RELEASE_BLOCKED", message: string) { super(message); this.name = "ConsoleDriftError"; }
}
const allApproved = (values: Record<string, string>) => Object.values(values).every((value) => value === "approved");
const expiresAt = (completedAt: string, retentionDays: number) => new Date(Date.parse(completedAt) + retentionDays * 86_400_000).toISOString();
const pageKey = (page: ConsoleDriftPage) => page.route;
const redact = (value: string): { value: string; fields: string[] } => {
  const rules: Array<[string, RegExp]> = [
    ["account-id", /\b\d{12}\b/g], ["request-id", /\b[a-f0-9]{8}-[a-f0-9-]{27,}\b/gi],
    ["arn", /arn:aws[a-z-]*:[^\s"']+/gi], ["email", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  ];
  let output = value; const fields: string[] = [];
  for (const [field, pattern] of rules) if (pattern.test(output)) { fields.push(field); output = output.replace(pattern, `[${field}-redacted]`); }
  return { value: output, fields };
};
const sanitizeObservation = (source: ConsoleDriftObservation, journey: ReturnType<typeof parseConsoleDriftJourney>): ConsoleDriftObservation => {
  const approvedRoutes = new Set([journey.startRoute, ...journey.steps.flatMap((step) => step.route ? [step.route] : [])]);
  if (source.pages.length > journey.maxPages || source.pages.some(({ origin, route }) => !journey.allowedOrigins.includes(origin) || !approvedRoutes.has(route))) throw new ConsoleDriftError("OUT_OF_POLICY", "Crawler navigation left the approved origin or route manifest.");
  const fields = new Set<string>();
  const pages = source.pages.map((page) => {
    const safeRoute = page.route;
    const labels = journey.capture.labels ? page.labels.map((label) => { const result = redact(label); result.fields.forEach((field) => fields.add(field)); return result.value.slice(0, 200); }) : [];
    const landmarks = journey.capture.landmarks ? page.landmarks.map((item) => { const result = redact(item.label); result.fields.forEach((field) => fields.add(field)); return { ...item, label: result.value.slice(0, 200) }; }) : [];
    return { origin: page.origin, route: safeRoute, labels, landmarks, screenshotArtifactId: journey.capture.screenshot === "encrypted" ? page.screenshotArtifactId : null };
  });
  return parseConsoleDriftObservation({ ...source, pages, redactedFields: [...fields], expiresAt: expiresAt(source.completedAt, journey.retentionDays) });
};
export const diffConsoleObservation = (baselineInput: unknown, observation: ConsoleDriftObservation, id: string, detectedAt: string): ConsoleDriftRecord => {
  const baseline = parseConsoleDriftBaseline(baselineInput); const changes: ConsoleDriftChange[] = [];
  const previousPages = new Map(baseline.pages.map((page) => [pageKey(page), page]));
  const currentPages = new Map(observation.pages.map((page) => [pageKey(page), page]));
  for (const route of new Set([...previousPages.keys(), ...currentPages.keys()])) {
    const previous = previousPages.get(route); const current = currentPages.get(route);
    if (!previous || !current) { changes.push({ id: `route-${changes.length + 1}`, type: "route", targetId: null, previous: previous?.route ?? null, current: current?.route ?? null }); continue; }
    const oldLandmarks = new Map(previous.landmarks.map((item) => [item.targetId, item]));
    const newLandmarks = new Map(current.landmarks.map((item) => [item.targetId, item]));
    for (const targetId of new Set([...oldLandmarks.keys(), ...newLandmarks.keys()])) {
      const oldItem = oldLandmarks.get(targetId); const newItem = newLandmarks.get(targetId);
      if (!oldItem || !newItem) changes.push({ id: `landmark-${changes.length + 1}`, type: "landmark", targetId, previous: oldItem?.label ?? null, current: newItem?.label ?? null });
      else if (oldItem.label !== newItem.label || oldItem.role !== newItem.role) changes.push({ id: `label-${changes.length + 1}`, type: "label", targetId, previous: `${oldItem.role}:${oldItem.label}`, current: `${newItem.role}:${newItem.label}` });
    }
    if (previous.screenshotArtifactId && current.screenshotArtifactId && previous.screenshotArtifactId !== current.screenshotArtifactId) changes.push({ id: `screenshot-${changes.length + 1}`, type: "screenshot", targetId: null, previous: previous.screenshotArtifactId, current: current.screenshotArtifactId });
  }
  return { schemaVersion: 1, id, journeyId: observation.journeyId, baselineId: baseline.id, observationId: observation.id, changes, detectedAt };
};
const suspicionFor = (record: ConsoleDriftRecord, id: string): ConsoleDriftSuspicion | null => {
  if (!record.changes.length) return null;
  const types = new Set(record.changes.map(({ type }) => type));
  const suggestedClassification = types.has("availability") ? "service-availability" : types.has("landmark") ? "semantic" : types.has("route") ? "navigational" : "cosmetic";
  const guidanceAction = suggestedClassification === "service-availability" || suggestedClassification === "semantic" ? "disable-new-sessions" : suggestedClassification === "navigational" ? "mark-stale" : "none";
  return { schemaVersion: 1, id, driftRecordId: record.id, journeyId: record.journeyId, status: "awaiting-review", suggestedClassification, classification: null, guidanceAction, reviewerId: null, reviewerNotes: null, reviewedAt: null };
};
export const createConsoleDriftService = (deps: ConsoleDriftDependencies) => ({
  async prepare(journeyId: string, region: string) {
    const source = await deps.journeys.find(journeyId); if (!source) throw new ConsoleDriftError("NOT_FOUND", "Drift journey is unavailable.");
    const journey = parseConsoleDriftJourney(source);
    if (journey.status !== "approved" || !allApproved(journey.approvals) || !Object.values(journey.owners).every(Boolean)) throw new ConsoleDriftError("NOT_APPROVED", "Drift journey approvals and owners are required.");
    if (!journey.allowedRegions.includes(region)) throw new ConsoleDriftError("OUT_OF_POLICY", "Region is outside the approved journey.");
    return journey;
  },
  async authorize(journey: ReturnType<typeof parseConsoleDriftJourney>, region: string) {
    const grant = await deps.identity.authorize({ journeyId: journey.id, journeyVersion: journey.version, region, maxDurationSeconds: journey.maxDurationSeconds });
    if (Date.parse(grant.expiresAt) <= Date.parse(grant.issuedAt) || Date.parse(grant.expiresAt) > Date.parse(grant.issuedAt) + journey.maxDurationSeconds * 1_000) { await deps.identity.revoke(grant.handle); throw new ConsoleDriftError("OUT_OF_POLICY", "Workload identity exceeded the approved duration."); }
    return grant;
  },
  async crawl(journey: ReturnType<typeof parseConsoleDriftJourney>, region: string, identityHandle: string, signal: AbortSignal) {
    const source = await deps.crawler.crawl({ journey, region, identityHandle }, signal);
    const observation = sanitizeObservation(parseConsoleDriftObservation(source), journey);
    if (observation.journeyId !== journey.id || observation.journeyVersion !== journey.version || observation.region !== region || observation.costUnits > journey.maxCostUnits || Date.parse(observation.completedAt) < Date.parse(observation.startedAt) || Date.parse(observation.completedAt) - Date.parse(observation.startedAt) > journey.maxDurationSeconds * 1_000) throw new ConsoleDriftError("BUDGET_EXCEEDED", "Crawler output exceeded the approved journey bounds.");
    await deps.store.putObservation(observation); return observation;
  },
  async diff(journey: ReturnType<typeof parseConsoleDriftJourney>, observation: ConsoleDriftObservation): Promise<ConsoleDriftRunResult> {
    const baseline = await deps.store.baseline(journey.id, journey.version); if (!baseline) throw new ConsoleDriftError("NOT_FOUND", "Approved drift baseline is unavailable.");
    const record = diffConsoleObservation(baseline, observation, deps.ids.create(), deps.clock.now()); await deps.store.putRecord(record);
    const suspicion = suspicionFor(record, deps.ids.create()); if (suspicion) await deps.store.putSuspicion(suspicion);
    return { observation, record, suspicion };
  },
  async review(suspicionId: string, input: unknown) {
    const review = parseConsoleDriftReview(input); const current = await deps.store.suspicion(suspicionId);
    if (!current || current.status !== "awaiting-review") throw new ConsoleDriftError("INVALID_REVIEW", "Drift suspicion is not awaiting review.");
    const next: ConsoleDriftSuspicion = { ...current, status: review.decision === "accepted" ? "accepted" : "rejected", classification: review.classification, guidanceAction: review.guidanceAction, reviewerId: review.reviewerId, reviewerNotes: review.notes, reviewedAt: deps.clock.now() };
    await deps.store.putSuspicion(next); return next;
  },
  async createRelease(suspicionId: string, previousPresentationVersion: string, nextPresentationVersion: string): Promise<ConsoleMappingRelease> {
    const suspicion = await deps.store.suspicion(suspicionId); if (!suspicion || suspicion.status !== "accepted") throw new ConsoleDriftError("RELEASE_BLOCKED", "Only accepted drift can create a mapping candidate.");
    const release: ConsoleMappingRelease = { schemaVersion: 1, id: deps.ids.create(), suspicionId, journeyId: suspicion.journeyId, previousPresentationVersion, nextPresentationVersion, status: "candidate", approvals: { content: "pending", regression: "pending" }, releasedBy: null, releasedAt: null };
    await deps.store.putRelease(release); return release;
  },
  async release(releaseId: string, input: unknown) {
    const approved = parseConsoleMappingReleaseInput(input); const current = await deps.store.release(releaseId);
    if (!current || current.status !== "candidate" || approved.nextPresentationVersion !== current.nextPresentationVersion) throw new ConsoleDriftError("RELEASE_BLOCKED", "Mapping candidate is unavailable.");
    const released: ConsoleMappingRelease = { ...current, status: "released", approvals: approved.approvals, releasedBy: approved.releasedBy, releasedAt: deps.clock.now() };
    await deps.store.putRelease(released); const suspicion = await deps.store.suspicion(current.suspicionId); if (suspicion) await deps.store.putSuspicion({ ...suspicion, status: "released" }); return released;
  },
  cleanup: () => deps.store.removeExpired(deps.clock.now()),
  async sweepOrphanedIdentityHandles() {
    const handles = await deps.identity.listActiveHandles();
    for (const handle of handles) await deps.identity.revoke(handle);
    return handles.length;
  },
});