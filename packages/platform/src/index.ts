import type { EvaluationRequest, SyncEvent } from "@grillme/domain";

export interface EvaluationPort { evaluate(request: EvaluationRequest, signal: AbortSignal): Promise<unknown> }
export interface StoragePort {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  append(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}
export type SecureStorageKey = "refresh-token" | "pkce-verifier" | "oauth-state" | "lab-connection-ticket";
export interface SecureStoragePort {
  get(key: SecureStorageKey): Promise<string | null>;
  set(key: SecureStorageKey, value: string): Promise<void>;
  remove(key: SecureStorageKey): Promise<void>;
}
export interface HttpPort { request(input: { url: string; method: "GET" | "POST"; headers?: Record<string, string>; body?: unknown }): Promise<unknown> }
export interface ConnectivityPort { current(): "online" | "offline"; subscribe(listener: (state: "online" | "offline") => void): () => void }
export interface AuthPort {
  restore(): Promise<unknown | null>;
  callback(): import("@grillme/domain").AuthorizationCallback | null;
  beginAuthorization(): Promise<void>;
  completeAuthorization(input: { code: string; state: string }): Promise<unknown>;
  refresh(): Promise<unknown>;
  signOut(): Promise<void>;
}
export interface SyncPort { push(events: SyncEvent[]): Promise<unknown>; pull(courseId: string, courseVersion: string): Promise<unknown> }
export interface SyncQueuePort {
  enqueue(event: SyncEvent): Promise<void>;
  subscribe(listener: (event: SyncEvent) => void): () => void;
}
export interface LabPort {
  provision(labId: string, labVersion: string): Promise<unknown>;
  status(sessionId: string): Promise<unknown>;
  operate(sessionId: string, operation: import("@grillme/domain").LabOperation): Promise<unknown>;
  validate(sessionId: string, checkpointId: string, attemptId: string): Promise<unknown>;
  stop(sessionId: string): Promise<unknown>;
}
export interface AwsLabPort {
  restore(labSessionId: string): Promise<unknown | null>;
  issue(labSessionId: string, policyId: string, policyVersion: string): Promise<unknown>;
  execute(leaseId: string, operation: import("@grillme/domain").AwsLabOperation): Promise<unknown>;
  revoke(leaseId: string): Promise<void>;
}
export interface ReadinessEvidencePort { load(): Promise<unknown> }
export interface ContentReportPort { submit(report: import("@grillme/domain").ContentReport): Promise<unknown> }
export interface ProductAnalyticsPort {
  submit(events: import("@grillme/domain").ProductAnalyticsEvent[]): Promise<void>;
  delete(): Promise<void>;
}
export interface PrivacyPort { request(value: import("@grillme/domain").PrivacyRequest): Promise<unknown> }
export interface SupportPort { submit(snapshot: import("@grillme/domain").SupportSnapshot): Promise<unknown>; export(): Promise<unknown> }
export interface EntitlementPort { load(): Promise<unknown> }
export interface ReleasePort { assignment(channel: import("@grillme/domain").ReleaseChannel, currentVersion: string): Promise<unknown> }
export interface TelemetryPort { record(event: { name: string; fields: Record<string, string | number | boolean> }): void }
export interface ClockPort { now(): string }
export interface IdPort { create(): string }
export interface LifecyclePort { onSuspend(listener: () => void): () => void }
export interface UpdatePort { check(): Promise<{ available: boolean; version?: string }> }
export interface NavigationPort { openExternal(url: string): Promise<void> }
export type PlatformPorts = { storage: StoragePort; telemetry: TelemetryPort; clock: ClockPort; ids: IdPort; navigation: NavigationPort; syncQueue?: SyncQueuePort };
export { apiOperations } from "./api-routes";
export type { ApiOperationId, ApiPath } from "./api-routes";
