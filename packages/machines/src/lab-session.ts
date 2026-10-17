import { assign, fromPromise, setup } from "xstate";
import { parseLab, parseLabProgress, parseLabSession, parseLabValidation } from "@grillme/content";
import type { AppError, LabDefinition, LabOperation, LabProgress, LabSession, LabValidation } from "@grillme/domain";
import type { ClockPort, LabPort, StoragePort } from "@grillme/platform";

const progressKey = (lab: LabDefinition) => `lab-progress:${lab.id}:${lab.version}`;
type Context = { lab: LabDefinition; session: LabSession | null; progress: LabProgress | null; pendingOperation: LabOperation | null; error: AppError | null };
type Event = { type: "REQUEST" } | { type: "START" } | { type: "OPERATE"; operation: LabOperation } | { type: "SHOW_HINT" } | { type: "VALIDATE" } | { type: "CONTINUE" } | { type: "NETWORK_OFFLINE" } | { type: "NETWORK_ONLINE" } | { type: "STOP" } | { type: "TICK" } | { type: "RETRY" };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;

export const createLabSessionMachine = (source: unknown, storage: StoragePort, remote: LabPort, clock: ClockPort) => {
  const lab = parseLab(source);
  const save = async (progress: LabProgress) => storage.set(progressKey(lab), progress);
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      restore: fromPromise(async () => parseLabProgress(await storage.get(progressKey(lab)))),
      provision: fromPromise(async () => { const session = parseLabSession(await remote.provision(lab.id, lab.version)); if (!session) throw new Error("Invalid lab session."); return session; }),
      reconnect: fromPromise<LabSession, { sessionId: string }>(async ({ input }) => { const session = parseLabSession(await remote.status(input.sessionId)); if (!session) throw new Error("Invalid lab session."); return session; }),
      operate: fromPromise<void, { sessionId: string; operation: LabOperation }>(async ({ input }) => { await remote.operate(input.sessionId, input.operation); }),
      validate: fromPromise<LabValidation, { sessionId: string; checkpointId: string; attemptId: string }>(async ({ input }) => { const result = parseLabValidation(await remote.validate(input.sessionId, input.checkpointId, input.attemptId)); if (!result) throw new Error("Invalid validation."); return result; }),
      stop: fromPromise(async ({ input }: { input: { sessionId: string } }) => {
        const result = await remote.stop(input.sessionId);
        await storage.remove(progressKey(lab));
        return result;
      }),
      persist: fromPromise<void, { progress: LabProgress }>(async ({ input }) => save(input.progress)),
    },
    guards: {
      hasProgress: ({ context }) => !!context.progress,
      resumable: ({ event }) => { const progress = output<LabProgress | null>(event); return !!progress && progress.labId === lab.id && progress.labVersion === lab.version && Date.parse(progress.expiresAt) > Date.parse(clock.now()); },
      expired: ({ context }) => !!context.progress && Date.parse(context.progress.expiresAt) <= Date.parse(clock.now()),
      canHint: ({ context }) => !!context.progress && context.progress.hintLevel < (lab.checkpoints[context.progress.checkpointIndex]?.hints.length ?? 0),
      passed: ({ context }) => context.progress?.lastValidation?.status === "passed",
      inconclusive: ({ context }) => context.progress?.lastValidation?.status === "inconclusive",
      moreCheckpoints: ({ context }) => !!context.progress && context.progress.checkpointIndex + 1 < lab.checkpoints.length,
      attemptsRemain: ({ context }) => (context.progress?.attempts ?? 0) < lab.maxAttempts,
    },
    actions: {
      restored: assign(({ event }) => ({ progress: output<LabProgress | null>(event), error: null })),
      provisioned: assign(({ event }) => { const session = output<LabSession>(event); return { session, progress: { schemaVersion: 1 as const, labId: lab.id, labVersion: lab.version, sessionId: session.id, checkpointIndex: 0, hintLevel: 0, attempts: 0, validationRequests: 0, completedCheckpointIds: [], lastValidation: null, expiresAt: session.expiresAt, updatedAt: clock.now() }, error: null }; }),
      reconnected: assign(({ event }) => ({ session: output<LabSession>(event), error: null })),
      stageOperation: assign(({ event }) => event.type === "OPERATE" ? { pendingOperation: event.operation } : {}),
      operationDone: assign({ pendingOperation: null, error: null }),
      showHint: assign(({ context }) => context.progress ? { progress: { ...context.progress, hintLevel: context.progress.hintLevel + 1, updatedAt: clock.now() } } : {}),
      validated: assign(({ context, event }) => {
        if (!context.progress) return {};
        const validation = output<LabValidation>(event); const consumesAttempt = validation.status !== "inconclusive";
        return { progress: { ...context.progress, attempts: context.progress.attempts + (consumesAttempt ? 1 : 0), validationRequests: context.progress.validationRequests + 1, lastValidation: validation, completedCheckpointIds: validation.status === "passed" ? [...new Set([...context.progress.completedCheckpointIds, lab.checkpoints[context.progress.checkpointIndex]?.id ?? ""])].filter(Boolean) : context.progress.completedCheckpointIds, updatedAt: clock.now() }, error: null };
      }),
      nextCheckpoint: assign(({ context }) => context.progress ? { progress: { ...context.progress, checkpointIndex: context.progress.checkpointIndex + 1, hintLevel: 0, attempts: 0, lastValidation: null, updatedAt: clock.now() } } : {}),
      failed: assign({ error: () => ({ code: "UNKNOWN" as const, message: "The lab service is temporarily unavailable." }) }),
      offline: assign({ error: () => ({ code: "UNKNOWN" as const, message: "Sandbox labs require a network connection." }) }),
      clear: assign({ session: null }),
    },
  }).createMachine({
    id: "labSession",
    initial: "restoring",
    context: { lab, session: null, progress: null, pendingOperation: null, error: null },
    states: {
      restoring: { invoke: { src: "restore", onDone: [{ target: "checkingSession", guard: "resumable", actions: "restored" }, { target: "requested" }], onError: "requested" } },
      requested: { on: { REQUEST: "provisioning", NETWORK_OFFLINE: { actions: "offline" } } },
      provisioning: { invoke: { src: "provision", onDone: { target: "persistingReady", actions: "provisioned" }, onError: { target: "failed", actions: "failed" } }, after: { 30000: { target: "failed", actions: "failed" } } },
      persistingReady: { invoke: { src: "persist", input: ({ context }) => ({ progress: context.progress! }), onDone: "ready", onError: { target: "failed", actions: "failed" } } },
      ready: { on: { START: "working", NETWORK_OFFLINE: { target: "reconnecting", actions: "offline" }, STOP: "stopping", TICK: { target: "expired", guard: "expired" } } },
      working: { on: { OPERATE: { target: "operating", actions: "stageOperation" }, SHOW_HINT: { actions: "showHint", guard: "canHint" }, VALIDATE: { target: "validating", guard: "attemptsRemain" }, NETWORK_OFFLINE: { target: "reconnecting", actions: "offline" }, STOP: "stopping", TICK: { target: "expired", guard: "expired" } } },
      operating: { invoke: { src: "operate", input: ({ context }) => ({ sessionId: context.progress!.sessionId, operation: context.pendingOperation! }), onDone: { target: "working", actions: "operationDone" }, onError: { target: "failed", actions: "failed" } } },
      validating: { invoke: { src: "validate", input: ({ context }) => ({ sessionId: context.progress!.sessionId, checkpointId: lab.checkpoints[context.progress!.checkpointIndex]!.id, attemptId: `${context.progress!.sessionId}:${lab.checkpoints[context.progress!.checkpointIndex]!.id}:${context.progress!.validationRequests + 1}` }), onDone: { target: "persistingValidation", actions: "validated" }, onError: { target: "failed", actions: "failed" } } },
      persistingValidation: { invoke: { src: "persist", input: ({ context }) => ({ progress: context.progress! }), onDone: "validationResult", onError: { target: "failed", actions: "failed" } } },
      validationResult: { always: [{ target: "passedCheckpoint", guard: "passed" }, { target: "inconclusive", guard: "inconclusive" }, { target: "working" }] },
      inconclusive: { on: { RETRY: "validating", STOP: "stopping", NETWORK_OFFLINE: { target: "reconnecting", actions: "offline" } } },
      passedCheckpoint: { on: { CONTINUE: [{ target: "persistingNext", guard: "moreCheckpoints", actions: "nextCheckpoint" }, { target: "stopping" }] } },
      persistingNext: { invoke: { src: "persist", input: ({ context }) => ({ progress: context.progress! }), onDone: "working", onError: { target: "failed", actions: "failed" } } },
      reconnecting: { on: { NETWORK_ONLINE: "checkingSession", STOP: "stopping", TICK: { target: "expired", guard: "expired" } } },
      checkingSession: { invoke: { src: "reconnect", input: ({ context }) => ({ sessionId: context.progress!.sessionId }), onDone: { target: "ready", actions: "reconnected" }, onError: { target: "failed", actions: "failed" } } },
      stopping: { invoke: { src: "stop", input: ({ context }) => ({ sessionId: context.progress!.sessionId }), onDone: { target: "cleaned", actions: "clear" }, onError: { target: "failed", actions: "failed" } } },
      expired: { invoke: { src: "stop", input: ({ context }) => ({ sessionId: context.progress!.sessionId }), onDone: { target: "cleaned", actions: "clear" }, onError: { target: "cleaned", actions: "clear" } } },
      failed: { on: { RETRY: [{ target: "checkingSession", guard: "hasProgress" }, { target: "requested" }], STOP: { target: "stopping", guard: "hasProgress" } } },
      cleaned: {},
    },
  });
};
