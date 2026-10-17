import { z } from "zod";
import type { LabDefinition, LabEvidenceEvent, LabProgress, LabSession } from "@grillme/domain";
import { labValidationSchema, parseLabValidation, validationProvenanceSchema } from "./validator";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const version = z.string().min(1).max(50);
const timestamp = z.iso.datetime({ offset: true });
const sessionStatus = z.enum(["provisioning", "ready", "stopping", "expired", "cleaned", "failed"]);
export const labSchema = z.object({
  schemaVersion: z.literal(1), id, version, courseId: id, courseVersion: version,
  title: z.string().min(1).max(200), description: z.string().min(1).max(2_000),
  imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/), maxDurationMinutes: z.number().int().min(5).max(240),
  maxAttempts: z.number().int().min(1).max(20), estimatedCostUnits: z.number().int().min(0).max(10_000),
  starterFiles: z.array(z.object({ path: z.string().min(1).max(300).regex(/^\/[a-zA-Z0-9._/-]+$/), content: z.string().max(20_000) }).strict()).max(30),
  checkpoints: z.array(z.object({ id, title: z.string().min(1).max(200), objective: z.string().min(1).max(2_000), instructions: z.string().min(1).max(5_000), hints: z.array(z.string().min(1).max(1_000)).max(5) }).strict()).min(1).max(20),
  debrief: z.object({ explanation: z.string().min(1).max(5_000), prevention: z.string().min(1).max(5_000) }).strict(),
}).strict().superRefine((lab, context) => {
  if (new Set(lab.checkpoints.map(({ id: checkpointId }) => checkpointId)).size !== lab.checkpoints.length) context.addIssue({ code: "custom", message: "Checkpoint IDs must be unique." });
  if (new Set(lab.starterFiles.map(({ path }) => path)).size !== lab.starterFiles.length) context.addIssue({ code: "custom", message: "Starter file paths must be unique." });
});
export const labSessionSchema = z.object({ schemaVersion: z.literal(1), id, labId: id, labVersion: version, status: sessionStatus, provenance: validationProvenanceSchema.extend({ compatibilityId: id, compatibilityVersion: version }).strict(), terminalPath: z.string().regex(/^\/labs\/[a-z0-9-]+\/terminal$/), editorPath: z.string().regex(/^\/labs\/[a-z0-9-]+\/editor$/), createdAt: timestamp, expiresAt: timestamp }).strict();
const legacyValidationSchema = z.object({ passed: z.boolean(), failedCheckIds: z.array(id).max(50), feedback: z.array(z.string().min(1).max(500)).max(50) }).strict();
export const labProgressSchema = z.object({ schemaVersion: z.literal(1), labId: id, labVersion: version, sessionId: id, checkpointIndex: z.number().int().min(0).max(100), hintLevel: z.number().int().min(0).max(5), attempts: z.number().int().min(0).max(1_000), validationRequests: z.number().int().min(0).max(10_000).default(0), completedCheckpointIds: z.array(id).max(100), lastValidation: z.union([labValidationSchema, legacyValidationSchema]).nullable(), expiresAt: timestamp, updatedAt: timestamp }).strict();
export const parseLab = (value: unknown): LabDefinition => labSchema.parse(value) as LabDefinition;
export const parseLabSession = (value: unknown): LabSession | null => labSessionSchema.safeParse(value).data as LabSession | undefined ?? null;
export const parseLabProgress = (value: unknown): LabProgress | null => {
  const parsed = labProgressSchema.safeParse(value); if (!parsed.success) return null;
  const progress = parsed.data;
  const lastValidation = progress.lastValidation && "passed" in progress.lastValidation
    ? parseLabValidation(progress.lastValidation, { validatorId: "legacy-validator", validatorVersion: "0", bundleId: "legacy-bundle", bundleVersion: "0", mappingId: "legacy-mapping", mappingVersion: "0", templateId: "legacy-template", templateVersion: "0", region: "us-east-1", provider: "controlled-sandbox", providerAdapterVersion: "0", presentationMappingVersion: "0" }, progress.updatedAt)
    : progress.lastValidation;
  return { ...progress, lastValidation } as LabProgress;
};
const labEvidenceBase = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, type: z.enum(["lab.checkpoint-validated", "lab.session-ended"]), courseId: id, courseVersion: version, labId: id, labVersion: version, sessionId: id, checkpointId: id.nullable(), passed: z.boolean(), attemptNumber: z.number().int().nonnegative(), hintsUsed: z.number().int().nonnegative(), occurredAt: timestamp }).strict();
export const labEvidenceSchema = labEvidenceBase.extend({ validatorId: id, validatorVersion: version }).strict();
export const parseLabEvidence = (value: unknown): LabEvidenceEvent | null => {
  const current = labEvidenceSchema.safeParse(value); if (current.success) return current.data as LabEvidenceEvent;
  const legacy = labEvidenceBase.safeParse(value); return legacy.success ? { ...legacy.data, validatorId: "legacy-validator", validatorVersion: "0" } as LabEvidenceEvent : null;
};
