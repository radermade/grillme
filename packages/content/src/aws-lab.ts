import { z } from "zod";
import type { AwsCredentialLease, AwsLabOperation, AwsLabPolicy, AwsOperationReceipt } from "@grillme/domain";

const id = z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_./-]+$/);
const timestamp = z.iso.datetime({ offset: true });
const money = z.number().finite().min(0).max(10_000);
const tags = z.record(z.string().min(1).max(128), z.string().min(1).max(256));
export const awsLabPolicySchema = z.object({
  schemaVersion: z.literal(1), id, version: id, labId: id, labVersion: id,
  isolationModel: z.enum(["dedicated-account-per-session", "shared-account-tag-isolated"]),
  region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/),
  allowedServices: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(20),
  allowedActions: z.array(z.string().regex(/^[a-zA-Z0-9-]+:[a-zA-Z0-9*]+$/)).min(1).max(100),
  resourcePrefixes: z.array(z.string().min(1).max(500)).min(1).max(50), requiredTags: tags,
  maxDurationMinutes: z.number().int().min(5).max(240), credentialDurationMinutes: z.number().int().min(5).max(60), spendLimitUsd: money,
}).strict().superRefine((policy, context) => {
  if (policy.credentialDurationMinutes > policy.maxDurationMinutes) context.addIssue({ code: "custom", message: "Credential duration cannot exceed lab duration." });
});
export const awsCredentialLeaseSchema = z.object({ schemaVersion: z.literal(1), id, labSessionId: id, status: z.enum(["active", "revoking", "revoked", "expired"]), region: z.string(), issuedAt: timestamp, expiresAt: timestamp, spendLimitUsd: money, spentUsd: money }).strict();
export const awsLabOperationSchema = z.object({ schemaVersion: z.never().optional(), id, idempotencyKey: id, service: z.string().regex(/^[a-z0-9-]+$/), action: z.string().regex(/^[a-zA-Z0-9-]+:[a-zA-Z0-9]+$/), region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), resource: z.string().min(1).max(500), resourceTags: tags, estimatedCostUsd: money }).strict();
export const awsOperationReceiptSchema = z.object({ schemaVersion: z.literal(1), operationId: id, leaseId: id, status: z.enum(["accepted", "rejected"]), costUsd: money, spentUsd: money, occurredAt: timestamp }).strict();
export const parseAwsLabPolicy = (value: unknown): AwsLabPolicy => awsLabPolicySchema.parse(value) as AwsLabPolicy;
export const parseAwsCredentialLease = (value: unknown): AwsCredentialLease | null => awsCredentialLeaseSchema.safeParse(value).data ?? null;
export const parseAwsLabOperation = (value: unknown): AwsLabOperation | null => awsLabOperationSchema.safeParse(value).data ?? null;
export const parseAwsOperationReceipt = (value: unknown): AwsOperationReceipt | null => awsOperationReceiptSchema.safeParse(value).data ?? null;
