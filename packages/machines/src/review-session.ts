import { assign, fromPromise, setup } from "xstate";
import { parseReviewSchedule } from "@grillme/content";
import type { AppError, ReviewEvent, ReviewItem, ReviewSchedule } from "@grillme/domain";
import type { PlatformPorts } from "@grillme/platform";
import { rescheduleItem } from "./review-rules";

const scheduleKey = (courseId: string, courseVersion: string) => `review-schedule:${courseId}:${courseVersion}`;
const eventsKey = (courseId: string, courseVersion: string) => `review-events:${courseId}:${courseVersion}`;
type Context = {
  schedule: ReviewSchedule | null;
  selected: ReviewItem | null;
  confidence: number;
  pendingSchedule: ReviewSchedule | null;
  pendingEvent: ReviewEvent | null;
  error: AppError | null;
};
type Event =
  | { type: "SELECT"; skillId: string }
  | { type: "REVEAL" }
  | { type: "ASSESS" }
  | { type: "RATE"; confidence: number }
  | { type: "CONTINUE" }
  | { type: "RETRY" }
  | { type: "CONTINUE_OFFLINE" };
type DoneEvent<T> = { output: T };
const outputOf = <T>(event: unknown): T => (event as DoneEvent<T>).output;

export const createReviewSessionMachine = (
  courseId: string,
  courseVersion: string,
  ports: PlatformPorts,
) => {
  const emptySchedule = (): ReviewSchedule => ({
    schemaVersion: 1,
    courseId,
    courseVersion,
    items: [],
    updatedAt: ports.clock.now(),
  });
  const load = async (): Promise<ReviewSchedule> => {
    const candidate = parseReviewSchedule(await ports.storage.get(scheduleKey(courseId, courseVersion)));
    return candidate?.courseId === courseId && candidate.courseVersion === courseVersion
      ? candidate
      : emptySchedule();
  };
  const persist = async (input: { context: Context }): Promise<ReviewSchedule> => {
    if (!input.context.pendingSchedule || !input.context.pendingEvent) throw new Error("Review update is unavailable.");
    await ports.storage.set(scheduleKey(courseId, courseVersion), input.context.pendingSchedule);
    await ports.storage.append(eventsKey(courseId, courseVersion), input.context.pendingEvent);
    return input.context.pendingSchedule;
  };
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<ReviewSchedule>(load),
      persist: fromPromise<ReviewSchedule, { context: Context }>(({ input }) => persist(input)),
    },
    guards: {
      itemExists: ({ context, event }) => event.type === "SELECT"
        && !!context.schedule?.items.some(({ skillId, dueAt }) =>
          skillId === event.skillId && Date.parse(dueAt) <= Date.parse(ports.clock.now())),
      hasItems: ({ context }) => (context.schedule?.items.length ?? 0) > 0,
      validConfidence: ({ event }) => event.type === "RATE"
        && Number.isInteger(event.confidence) && event.confidence >= 1 && event.confidence <= 5,
    },
    actions: {
      loaded: assign(({ event }) => ({ schedule: outputOf<ReviewSchedule>(event), error: null })),
      loadFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "Your review queue could not be loaded." }) }),
      select: assign(({ context, event }) => event.type === "SELECT"
        ? { selected: context.schedule?.items.find(({ skillId }) => skillId === event.skillId) ?? null }
        : {}),
      setConfidence: assign(({ event }) => event.type === "RATE" ? { confidence: event.confidence } : {}),
      stageReview: assign(({ context }) => {
        if (!context.schedule || !context.selected) return {};
        const now = ports.clock.now();
        const updated = rescheduleItem(context.selected, context.confidence, now);
        const items = context.schedule.items
          .filter(({ skillId }) => skillId !== context.selected?.skillId)
          .concat(updated ? [updated] : []);
        const pendingSchedule = { ...context.schedule, items, updatedAt: now };
        const id = ports.ids.create();
        const pendingEvent: ReviewEvent = {
          schemaVersion: 1,
          id,
          idempotencyKey: id,
          type: "skill.reviewed",
          courseId,
          courseVersion,
          skillId: context.selected.skillId,
          confidence: context.confidence,
          removed: !updated,
          nextDueAt: updated?.dueAt ?? null,
          occurredAt: now,
        };
        return { pendingSchedule, pendingEvent };
      }),
      saved: assign(({ event }) => ({
        schedule: outputOf<ReviewSchedule>(event),
        pendingSchedule: null,
        pendingEvent: null,
        selected: null,
        confidence: 3,
        error: null,
      })),
      saveFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "This review is not saved on this device yet." }) }),
      acceptUnsaved: assign(({ context }) => ({
        schedule: context.pendingSchedule ?? context.schedule,
        pendingSchedule: null,
        pendingEvent: null,
        selected: null,
        confidence: 3,
      })),
    },
  }).createMachine({
    id: "reviewSession",
    initial: "loading",
    context: { schedule: null, selected: null, confidence: 3, pendingSchedule: null, pendingEvent: null, error: null },
    states: {
      loading: { invoke: { src: "load", onDone: { target: "selection", actions: "loaded" }, onError: { target: "failed", actions: "loadFailed" } } },
      selection: { always: { target: "complete", guard: ({ context }) => context.schedule?.items.length === 0 }, on: { SELECT: { target: "prompting", guard: "itemExists", actions: "select" } } },
      prompting: { on: { REVEAL: "revealing" } },
      revealing: { on: { ASSESS: "selfAssessment" } },
      selfAssessment: { on: { RATE: { target: "rescheduling", guard: "validConfidence", actions: ["setConfidence", "stageReview"] } } },
      rescheduling: { invoke: { src: "persist", input: ({ context }) => ({ context }), onDone: { target: "selection", actions: "saved" }, onError: { target: "degraded", actions: "saveFailed" } } },
      degraded: { on: { RETRY: "rescheduling", CONTINUE_OFFLINE: { target: "selection", actions: "acceptUnsaved" } } },
      complete: {},
      failed: { on: { RETRY: "loading" } },
    },
  });
};