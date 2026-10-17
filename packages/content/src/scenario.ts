import { z } from "zod";
import type { Scenario, ScenarioEvidenceEvent, ScenarioProgress } from "@grillme/domain";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
const version = z.string().min(1).max(50);
const text = z.string().min(1).max(5_000);
const component = z.object({ id, label: z.string().min(1).max(200) }).strict();
const setting = z.object({ id, label: z.string().min(1).max(200), options: z.array(z.string().min(1).max(200)).min(1).max(20) }).strict();
const connection = z.object({ from: id, to: id }).strict();
const workspace = z.object({
  selectedComponents: z.array(id).max(50),
  connections: z.array(connection).max(100),
  settings: z.record(id, z.string().max(200)),
  diagnosis: z.string().max(5_000),
}).strict();
const check = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("component-selected"), componentId: id, message: text }).strict(),
  z.object({ id, type: z.literal("component-absent"), componentId: id, message: text }).strict(),
  z.object({ id, type: z.literal("connection"), from: id, to: id, message: text }).strict(),
  z.object({ id, type: z.literal("setting"), settingId: id, value: z.string().max(200), message: text }).strict(),
  z.object({ id, type: z.literal("diagnosis-concepts"), concepts: z.array(z.array(z.string().min(1).max(100)).min(1).max(10)).min(1).max(20), message: text }).strict(),
]);
const checkpoint = z.object({
  id, title: z.string().min(1).max(200), objective: text, instruction: text,
  rationale: text, hints: z.array(text).max(5), checks: z.array(check).min(1).max(30),
}).strict();
export const scenarioSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  version,
  courseId: id,
  courseVersion: version,
  kind: z.enum(["architecture", "debugging"]),
  title: z.string().min(1).max(200),
  description: text,
  skillIds: z.array(id).min(1).max(20),
  availableComponents: z.array(component).max(50),
  availableSettings: z.array(setting).max(30),
  resources: z.array(z.object({ id, type: z.enum(["code", "log", "config", "test-output"]), title: z.string().min(1).max(200), body: text }).strict()).max(30),
  initialWorkspace: workspace,
  checkpoints: z.array(checkpoint).min(1).max(30),
  debrief: z.object({ rootCause: text, prevention: text, explanation: text }).strict(),
}).strict().superRefine((scenario, context) => {
  const unique = (values: string[]) => new Set(values).size === values.length;
  const components = scenario.availableComponents.map(({ id: componentId }) => componentId);
  const settings = scenario.availableSettings.map(({ id: settingId }) => settingId);
  if (!unique(components) || !unique(settings) || !unique(scenario.checkpoints.map(({ id: checkpointId }) => checkpointId))) {
    context.addIssue({ code: "custom", message: "Scenario IDs must be unique." });
  }
  const knownComponent = (value: string) => components.includes(value);
  if (scenario.initialWorkspace.selectedComponents.some((value) => !knownComponent(value))
    || scenario.initialWorkspace.connections.some(({ from, to }) => !knownComponent(from) || !knownComponent(to))) {
    context.addIssue({ code: "custom", message: "Initial workspace references an unknown component." });
  }
  for (const item of scenario.checkpoints) {
    if (!unique(item.checks.map(({ id: checkId }) => checkId))) context.addIssue({ code: "custom", message: "Check IDs must be unique per checkpoint." });
    for (const candidate of item.checks) {
      if ((candidate.type === "component-selected" || candidate.type === "component-absent") && !knownComponent(candidate.componentId)) {
        context.addIssue({ code: "custom", message: "Check references an unknown component." });
      }
      if (candidate.type === "connection" && (!knownComponent(candidate.from) || !knownComponent(candidate.to))) {
        context.addIssue({ code: "custom", message: "Connection check references an unknown component." });
      }
      if (candidate.type === "setting") {
        const definition = scenario.availableSettings.find(({ id: settingId }) => settingId === candidate.settingId);
        if (!definition?.options.includes(candidate.value)) context.addIssue({ code: "custom", message: "Setting check references an invalid option." });
      }
    }
  }
});
const progressSchema = z.object({
  schemaVersion: z.literal(1),
  scenarioId: id,
  scenarioVersion: version,
  sessionId: id,
  mode: z.enum(["walkthrough", "practice", "challenge"]),
  checkpointIndex: z.number().int().min(0).max(30),
  workspace,
  checkpointStart: workspace,
  hintLevel: z.number().int().min(0).max(5),
  resets: z.number().int().min(0).max(1_000),
  attempts: z.number().int().min(0).max(1_000),
  completedCheckpointIds: z.array(id).max(30),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

export const parseScenario = (input: unknown): Scenario => scenarioSchema.parse(input) as Scenario;
export const parseScenarioProgress = (input: unknown): ScenarioProgress | null => {
  const result = progressSchema.safeParse(input);
  return result.success ? result.data as ScenarioProgress : null;
};

export const scenarioEvidenceSchema = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, type: z.literal("scenario.validated"), courseId: id, courseVersion: version, scenarioId: id, scenarioVersion: version, sessionId: id, mode: z.enum(["walkthrough", "practice", "challenge"]), checkpointId: id, passed: z.boolean(), passedCheckIds: z.array(id).max(30), failedCheckIds: z.array(id).max(30), hintsUsed: z.number().int().min(0).max(5), resets: z.number().int().min(0).max(1_000), attemptNumber: z.number().int().positive(), occurredAt: z.iso.datetime({ offset: true }) }).strict();
export const parseScenarioEvidence = (input: unknown): ScenarioEvidenceEvent | null => scenarioEvidenceSchema.safeParse(input).data as ScenarioEvidenceEvent | undefined ?? null;
