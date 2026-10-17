import { z } from "zod";
import type { LabDefinition, LabEvidenceEvent, LabProgress, LabSession, LabValidation } from "@grillme/domain";

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
export const labSessionSchema = z.object({ schemaVersion: z.literal(1), id, labId: id, labVersion: version, status: sessionStatus, terminalPath: z.string().regex(/^\/labs\/[a-z0-9-]+\/terminal$/), editorPath: z.string().regex(/^\/labs\/[a-z0-9-]+\/editor$/), createdAt: timestamp, expiresAt: timestamp }).strict();
const validationSchema = z.object({ passed: z.boolean(), failedCheckIds: z.array(id).max(50), feedback: z.array(z.string().min(1).max(500)).max(50) }).strict();
export const labProgressSchema = z.object({ schemaVersion: z.literal(1), labId: id, labVersion: version, sessionId: id, checkpointIndex: z.number().int().min(0).max(100), hintLevel: z.number().int().min(0).max(5), attempts: z.number().int().min(0).max(1_000), completedCheckpointIds: z.array(id).max(100), lastValidation: validationSchema.nullable(), expiresAt: timestamp, updatedAt: timestamp }).strict();
export const parseLab = (value: unknown): LabDefinition => labSchema.parse(value) as LabDefinition;
export const parseLabSession = (value: unknown): LabSession | null => labSessionSchema.safeParse(value).data ?? null;
export const parseLabValidation = (value: unknown): LabValidation | null => validationSchema.safeParse(value).data ?? null;
export const parseLabProgress = (value: unknown): LabProgress | null => labProgressSchema.safeParse(value).data ?? null;
export const labEvidenceSchema = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, type: z.enum(["lab.checkpoint-validated", "lab.session-ended"]), courseId: id, courseVersion: version, labId: id, labVersion: version, sessionId: id, checkpointId: id.nullable(), passed: z.boolean(), attemptNumber: z.number().int().nonnegative(), hintsUsed: z.number().int().nonnegative(), occurredAt: timestamp }).strict();
export const parseLabEvidence = (value: unknown): LabEvidenceEvent | null => labEvidenceSchema.safeParse(value).data as LabEvidenceEvent | undefined ?? null;
