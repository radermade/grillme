import { assign, fromPromise, setup } from "xstate";
import { parseConsoleOperationResult, parseConsoleProgress, parseConsoleValidation, parseSemanticConsole } from "@grillme/content";
import type { AppError, ConsoleEvidenceEvent, ConsoleProgress, ConsoleValidation, ConsoleValue, SemanticConsoleDefinition, SemanticConsoleField, SemanticConsoleState, ScenarioMode } from "@grillme/domain";
import type { ConsolePort, PlatformPorts } from "@grillme/platform";

const clone = <T>(value: T): T => structuredClone(value);
const progressKey = (definition: SemanticConsoleDefinition, mode: ScenarioMode) => `console-progress:${definition.id}:${definition.version}:${mode}`;
type Context = { definition: SemanticConsoleDefinition; mode: ScenarioMode | null; progress: ConsoleProgress | null; draft: Record<string, ConsoleValue>; validation: ConsoleValidation | null; error: AppError | null };
type Event = { type: "SELECT_MODE"; mode: ScenarioMode } | { type: "START" } | { type: "SET_FIELD"; fieldId: string; value: ConsoleValue } | { type: "OPERATE" } | { type: "SHOW_HINT" } | { type: "VALIDATE" } | { type: "REVISE" } | { type: "RESET" } | { type: "CONTINUE" } | { type: "RETRY" } | { type: "CONTINUE_OFFLINE" };
type Loaded = { progress: ConsoleProgress };
type Operated = { state: SemanticConsoleState };
type Validated = { validation: ConsoleValidation; progress: ConsoleProgress };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;

