import { assign, fromPromise, setup } from "xstate";
import { parseMock, parseMockProgress } from "@grillme/content";
import type { AppError, MockDefinition, MockEvidenceEvent, MockProgress } from "@grillme/domain";
import type { PlatformPorts } from "@grillme/platform";
import { mockSyncEvent } from "./sync-event";

const progressKey = (mock: MockDefinition) => `mock-progress:${mock.id}:${mock.version}`;
const evidenceKey = (mock: MockDefinition) => `mock-events:${mock.id}:${mock.version}`;
type Context = { mock: MockDefinition; progress: MockProgress | null; selectedChoiceId: string | null; questionStartedAt: string; evidence: MockEvidenceEvent | null; error: AppError | null };
type Event = { type: "START" } | { type: "CHOOSE"; choiceId: string } | { type: "SUBMIT" } | { type: "PAUSE" } | { type: "RESUME" } | { type: "TICK" } | { type: "FINISH" } | { type: "RETRY" };
type Done<T> = { output: T };
const output = <T>(event: unknown) => (event as Done<T>).output;
const addMinutes = (iso: string, minutes: number) => new Date(Date.parse(iso) + minutes * 60_000).toISOString();

export const createMockSessionMachine = (source: unknown, ports: PlatformPorts) => {
  const mock = parseMock(source);
  const load = async () => { const stored = parseMockProgress(await ports.storage.get(progressKey(mock))); return stored?.mockId === mock.id && stored.mockVersion === mock.version && stored.currentIndex < mock.items.length ? stored : null; };
  const skillScores = (progress: MockProgress) => Object.fromEntries([...new Set(mock.items.flatMap(({ skillIds }) => skillIds))].map((skillId) => { const itemIds = mock.items.filter(({ skillIds }) => skillIds.includes(skillId)).map(({ id }) => id); const responses = progress.responses.filter(({ itemId }) => itemIds.includes(itemId)); return [skillId, responses.length ? responses.filter(({ correct }) => correct).length / responses.length : 0]; }));
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise(load),
      persist: fromPromise<void, { progress: MockProgress }>(async ({ input }) => ports.storage.set(progressKey(mock), input.progress)),
      finalize: fromPromise<MockEvidenceEvent, { progress: MockProgress }>(async ({ input }) => { const id = `${input.progress.sessionId}:complete`; const event: MockEvidenceEvent = { schemaVersion: 1, id, idempotencyKey: id, type: "mock.completed", courseId: mock.courseId, courseVersion: mock.courseVersion, mockId: mock.id, mockVersion: mock.version, sessionId: input.progress.sessionId, skillScores: skillScores(input.progress), occurredAt: ports.clock.now() }; await ports.storage.append(evidenceKey(mock), event); await ports.syncQueue?.enqueue(mockSyncEvent(event)); await ports.storage.remove(progressKey(mock)); return event; }),
    },
    guards: {
      validChoice: ({ context, event }) => event.type === "CHOOSE" && !!mock.items[context.progress?.currentIndex ?? -1]?.choices.some(({ id }) => id === event.choiceId),
      hasChoice: ({ context }) => !!context.selectedChoiceId,
      hasMore: ({ context }) => !!context.progress && context.progress.currentIndex + 1 < mock.items.length,
      expired: ({ context }) => !!context.progress && Date.parse(context.progress.expiresAt) <= Date.parse(ports.clock.now()),
      complete: ({ context }) => !!context.progress && context.progress.responses.length >= mock.items.length,
    },
    actions: {
      loaded: assign(({ event }) => { const progress = output<MockProgress | null>(event); return { progress, questionStartedAt: progress?.updatedAt ?? ports.clock.now(), error: null }; }),
      start: assign(() => { const startedAt = ports.clock.now(); return { progress: { schemaVersion: 1 as const, mockId: mock.id, mockVersion: mock.version, sessionId: ports.ids.create(), currentIndex: 0, startedAt, expiresAt: addMinutes(startedAt, mock.durationMinutes), responses: [], updatedAt: startedAt }, selectedChoiceId: null, questionStartedAt: startedAt }; }),
      choose: assign(({ event }) => event.type === "CHOOSE" ? { selectedChoiceId: event.choiceId } : {}),
      record: assign(({ context }) => { const item = mock.items[context.progress?.currentIndex ?? -1]; if (!context.progress || !item || !context.selectedChoiceId) return {}; const now = ports.clock.now(); return { progress: { ...context.progress, responses: [...context.progress.responses, { itemId: item.id, choiceId: context.selectedChoiceId, correct: context.selectedChoiceId === item.correctChoiceId, elapsedMs: Math.max(0, Date.parse(now) - Date.parse(context.questionStartedAt)) }], updatedAt: now }, selectedChoiceId: null }; }),
      next: assign(({ context }) => context.progress ? { progress: { ...context.progress, currentIndex: context.progress.currentIndex + 1, updatedAt: ports.clock.now() }, questionStartedAt: ports.clock.now() } : {}),
      finalized: assign(({ event }) => ({ evidence: output<MockEvidenceEvent>(event), error: null })),
      failed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "The mock session could not be saved." }) }),
    },
  }).createMachine({
    id: "mockSession",
    initial: "loading",
    context: { mock, progress: null, selectedChoiceId: null, questionStartedAt: ports.clock.now(), evidence: null, error: null },
    states: {
      loading: { invoke: { src: "load", onDone: { target: "briefing", actions: "loaded" }, onError: { target: "failed", actions: "failed" } } },
      briefing: { on: { START: { target: "persisting", actions: "start" }, RESUME: { target: "inProgress", guard: ({ context }) => !!context.progress } } },
      persisting: { invoke: { src: "persist", input: ({ context }) => ({ progress: context.progress! }), onDone: "inProgress", onError: { target: "failed", actions: "failed" } } },
      inProgress: { always: [{ target: "timedOut", guard: "expired" }, { target: "finalizing", guard: "complete" }], on: { CHOOSE: { guard: "validChoice", actions: "choose" }, SUBMIT: { target: "savingResponse", guard: "hasChoice", actions: "record" }, PAUSE: "paused", TICK: { target: "timedOut", guard: "expired" }, FINISH: "finalizing" } },
      savingResponse: { invoke: { src: "persist", input: ({ context }) => ({ progress: context.progress! }), onDone: [{ target: "inProgress", guard: "hasMore", actions: "next" }, { target: "finalizing" }], onError: { target: "failed", actions: "failed" } } },
      paused: { on: { RESUME: [{ target: "timedOut", guard: "expired" }, { target: "inProgress" }], FINISH: "finalizing" } },
      timedOut: { always: "finalizing" },
      finalizing: { invoke: { src: "finalize", input: ({ context }) => ({ progress: context.progress! }), onDone: { target: "reviewingResults", actions: "finalized" }, onError: { target: "failed", actions: "failed" } } },
      reviewingResults: { on: { FINISH: "complete" } },
      complete: {},
      failed: { on: { RETRY: "loading" } },
    },
  });
};
