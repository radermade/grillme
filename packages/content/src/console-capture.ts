import { z } from "zod";
import type { ConsoleCaptureCoverage, ConsoleCaptureScene, SemanticConsoleDefinition } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/); const version = z.string().min(1).max(50); const timestamp = z.iso.datetime({ offset: true });
const rect = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).strict().superRefine((value, context) => { if (value.x + value.width > 1 || value.y + value.height > 1) context.addIssue({ code: "custom", message: "Capture anchor exceeds the viewport." }); });
const anchor = z.object({ id, kind: z.enum(["navigate", "field", "operation", "resource"]), targetId: id, fieldId: id.nullable(), operationId: id.nullable(), resourceId: id.nullable(), label: z.string().min(1).max(200), rect }).strict().superRefine((value, context) => {
  if (value.kind === "field" && !value.fieldId) context.addIssue({ code: "custom", message: "Field anchor requires fieldId." });
  if (value.kind === "operation" && !value.operationId) context.addIssue({ code: "custom", message: "Operation anchor requires operationId." });
  if (value.kind === "resource" && !value.resourceId) context.addIssue({ code: "custom", message: "Resource anchor requires resourceId." });
});
export const consoleCaptureSceneSchema = z.object({ schemaVersion: z.literal(1), id, version, scenarioId: id, scenarioVersion: version, checkpointId: id, stepIndex: z.number().int().min(0).max(100), status: z.enum(["draft", "reviewed", "stale", "withdrawn"]), imagePath: z.string().regex(/^\/console-captures\/[a-zA-Z0-9._/-]+\.(png|webp)$/), imageSha256: z.string().regex(/^[a-f0-9]{64}$/), viewport: z.object({ width: z.number().int().min(800).max(7680), height: z.number().int().min(600).max(4320), deviceScaleFactor: z.number().min(1).max(4) }).strict(), sourceOrigin: z.url().refine((value) => new URL(value).protocol === "https:"), region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), semanticVersion: version, awsVersion: version, presentationVersion: version, capturedAt: timestamp, reviewedAt: timestamp.nullable(), reviewedBy: id.nullable(), accessibleDescription: z.string().min(1).max(1_000), anchors: z.array(anchor).min(1).max(100) }).strict();
export const parseConsoleCaptureScenes = (value: unknown): ConsoleCaptureScene[] => z.array(consoleCaptureSceneSchema).max(500).parse(value) as ConsoleCaptureScene[];
export const consoleCaptureCoverage = (definition: SemanticConsoleDefinition, scenes: ConsoleCaptureScene[]): ConsoleCaptureCoverage => {
  for (const checkpoint of definition.checkpoints) {
    const matches = scenes.filter((scene) => scene.scenarioId === definition.id && scene.scenarioVersion === definition.version && scene.checkpointId === checkpoint.id).sort((a, b) => a.stepIndex - b.stepIndex);
    if (!matches.length) return { ready: false, reason: `Reviewed capture missing for ${checkpoint.id}.` };
    if (matches.some((scene, index) => scene.status !== "reviewed" || !scene.reviewedAt || !scene.reviewedBy || scene.stepIndex !== index || scene.semanticVersion !== definition.mapping.semanticVersion || scene.awsVersion !== definition.mapping.awsVersion || scene.presentationVersion !== definition.mapping.presentationVersion)) return { ready: false, reason: `Capture coverage is stale or unapproved for ${checkpoint.id}.` };
    const operation = definition.operations.find(({ id }) => id === checkpoint.operationId); const form = definition.forms.find(({ id }) => id === operation?.formId); const final = matches.at(-1)!;
    if (!operation || !form || !final.anchors.some((anchor) => anchor.kind === "operation" && anchor.operationId === operation.id) || form.fields.some((field) => !final.anchors.some((anchor) => anchor.kind === "field" && anchor.fieldId === field.id))) return { ready: false, reason: `Interactive capture anchors are incomplete for ${checkpoint.id}.` };
  }
  return { ready: true, reason: null };
};