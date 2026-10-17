import type { ConsoleDriftAuditEvent, ConsoleDriftBaseline, ConsoleDriftJourney, ConsoleDriftObservation, ConsoleDriftRecord, ConsoleDriftSuspicion, ConsoleMappingRelease } from "@grillme/domain";

export interface ConsoleDriftJourneyRepository { find(id: string): Promise<unknown | null> }
export interface ConsoleDriftIdentityProvider {
  authorize(input: { journeyId: string; journeyVersion: string; region: string; maxDurationSeconds: number }): Promise<{ handle: string; issuedAt: string; expiresAt: string }>;
  revoke(handle: string): Promise<void>;
  listActiveHandles(): Promise<string[]>;
}
export interface ConsoleDriftCrawlerProvider {
  crawl(input: { journey: ConsoleDriftJourney; region: string; identityHandle: string }, signal: AbortSignal): Promise<unknown>;
  cleanup(input: { journey: ConsoleDriftJourney; region: string; identityHandle: string }): Promise<void>;
}
export interface ConsoleDriftStore {
  baseline(journeyId: string, journeyVersion: string): Promise<ConsoleDriftBaseline | null>;
  putObservation(value: ConsoleDriftObservation): Promise<void>;
  putRecord(value: ConsoleDriftRecord): Promise<void>;
  putSuspicion(value: ConsoleDriftSuspicion): Promise<void>;
  suspicion(id: string): Promise<ConsoleDriftSuspicion | null>;
  putRelease(value: ConsoleMappingRelease): Promise<void>;
  release(id: string): Promise<ConsoleMappingRelease | null>;
  guidanceAction(journeyId: string): Promise<ConsoleDriftSuspicion["guidanceAction"]>;
  removeExpired(now: string): Promise<number>;
}
export interface ConsoleDriftAuditStore { record(event: ConsoleDriftAuditEvent): Promise<void> }
export type ConsoleDriftDependencies = {
  journeys: ConsoleDriftJourneyRepository;
  identity: ConsoleDriftIdentityProvider;
  crawler: ConsoleDriftCrawlerProvider;
  store: ConsoleDriftStore;
  audit: ConsoleDriftAuditStore;
  ids: { create(): string };
  clock: { now(): string };
};
export type ConsoleDriftRunResult = { observation: ConsoleDriftObservation; record: ConsoleDriftRecord; suspicion: ConsoleDriftSuspicion | null };