export function createConsoleSessionMachine(source: unknown, provider: ConsolePort, ports: PlatformPorts) {
  const definition = parseSemanticConsole(source);
  const checkpoint = (context: Context) => context.definition.checkpoints[context.progress?.checkpointIndex ?? -1];
  const operation = (context: Context) => context.definition.operations.find(({ id }) => id === checkpoint(context)?.operationId);
  const form = (context: Context) => context.definition.forms.find(({ id }) => id === operation(context)?.formId);
  const initialDraft = (fields: SemanticConsoleField[]) => Object.fromEntries(fields.map((field) => [field.id, field.type === "select" ? field.options?.[0]?.value ?? "" : ""]));
  const complete = (context: Context) => (form(context)?.fields ?? []).every((field) => !field.required || String(context.draft[field.id] ?? "").length > 0);
  const load = async (context: Context): Promise<Loaded> => {
    if (!context.mode) throw new Error("Mode unavailable.");
    const stored = parseConsoleProgress(await ports.storage.get(progressKey(definition, context.mode)));
    const valid = stored?.scenarioId === definition.id && stored.scenarioVersion === definition.version && stored.mode === context.mode && stored.presentationVersion === definition.mapping.presentationVersion && stored.semanticVersion === definition.mapping.semanticVersion && stored.awsVersion === definition.mapping.awsVersion && stored.checkpointIndex < definition.checkpoints.length ? stored : null;
    const state = clone(definition.initialState);
    return { progress: valid ?? { schemaVersion: 1, scenarioId: definition.id, scenarioVersion: definition.version, simulatorVersion: definition.simulatorVersion, semanticVersion: definition.mapping.semanticVersion, awsVersion: definition.mapping.awsVersion, presentationVersion: definition.mapping.presentationVersion, mappingVerifiedAt: definition.mapping.lastVerifiedAt, sessionId: ports.ids.create(), mode: context.mode, checkpointIndex: 0, state, checkpointStart: clone(state), hintLevel: 0, resets: 0, attempts: 0, completedCheckpointIds: [], updatedAt: ports.clock.now() } };
  };
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<Loaded, { context: Context }>(({ input }) => load(input.context)),
      operate: fromPromise<Operated, { context: Context }>(async ({ input }) => {
        const item = operation(input.context); const progress = input.context.progress;
        if (!item || !progress || !complete(input.context)) throw new Error("Operation input is incomplete.");
        const result = parseConsoleOperationResult(await provider.operate({ scenarioId: definition.id, scenarioVersion: definition.version, operationId: item.id, values: input.context.draft, state: progress.state }));
        return { state: result.state };
      }),
      validate: fromPromise<Validated, { context: Context }>(async ({ input }) => {
        const item = checkpoint(input.context); const progress = input.context.progress;
        if (!item || !progress) throw new Error("Checkpoint unavailable.");
        const validation = parseConsoleValidation(await provider.validate(definition.id, definition.version, item.id, progress.state));
        const next = { ...progress, attempts: progress.attempts + 1, completedCheckpointIds: validation.status === "passed" ? [...new Set([...progress.completedCheckpointIds, item.id])] : progress.completedCheckpointIds, updatedAt: ports.clock.now() };
        return { validation, progress: next };
      }),
      persistValidation: fromPromise<void, { context: Context }>(async ({ input }) => {
        const { progress, validation } = input.context; const item = checkpoint(input.context);
        if (!progress || !validation || !item) throw new Error("Validation evidence unavailable.");
        const id = ports.ids.create();
        const evidence: ConsoleEvidenceEvent = { schemaVersion: 1, id, idempotencyKey: id, type: "console.validated", courseId: definition.courseId, courseVersion: definition.courseVersion, scenarioId: definition.id, scenarioVersion: definition.version, simulatorVersion: definition.simulatorVersion, semanticVersion: definition.mapping.semanticVersion, awsVersion: definition.mapping.awsVersion, presentationVersion: definition.mapping.presentationVersion, mappingVerifiedAt: definition.mapping.lastVerifiedAt, sessionId: progress.sessionId, mode: progress.mode, checkpointId: item.id, status: validation.status, passedCheckIds: validation.passedCheckIds, failedCheckIds: validation.failedCheckIds, hintsUsed: progress.hintLevel, resets: progress.resets, attemptNumber: progress.attempts, occurredAt: ports.clock.now() };
        await ports.storage.set(progressKey(definition, progress.mode), progress);
        await ports.storage.append(`console-events:${definition.id}:${definition.version}`, evidence);
      }),
    },
    guards: {
      validMode: ({ event }) => event.type === "SELECT_MODE" && ["walkthrough", "practice", "challenge"].includes(event.mode),
      walkthrough: ({ context }) => context.mode === "walkthrough",
      validField: ({ context, event }) => event.type === "SET_FIELD" && !!form(context)?.fields.some((field) => field.id === event.fieldId && (field.type !== "select" || !!field.options?.some(({ value }) => value === event.value)) && (typeof event.value !== "string" || event.value.length <= (field.maxLength ?? 500))),
      complete: ({ context }) => complete(context),
      canHint: ({ context }) => context.mode === "practice" && (context.progress?.hintLevel ?? 0) < (checkpoint(context)?.hints.length ?? 0),
      passed: ({ context }) => context.validation?.status === "passed",
      inconclusive: ({ context }) => context.validation?.status === "inconclusive",
      more: ({ context }) => !!context.progress && context.progress.checkpointIndex + 1 < definition.checkpoints.length,
    },
    actions: {
      selectMode: assign(({ event }) => event.type === "SELECT_MODE" ? { mode: event.mode, error: null } : {}),
      loaded: assign(({ event }) => { const progress = output<Loaded>(event).progress; const fields = definition.forms.find(({ id }) => id === definition.operations.find(({ id }) => id === definition.checkpoints[progress.checkpointIndex]?.operationId)?.formId)?.fields ?? []; return { progress, draft: initialDraft(fields), error: null }; }),
      failed: assign({ error: () => ({ code: "UNKNOWN" as const, message: "The semantic console could not complete that request safely." }) }),
      setField: assign(({ context, event }) => event.type === "SET_FIELD" ? { draft: { ...context.draft, [event.fieldId]: event.value } } : {}),
      operated: assign(({ context, event }) => context.progress ? { progress: { ...context.progress, state: output<Operated>(event).state, updatedAt: ports.clock.now() }, error: null } : {}),
      hinted: assign(({ context }) => context.progress ? { progress: { ...context.progress, hintLevel: context.progress.hintLevel + 1, updatedAt: ports.clock.now() } } : {}),
      validated: assign(({ event }) => ({ validation: output<Validated>(event).validation, progress: output<Validated>(event).progress, error: null })),
      validationUnavailable: assign(({ context }) => ({
        validation: { status: "inconclusive" as const, passedCheckIds: [], failedCheckIds: [], feedback: ["Validation is temporarily unavailable. Your work was not marked incorrect."] },
        progress: context.progress ? { ...context.progress, attempts: context.progress.attempts + 1, updatedAt: ports.clock.now() } : null,
        error: { code: "UNKNOWN" as const, message: "Validation is temporarily unavailable." },
      })),
      reset: assign(({ context }) => context.progress ? { progress: { ...context.progress, state: clone(context.progress.checkpointStart), hintLevel: 0, resets: context.progress.resets + 1, updatedAt: ports.clock.now() }, validation: null, draft: initialDraft(form(context)?.fields ?? []) } : {}),
      next: assign(({ context }) => { if (!context.progress) return {}; const nextIndex = context.progress.checkpointIndex + 1; const nextCheckpoint = definition.checkpoints[nextIndex]; const nextOperation = definition.operations.find(({ id }) => id === nextCheckpoint?.operationId); const fields = definition.forms.find(({ id }) => id === nextOperation?.formId)?.fields ?? []; return { progress: { ...context.progress, checkpointIndex: nextIndex, checkpointStart: clone(context.progress.state), hintLevel: 0, resets: 0, attempts: 0, updatedAt: ports.clock.now() }, draft: initialDraft(fields), validation: null }; }),
    },
  }).createMachine({
    id: "consoleSession", initial: "modeSelection",
    context: { definition, mode: null, progress: null, draft: {}, validation: null, error: null },
    states: {
      modeSelection: { on: { SELECT_MODE: { target: "loading", guard: "validMode", actions: "selectMode" } } },
      loading: { invoke: { src: "load", input: ({ context }) => ({ context }), onDone: { target: "briefing", actions: "loaded" }, onError: { target: "failed", actions: "failed" } } },
      briefing: { on: { START: [{ target: "demonstrating", guard: "walkthrough" }, { target: "working" }] } },
      demonstrating: { on: { CONTINUE: "working" } },
      working: { on: { SET_FIELD: { guard: "validField", actions: "setField" }, SHOW_HINT: { guard: "canHint", actions: "hinted" }, RESET: { actions: "reset" }, OPERATE: { target: "operating", guard: "complete" } } },
      operating: { invoke: { src: "operate", input: ({ context }) => ({ context }), onDone: { target: "persistingOperation", actions: "operated" }, onError: { target: "operationFailed", actions: "failed" } } },
      persistingOperation: { invoke: { src: fromPromise<void, { context: Context }>(async ({ input }) => { const progress = input.context.progress; if (!progress) throw new Error("Progress unavailable."); await ports.storage.set(progressKey(definition, progress.mode), progress); }), input: ({ context }) => ({ context }), onDone: "readyToValidate", onError: { target: "degraded", actions: "failed" } } },
      degraded: { on: { RETRY: "persistingOperation", CONTINUE_OFFLINE: "readyToValidate" } },
      operationFailed: { on: { RETRY: "working", RESET: { target: "working", actions: "reset" } } },
      readyToValidate: { on: { VALIDATE: "validating", RESET: { target: "working", actions: "reset" } } },
      validating: { invoke: { src: "validate", input: ({ context }) => ({ context }), onDone: { target: "persistingValidation", actions: "validated" }, onError: { target: "persistingValidation", actions: "validationUnavailable" } } },
      persistingValidation: { invoke: { src: "persistValidation", input: ({ context }) => ({ context }), onDone: "validationResult", onError: { target: "validationSaveFailed", actions: "failed" } } },
      validationSaveFailed: { on: { RETRY: "persistingValidation", CONTINUE_OFFLINE: "validationResult" } },
      validationResult: { always: [{ target: "passedCheckpoint", guard: "passed" }, { target: "inconclusive", guard: "inconclusive" }, { target: "failedCheckpoint" }] },
      inconclusive: { on: { RETRY: "validating", REVISE: "working" } },
      failedCheckpoint: { on: { REVISE: "working", RESET: { target: "working", actions: "reset" } } },
      passedCheckpoint: { on: { CONTINUE: [{ target: "briefing", guard: "more", actions: "next" }, { target: "debriefing" }] } },
      debriefing: { on: { CONTINUE: "complete" } }, complete: {}, failed: { on: { RETRY: "loading" } },
    },
  });
}