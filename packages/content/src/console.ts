import { z } from "zod";
import { labValidationSchema } from "./validator";
import type { ConsoleOperationResult, ConsoleProgress, ConsoleValidation, SemanticConsoleDefinition, SemanticConsoleState } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const version = z.string().min(1).max(50);
const text = z.string().min(1).max(5_000);
const value = z.union([z.string().max(500), z.number().finite(), z.boolean()]);
const resource = z.object({ id, targetId: id, serviceId: id, type: id, name: z.string().min(1).max(200), status: z.enum(["pending", "active", "warning", "error"]), properties: z.record(id, value), updatedAt: z.iso.datetime({ offset: true }) }).strict();
const state = z.object({
  resources: z.array(resource).max(100),
  relationships: z.array(z.object({ id, from: id, to: id, type: id }).strict()).max(200),
  logs: z.array(z.object({ id, level: z.enum(["info", "warning", "error"]), category: id, message: z.string().min(1).max(500), occurredAt: z.iso.datetime({ offset: true }) }).strict()).max(200),
}).strict();
const field = z.object({ id, label: z.string().min(1).max(200), type: z.enum(["text", "select"]), required: z.boolean(), options: z.array(z.object({ value: z.string().min(1).max(200), label: z.string().min(1).max(200) }).strict()).min(1).max(30).optional(), maxLength: z.number().int().positive().max(500).optional() }).strict();
const service = z.object({ id, targetId: id, name: z.string().min(1).max(200), description: text }).strict();
const view = z.object({ id, targetId: id, serviceId: id, title: z.string().min(1).max(200), type: z.enum(["list", "details", "form", "logs"]) }).strict();
const form = z.object({ id, targetId: id, title: z.string().min(1).max(200), fields: z.array(field).max(20) }).strict();
const operation = z.object({ id, targetId: id, serviceId: id, label: z.string().min(1).max(200), description: text, formId: id }).strict();
const checkpoint = z.object({ id, title: z.string().min(1).max(200), objective: text, operationId: id, intent: text, instruction: text, rationale: text, expectedOutcome: text, hints: z.array(text).max(5) }).strict();
export const semanticConsoleSchema = z.object({
  schemaVersion: z.literal(1), id, version, simulatorVersion: version, courseId: id, courseVersion: version,
  title: z.string().min(1).max(200), description: text, skillIds: z.array(id).min(1).max(20),
  mapping: z.object({ semanticVersion: version, awsVersion: version, presentationVersion: version, lastVerifiedAt: z.iso.date() }).strict(),
  services: z.array(service).min(1).max(30), views: z.array(view).min(1).max(100), forms: z.array(form).min(1).max(50),
  operations: z.array(operation).min(1).max(50), checkpoints: z.array(checkpoint).min(1).max(30), initialState: state,
  debrief: z.object({ rootCause: text, prevention: text, explanation: text }).strict(),
}).strict().superRefine((console, context) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const serviceIds = console.services.map(({ id: valueId }) => valueId);
  const targetIds = [...console.services, ...console.views, ...console.forms, ...console.operations].map(({ targetId }) => targetId);
  const formIds = console.forms.map(({ id: valueId }) => valueId);
  const operationIds = console.operations.map(({ id: valueId }) => valueId);
  if (![serviceIds, targetIds, formIds, operationIds, console.checkpoints.map(({ id: valueId }) => valueId)].every(unique)) context.addIssue({ code: "custom", message: "Semantic console IDs and target IDs must be unique." });
  if (console.views.some(({ serviceId }) => !serviceIds.includes(serviceId)) || console.operations.some(({ serviceId }) => !serviceIds.includes(serviceId))) context.addIssue({ code: "custom", message: "Console item references an unknown service." });
  if (console.operations.some(({ formId }) => !formIds.includes(formId))) context.addIssue({ code: "custom", message: "Operation references an unknown form." });
  if (console.checkpoints.some(({ operationId }) => !operationIds.includes(operationId))) context.addIssue({ code: "custom", message: "Checkpoint references an unknown operation." });
  for (const item of console.forms) for (const candidate of item.fields) {
    if (candidate.type === "select" && !candidate.options?.length) context.addIssue({ code: "custom", message: "Select fields require bounded options." });
  }
  const resourceIds = console.initialState.resources.map(({ id: valueId }) => valueId);
  if (!unique(resourceIds) || console.initialState.resources.some(({ serviceId }) => !serviceIds.includes(serviceId)) || console.initialState.relationships.some(({ from, to }) => !resourceIds.includes(from) || !resourceIds.includes(to))) context.addIssue({ code: "custom", message: "Initial state contains invalid resource references." });
});
const progressSchema = z.object({ schemaVersion: z.literal(1), scenarioId: id, scenarioVersion: version, simulatorVersion: version, semanticVersion: version, awsVersion: version, presentationVersion: version, mappingVerifiedAt: z.iso.date(), sessionId: id, mode: z.enum(["walkthrough", "practice", "challenge"]), checkpointIndex: z.number().int().min(0).max(30), state, checkpointStart: state, hintLevel: z.number().int().min(0).max(5), resets: z.number().int().min(0).max(1_000), attempts: z.number().int().min(0).max(1_000), completedCheckpointIds: z.array(id).max(30), updatedAt: z.iso.datetime({ offset: true }) }).strict();
const validationSchema = labValidationSchema.extend({ passedCheckIds: z.array(id).max(30) }).strict();
const operationResultSchema = z.object({ schemaVersion: z.literal(1), operationId: id, state, changedResourceIds: z.array(id).max(30) }).strict();
export const parseSemanticConsole = (input: unknown): SemanticConsoleDefinition => semanticConsoleSchema.parse(input) as SemanticConsoleDefinition;
export const parseSemanticConsoleState = (input: unknown): SemanticConsoleState => state.parse(input) as SemanticConsoleState;
export const parseConsoleProgress = (input: unknown): ConsoleProgress | null => progressSchema.safeParse(input).data as ConsoleProgress | undefined ?? null;
export const parseConsoleValidation = (input: unknown): ConsoleValidation => validationSchema.parse(input) as ConsoleValidation;
export const parseConsoleOperationResult = (input: unknown): ConsoleOperationResult => operationResultSchema.parse(input) as ConsoleOperationResult;