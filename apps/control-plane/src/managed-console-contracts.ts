import type { AwsLabPolicy, LabSession, ManagedConsoleAuditEvent, ManagedConsoleSession, ManagedConsoleValidation, ValidationProvenance } from "@grillme/domain";
import type { AuthService } from "./contracts";
import type { LabSessionStore } from "./lab-contracts";
import type { AwsPolicyRepository } from "./aws-lab-contracts";
import type { CompatibilityRegistry, ValidatorBundleRepository, ValidatorHealthStore } from "./validator-compatibility";

export type ManagedConsoleRecord = { session: ManagedConsoleSession; userId: string; providerHandle: string; launchCount: number; launchConsumedAt: string | null; accessRevoked: boolean; resourcesCleaned: boolean; revision: number };
export interface ManagedConsoleStore {
  findByLabSession(labSessionId: string): Promise<ManagedConsoleRecord | null>;
  get(sessionId: string): Promise<ManagedConsoleRecord | null>;
  put(record: ManagedConsoleRecord): Promise<void>;
  putIfAbsent(record: ManagedConsoleRecord): Promise<{ created: true } | { created: false; existing: ManagedConsoleRecord }>;
  consumeLaunch(sessionId: string): Promise<ManagedConsoleRecord | null>;
  finishLaunch(sessionId: string, issuedAt: string): Promise<ManagedConsoleRecord | null>;
  listActive(): Promise<ManagedConsoleRecord[]>;
}
export interface ManagedConsoleProvider {
  allocate(input: { sessionId: string; labSession: LabSession; policy: AwsLabPolicy; provenance: ValidationProvenance; expiresAt: string }): Promise<{ providerHandle: string }>;
  createLaunch(providerHandle: string, expiresAt: string): Promise<{ launchUrl: string; launchExpiresAt: string }>;
  status(providerHandle: string): Promise<"active" | "missing" | "failed">;
  validate(providerHandle: string, checkpointId: string, provenance: ValidationProvenance, observedAt: string): Promise<ManagedConsoleValidation>;
  budget(providerHandle: string): Promise<{ spentUsd: number }>;
  revokeAccess(providerHandle: string): Promise<void>;
  cleanupResources(providerHandle: string): Promise<void>;
  listActiveHandles(): Promise<string[]>;
}
export interface ManagedConsoleEntitlementService { authorize(input: { userId: string; labId: string; labVersion: string; feature: "managed-console" }): Promise<boolean> }
export interface ManagedConsoleAuditStore { record(value: ManagedConsoleAuditEvent): Promise<void> }
export type ManagedConsoleDependencies = { auth: AuthService; entitlements: ManagedConsoleEntitlementService; labs: LabSessionStore; policies: AwsPolicyRepository; compatibility: CompatibilityRegistry; bundles: ValidatorBundleRepository; health: ValidatorHealthStore; store: ManagedConsoleStore; provider: ManagedConsoleProvider; audit: ManagedConsoleAuditStore; ids: { create(): string }; clock: { now(): string } };
