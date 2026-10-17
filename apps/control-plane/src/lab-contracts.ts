import type { LabDefinition, LabOperation, LabSession, LabValidation } from "@grillme/domain";
import type { AuthService } from "./contracts";

export type PrivateLabDefinition = LabDefinition & { validators: Record<string, { id: string; operation: LabOperation; expected: boolean; message: string }[]> };
export type LabSessionRecord = { session: LabSession; userId: string; environmentId: string; stopped: boolean; validationAttempts: Record<string, number>; validationResults: Record<string, LabValidation> };
export interface LabDefinitionRepository { find(labId: string, labVersion: string): Promise<PrivateLabDefinition | null> }
export interface LabEntitlementService { authorize(input: { userId: string; courseId: string; courseVersion: string; feature: "sandbox-lab" }): Promise<boolean> }
export interface LabQuotaService { reserve(input: { userId: string; sessionId: string; costUnits: number; maxDurationMinutes: number }): Promise<boolean>; release(sessionId: string): Promise<void> }
export interface LabSessionStore { get(sessionId: string): Promise<LabSessionRecord | null>; put(record: LabSessionRecord): Promise<void>; listActive(): Promise<LabSessionRecord[]> }
export interface SandboxProvider {
  provision(input: { sessionId: string; imageDigest: string; expiresAt: string }): Promise<{ environmentId: string; connectionTicket: string }>;
  status(environmentId: string): Promise<"ready" | "failed" | "missing">;
  operate(environmentId: string, operation: LabOperation): Promise<void>;
  validate(environmentId: string, checks: PrivateLabDefinition["validators"][string]): Promise<LabValidation>;
  destroy(environmentId: string): Promise<void>;
}
export type LabAuditEvent = { sessionId: string; userId: string; labId: string; operation: "provision" | "operate" | "validate" | "stop" | "expire"; outcome: string; occurredAt: string };
export interface LabAuditService { record(event: LabAuditEvent): Promise<void> }
export type LabServiceDependencies = { auth: AuthService; entitlements: LabEntitlementService; quota: LabQuotaService; definitions: LabDefinitionRepository; sessions: LabSessionStore; provider: SandboxProvider; audit: LabAuditService; ids: { create(): string }; clock: { now(): string }; credentialRevoker?: { revokeForSession(sessionId: string): Promise<void> } };
export type LabProvisionResponse = { session: LabSession; connectionTicket: string };
