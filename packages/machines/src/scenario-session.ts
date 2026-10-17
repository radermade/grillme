import { assign, fromPromise, setup } from "xstate";
import { parseScenario, parseScenarioProgress } from "@grillme/content";
import type {
  AppError,
  Scenario,
  ScenarioEvidenceEvent,
  ScenarioMode,
  ScenarioProgress,
  ScenarioValidation,
  ScenarioWorkspace,
} from "@grillme/domain";
import { validateScenarioWorkspace } from "@grillme/evaluation";
import type { PlatformPorts } from "@grillme/platform";
import { scenarioSyncEvent } from "./sync-event";

const progressKey = (scenario: Scenario, mode: ScenarioMode) => `scenario-progress:${scenario.id}:${scenario.version}:${mode}`;
const evidenceKey = (scenario: Scenario) => `scenario-events:${scenario.id}:${scenario.version}`;
const cloneWorkspace = (workspace: ScenarioWorkspace): ScenarioWorkspace => structuredClone(workspace);
type Context = {
  scenarios: Scenario[];
  scenario: Scenario | null;
  mode: ScenarioMode | null;
  progress: ScenarioProgress | null;
  validation: ScenarioValidation | null;
  pendingProgress: ScenarioProgress | null;
  pendingEvent: ScenarioEvidenceEvent | null;
  error: AppError | null;
};
type Event =
  | { type: "SELECT_SCENARIO"; scenarioId: string }
  | { type: "SELECT_MODE"; mode: ScenarioMode }
  | { type: "START" }
  | { type: "TOGGLE_COMPONENT"; componentId: string }
  | { type: "CONNECT"; from: string; to: string }
  | { type: "SET_SETTING"; settingId: string; value: string }
  | { type: "SET_DIAGNOSIS"; value: string }
  | { type: "SHOW_HINT" }
  | { type: "VALIDATE" }
  | { type: "REVISE" }
  | { type: "RESET_CHECKPOINT" }
  | { type: "CONTINUE" }
  | { type: "RETRY" }
  | { type: "CONTINUE_OFFLINE" };
