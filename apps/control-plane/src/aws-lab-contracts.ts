import type { AwsCredentialAuditEvent, AwsCredentialLease, AwsLabOperation, AwsLabPolicy } from "@grillme/domain";
import type { AuthService } from "./contracts";
import type { LabSessionStore } from "./lab-contracts";

export type PrivateAwsLabPolicy = AwsLabPolicy & { providerRoleConfigId: string };
export type AwsLeaseRecord = {
  lease: AwsCredentialLease;
  userId: string;
  policy: PrivateAwsLabPolicy;
  providerHandle: string;
  revision: number;
  receipts: Record<string, import("@grillme/domain").AwsOperationReceipt>;
  reservations: Record<string, number>;
};
export type AwsOperationReservation =
  | { status: "reserved"; record: AwsLeaseRecord }
  | { status: "duplicate"; receipt: import("@grillme/domain").AwsOperationReceipt }
  | { status: "conflict" }
  | { status: "spend-exceeded" }
  | { status: "inactive" };
export interface AwsPolicyRepository { find(policyId: string, policyVersion: string): Promise<PrivateAwsLabPolicy | null> }
export interface AwsLabEntitlementService { authorize(input: { userId: string; labId: string; labVersion: string; feature: "restricted-aws-lab" }): Promise<boolean> }
export interface AwsLeaseStore {
  findBySession(labSessionId: string): Promise<AwsLeaseRecord | null>;
  get(leaseId: string): Promise<AwsLeaseRecord | null>;
  put(record: AwsLeaseRecord): Promise<void>;
  putIfAbsentSession(record: AwsLeaseRecord): Promise<{ created: true } | { created: false; existing: AwsLeaseRecord }>;
  transitionToRevoking(leaseId: string): Promise<AwsLeaseRecord | null>;
  reserveOperation(leaseId: string, operation: AwsLabOperation): Promise<AwsOperationReservation>;
  completeOperation(leaseId: string, operation: AwsLabOperation, costUsd: number, occurredAt: string): Promise<import("@grillme/domain").AwsOperationReceipt>;
  cancelOperation(leaseId: string, idempotencyKey: string): Promise<void>;
  listActive(): Promise<AwsLeaseRecord[]>;
}
export interface RestrictedAwsProvider {
  issue(input: { leaseId: string; providerRoleConfigId: string; region: string; expiresAt: string; requiredTags: Record<string, string> }): Promise<{ providerHandle: string }>;
  execute(providerHandle: string, operation: AwsLabOperation): Promise<{ costUsd: number }>;
  revoke(providerHandle: string): Promise<void>;
  listActiveHandles(): Promise<string[]>;
}
export interface AwsCredentialAuditService { record(event: AwsCredentialAuditEvent): Promise<void> }
export type AwsLabServiceDependencies = {
  auth: AuthService;
  entitlements: AwsLabEntitlementService;
  labSessions: LabSessionStore;
  policies: AwsPolicyRepository;
  leases: AwsLeaseStore;
  provider: RestrictedAwsProvider;
  audit: AwsCredentialAuditService;
  ids: { create(): string };
  clock: { now(): string };
};
