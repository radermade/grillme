import { z } from "zod";
import type { CompatibilityEntry, LabValidation, ValidatorBundle, ValidatorHealth } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const version = z.string().min(1).max(50);
const timestamp = z.iso.datetime({ offset: true });
const status = z.enum(["passed", "failed", "inconclusive"]);
const provider = z.enum(["simulator", "controlled-sandbox", "managed-aws"]);
export const validationProvenanceSchema = z.object({ validatorId: id, validatorVersion: version, bundleId: id, bundleVersion: version, mappingId: id, mappingVersion: version, presentationMappingVersion: version, templateId: id, templateVersion: version, region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), provider, providerAdapterVersion: version }).strict();
export const labValidationSchema = z.object({ schemaVersion: z.literal(1), status, provenance: validationProvenanceSchema, failedCheckIds: z.array(id).max(100), feedback: z.array(z.string().min(1).max(500)).max(100), evidence: z.array(z.object({ checkId: id, observed: z.string().max(500), expected: z.string().max(500).nullable() }).strict()).max(100), inconclusiveReason: z.enum(["service-unavailable", "permission-denied", "region-unsupported", "schema-drift", "stale-health", "disabled-validator", "unavailable-evidence"]).nullable(), observedAt: timestamp }).strict().superRefine((value, context) => {
  if (value.status === "inconclusive" && !value.inconclusiveReason) context.addIssue({ code: "custom", message: "Inconclusive validation requires a reason." });
  if (value.status !== "inconclusive" && value.inconclusiveReason) context.addIssue({ code: "custom", message: "Conclusive validation cannot have an inconclusive reason." });
  if (value.status === "passed" && value.failedCheckIds.length) context.addIssue({ code: "custom", message: "Passed validation cannot contain failed checks." });
});
export const compatibilityEntrySchema = z.object({ schemaVersion: z.literal(1), id, version, labId: id, labVersion: version, scenarioId: id.nullable(), scenarioVersion: version.nullable(), semanticMappingVersion: version, presentationMappingVersion: version, templateId: id, templateVersion: version, sdkApiVersion: version, validatorBundleId: id, validatorBundleVersion: version, region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), provider, providerAdapterVersion: version, status: z.enum(["active", "degraded-reviewed", "withdrawn"]), knownLimitations: z.array(z.string().min(1).max(500)).max(30) }).strict();
const operation = z.enum(["set-retry-limit", "enable-strict-schema", "enable-output-blocking", "sanitize-telemetry", "reset-workspace"]);
const check = z.object({ id, operation, expected: z.boolean(), message: z.string().min(1).max(500) }).strict();
const fixture = z.object({ id, capability: z.enum(["bedrock", "iam", "sandbox-lifecycle", "cleanup"]), kind: z.enum(["known-good", "known-bad", "unsupported"]), checkpointId: id, observedState: z.record(id, z.boolean()), expectedState: z.record(id, z.boolean()), expectedStatus: status, expectedFailedCheckIds: z.array(id).max(100) }).strict();
export const validatorBundleSchema = z.object({ schemaVersion: z.literal(1), id, version, validatorId: id, validatorVersion: version, labId: id, labVersion: version, status: z.enum(["active", "withdrawn"]), checks: z.record(id, z.array(check).min(1).max(100)), fixtures: z.array(fixture).min(3).max(100) }).strict().superRefine((bundle, context) => {
  const requiredKinds = ["known-good", "known-bad", "unsupported"] as const;
  const requiredCapabilities = ["bedrock", "iam", "sandbox-lifecycle", "cleanup"] as const;
  for (const capability of requiredCapabilities) for (const kind of requiredKinds) {
    if (!bundle.fixtures.some((fixture) => fixture.capability === capability && fixture.kind === kind)) context.addIssue({ code: "custom", message: `Validator bundle requires ${kind} ${capability} fixture.` });
  }
});
const probe = z.object({ id, type: z.enum(["service", "model", "region", "inspector-permission", "template", "cost-policy"]), status, observedAt: timestamp, expiresAt: timestamp, reason: z.string().max(500).nullable() }).strict();
export const validatorHealthSchema = z.object({ schemaVersion: z.literal(1), compatibilityId: id, compatibilityVersion: version, status: z.enum(["healthy", "degraded", "drift-suspected", "disabled"]), fixtureResults: z.array(z.object({ fixtureId: id, expectedStatus: status, actualStatus: status, matched: z.boolean() }).strict()).max(100), probes: z.array(probe).max(30), checkedAt: timestamp, expiresAt: timestamp, reviewedDegradedPolicyId: id.nullable() }).strict();
const legacyValidationSchema = z.object({ passed: z.boolean(), failedCheckIds: z.array(id).max(100), feedback: z.array(z.string().min(1).max(500)).max(100) }).strict();
export const parseLabValidation = (value: unknown, legacyProvenance?: LabValidation["provenance"], observedAt?: string): LabValidation | null => {
  const current = labValidationSchema.safeParse(value); if (current.success) return current.data as LabValidation;
  const legacy = legacyValidationSchema.safeParse(value); if (!legacy.success || !legacyProvenance || !observedAt) return null;
  return { schemaVersion: 1, status: legacy.data.passed ? "passed" : "failed", provenance: legacyProvenance, failedCheckIds: legacy.data.failedCheckIds, feedback: legacy.data.feedback, evidence: [], inconclusiveReason: null, observedAt };
};
export const parseCompatibilityEntry = (value: unknown): CompatibilityEntry => compatibilityEntrySchema.parse(value) as CompatibilityEntry;
export const parseValidatorBundle = (value: unknown): ValidatorBundle => validatorBundleSchema.parse(value) as ValidatorBundle;
export const parseValidatorHealth = (value: unknown): ValidatorHealth => validatorHealthSchema.parse(value) as ValidatorHealth;