type Loaded = { progress: ScenarioProgress };
type Saved = { progress: ScenarioProgress; validation: ScenarioValidation };
type DoneEvent<T> = { output: T };
const outputOf = <T>(event: unknown): T => (event as DoneEvent<T>).output;
export const createScenarioSessionMachine = (sources: unknown[], ports: PlatformPorts) => {
  const scenarios = sources.map(parseScenario);
  const load = async (input: { context: Context }): Promise<Loaded> => {
    const { scenario, mode } = input.context;
    if (!scenario || !mode) throw new Error("Scenario selection unavailable.");
    const stored = parseScenarioProgress(await ports.storage.get(progressKey(scenario, mode)));
    const valid = stored?.scenarioId === scenario.id
      && stored.scenarioVersion === scenario.version
      && stored.mode === mode
      && stored.checkpointIndex < scenario.checkpoints.length
      ? stored
      : null;
    const workspace = cloneWorkspace(scenario.initialWorkspace);
    return { progress: valid ?? {
      schemaVersion: 1,
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      sessionId: ports.ids.create(),
      mode,
      checkpointIndex: 0,
      workspace,
      checkpointStart: cloneWorkspace(workspace),
      hintLevel: 0,
      resets: 0,
      attempts: 0,
      completedCheckpointIds: [],
      updatedAt: ports.clock.now(),
    } };
  };

  const persist = async (input: { context: Context }): Promise<Saved> => {
    const { scenario, mode, pendingProgress, pendingEvent, validation } = input.context;
    if (!scenario || !mode || !pendingProgress || !pendingEvent || !validation) throw new Error("Validation evidence unavailable.");
    await ports.storage.set(progressKey(scenario, mode), pendingProgress);
    await ports.storage.append(evidenceKey(scenario), pendingEvent);
    await ports.syncQueue?.enqueue(scenarioSyncEvent(pendingEvent));
    return { progress: pendingProgress, validation };
  };

  const currentCheckpoint = (context: Context) => context.scenario?.checkpoints[context.progress?.checkpointIndex ?? -1];
  const updateWorkspace = (context: Context, update: (workspace: ScenarioWorkspace) => void) => {
    if (!context.progress) return {};
    const workspace = cloneWorkspace(context.progress.workspace);
    update(workspace);
    return { progress: { ...context.progress, workspace, updatedAt: ports.clock.now() } };
  };

  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<Loaded, { context: Context }>(({ input }) => load(input)),
      persist: fromPromise<Saved, { context: Context }>(({ input }) => persist(input)),
    },
    guards: {
      validScenario: ({ event }) => event.type === "SELECT_SCENARIO" && scenarios.some(({ id }) => id === event.scenarioId),
      validMode: ({ event }) => event.type === "SELECT_MODE" && ["walkthrough", "practice", "challenge"].includes(event.mode),
      walkthrough: ({ context }) => context.mode === "walkthrough",
      validationPassed: ({ context }) => !!context.validation?.passed,
      hasMoreCheckpoints: ({ context }) => !!context.scenario && !!context.progress
        && context.progress.checkpointIndex + 1 < context.scenario.checkpoints.length,
      canHint: ({ context }) => context.mode === "practice"
        && !!currentCheckpoint(context)
        && (context.progress?.hintLevel ?? 0) < currentCheckpoint(context)!.hints.length,
      validComponent: ({ context, event }) => event.type === "TOGGLE_COMPONENT"
        && !!context.scenario?.availableComponents.some(({ id }) => id === event.componentId),
      validConnection: ({ context, event }) => event.type === "CONNECT"
        && !!context.scenario
        && context.scenario.availableComponents.some(({ id }) => id === event.from)
        && context.scenario.availableComponents.some(({ id }) => id === event.to)
        && event.from !== event.to,
      validSetting: ({ context, event }) => event.type === "SET_SETTING"
        && !!context.scenario?.availableSettings.some(({ id, options }) => id === event.settingId && options.includes(event.value)),
      validDiagnosis: ({ event }) => event.type === "SET_DIAGNOSIS" && event.value.length <= 5_000,
    },
    actions: {
      selectScenario: assign(({ event }) => event.type === "SELECT_SCENARIO"
        ? { scenario: scenarios.find(({ id }) => id === event.scenarioId) ?? null, mode: null, progress: null, validation: null }
        : {}),
      selectMode: assign(({ event }) => event.type === "SELECT_MODE" ? { mode: event.mode } : {}),
      loaded: assign(({ event }) => ({ progress: outputOf<Loaded>(event).progress, error: null })),
      loadFailed: assign({ error: () => ({ code: "CONTENT_INVALID" as const, message: "This training scenario could not be opened safely." }) }),
      toggleComponent: assign(({ context, event }) => event.type === "TOGGLE_COMPONENT"
        ? updateWorkspace(context, (workspace) => {
            workspace.selectedComponents = workspace.selectedComponents.includes(event.componentId)
              ? workspace.selectedComponents.filter((id) => id !== event.componentId)
              : [...workspace.selectedComponents, event.componentId];
            workspace.connections = workspace.connections.filter(({ from, to }) =>
              workspace.selectedComponents.includes(from) && workspace.selectedComponents.includes(to));
          })
        : {}),
      connect: assign(({ context, event }) => event.type === "CONNECT"
        ? updateWorkspace(context, (workspace) => {
            if (!workspace.connections.some(({ from, to }) => from === event.from && to === event.to)) {
              workspace.connections.push({ from: event.from, to: event.to });
            }
          })
        : {}),
      setSetting: assign(({ context, event }) => event.type === "SET_SETTING"
        ? updateWorkspace(context, (workspace) => { workspace.settings[event.settingId] = event.value; })
        : {}),
      setDiagnosis: assign(({ context, event }) => event.type === "SET_DIAGNOSIS"
        ? updateWorkspace(context, (workspace) => { workspace.diagnosis = event.value; })
        : {}),
      showHint: assign(({ context }) => context.progress
        ? { progress: { ...context.progress, hintLevel: context.progress.hintLevel + 1, updatedAt: ports.clock.now() } }
        : {}),
      resetCheckpoint: assign(({ context }) => context.progress
        ? { progress: {
            ...context.progress,
            workspace: cloneWorkspace(context.progress.checkpointStart),
            hintLevel: 0,
            resets: context.progress.resets + 1,
            updatedAt: ports.clock.now(),
          }, validation: null }
        : {}),
      stageValidation: assign(({ context }) => {
        const checkpoint = currentCheckpoint(context);
        if (!context.scenario || !context.mode || !context.progress || !checkpoint) return {};
        const validation = validateScenarioWorkspace(checkpoint.checks, context.progress.workspace);
        const id = ports.ids.create();
        const pendingEvent: ScenarioEvidenceEvent = {
          schemaVersion: 1,
          id,
          idempotencyKey: id,
          type: "scenario.validated",
          courseId: context.scenario.courseId,
          courseVersion: context.scenario.courseVersion,
          scenarioId: context.scenario.id,
          scenarioVersion: context.scenario.version,
          sessionId: context.progress.sessionId,
          mode: context.mode,
          checkpointId: checkpoint.id,
          passed: validation.passed,
          passedCheckIds: validation.passedCheckIds,
          failedCheckIds: validation.failedCheckIds,
          hintsUsed: context.progress.hintLevel,
          resets: context.progress.resets,
          attemptNumber: context.progress.attempts + 1,
          occurredAt: ports.clock.now(),
        };
        return {
          validation,
          pendingEvent,
          pendingProgress: {
            ...context.progress,
            attempts: context.progress.attempts + 1,
            completedCheckpointIds: validation.passed
              ? [...new Set([...context.progress.completedCheckpointIds, checkpoint.id])]
              : context.progress.completedCheckpointIds,
            updatedAt: ports.clock.now(),
          },
        };
      }),
      saved: assign(({ event }) => ({
        progress: outputOf<Saved>(event).progress,
        pendingProgress: null,
        pendingEvent: null,
        error: null,
      })),
      saveFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "This validation attempt is not saved on this device yet." }) }),
      acceptUnsaved: assign(({ context }) => ({
        progress: context.pendingProgress ?? context.progress,
        pendingProgress: null,
        pendingEvent: null,
      })),
      nextCheckpoint: assign(({ context }) => {
        if (!context.progress) return {};
        return {
          progress: {
            ...context.progress,
            checkpointIndex: context.progress.checkpointIndex + 1,
            checkpointStart: cloneWorkspace(context.progress.workspace),
            hintLevel: 0,
            resets: 0,
            attempts: 0,
            updatedAt: ports.clock.now(),
          },
          validation: null,
        };
      }),
    },
  }).createMachine({
    id: "scenarioSession",
    initial: "selection",
    context: {
      scenarios,
      scenario: null,
      mode: null,
      progress: null,
      validation: null,
      pendingProgress: null,
      pendingEvent: null,
      error: null,
    },
    states: {
      selection: { on: { SELECT_SCENARIO: { target: "modeSelection", guard: "validScenario", actions: "selectScenario" } } },
      modeSelection: { on: { SELECT_MODE: { target: "loading", guard: "validMode", actions: "selectMode" } } },
      loading: { invoke: { src: "load", input: ({ context }) => ({ context }), onDone: { target: "briefing", actions: "loaded" }, onError: { target: "failed", actions: "loadFailed" } } },
      briefing: { on: { START: [{ target: "demonstrating", guard: "walkthrough" }, { target: "working" }] } },
      demonstrating: { on: { CONTINUE: "working" } },
      working: { on: {
        TOGGLE_COMPONENT: { guard: "validComponent", actions: "toggleComponent" },
        CONNECT: { guard: "validConnection", actions: "connect" },
        SET_SETTING: { guard: "validSetting", actions: "setSetting" },
        SET_DIAGNOSIS: { guard: "validDiagnosis", actions: "setDiagnosis" },
        SHOW_HINT: { target: "hinting", guard: "canHint", actions: "showHint" },
        RESET_CHECKPOINT: { actions: "resetCheckpoint" },
        VALIDATE: { target: "validating", actions: "stageValidation" },
      } },
      hinting: { always: "working" },
      validating: { invoke: { src: "persist", input: ({ context }) => ({ context }), onDone: { target: "validationResult", actions: "saved" }, onError: { target: "degraded", actions: "saveFailed" } } },
      degraded: { on: { RETRY: "validating", CONTINUE_OFFLINE: { target: "validationResult", actions: "acceptUnsaved" } } },
      validationResult: { always: [{ target: "passedCheckpoint", guard: "validationPassed" }, { target: "failedCheckpoint" }] },
      failedCheckpoint: { on: { REVISE: "working", RESET_CHECKPOINT: { target: "working", actions: "resetCheckpoint" } } },
      passedCheckpoint: { on: { CONTINUE: [{ target: "briefing", guard: "hasMoreCheckpoints", actions: "nextCheckpoint" }, { target: "debriefing" }] } },
      debriefing: { on: { CONTINUE: "complete" } },
      complete: {},
      failed: { on: { RETRY: "loading" } },
    },
  });
};