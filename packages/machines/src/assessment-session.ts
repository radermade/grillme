import { assign, fromPromise, setup } from "xstate";
import { parseAssessment } from "@grillme/content";
import type {
  AppError,
  Assessment,
  AssessmentAnswer,
  AssessmentProgress,
  AssessmentResponse,
  ReviewSchedule,
  SkillGap,
} from "@grillme/domain";
import type { PlatformPorts } from "@grillme/platform";
import { assessmentSyncEvent } from "./sync-event";
import { deriveSkillGaps, gradeAnswer, isAnswerComplete } from "./grading";
import { scheduleFromGaps } from "./review-rules";

const progressKey = (assessment: Assessment) => `assessment-progress:${assessment.id}:${assessment.version}`;
const responseKey = (assessment: Assessment) => `assessment-responses:${assessment.id}:${assessment.version}`;
const scheduleKey = (assessment: Assessment) => `review-schedule:${assessment.courseId}:${assessment.courseVersion}`;

type Context = {
  assessment: Assessment | null;
  progress: AssessmentProgress | null;
  currentIndex: number;
  draftAnswer: AssessmentAnswer;
  confidence: number;
  startedAtMs: number;
  pendingResponse: AssessmentResponse | null;
  reviewedResponse: AssessmentResponse | null;
  gaps: SkillGap[];
  schedule: ReviewSchedule | null;
  error: AppError | null;
};
type Event =
  | { type: "START" }
  | { type: "ANSWER"; answer: AssessmentAnswer }
  | { type: "CONFIDENCE"; value: number }
  | { type: "SUBMIT" }
  | { type: "CONTINUE" }
  | { type: "FINISH" }
  | { type: "RETRY" }
  | { type: "CONTINUE_OFFLINE" }
  | { type: "ABANDON" };
type Loaded = { assessment: Assessment; progress: AssessmentProgress; currentIndex: number };
type Finalized = { gaps: SkillGap[]; schedule: ReviewSchedule };
type DoneEvent<T> = { output: T };

const outputOf = <T>(event: unknown): T => (event as DoneEvent<T>).output;
const emptyAnswer = (assessment: Assessment | null, index: number): AssessmentAnswer =>
  assessment?.activities[index]?.type === "ordering"
    ? assessment.activities[index].items.map(({ id }) => id)
    : assessment?.activities[index]?.type === "multiple-choice" ? [] : "";
export const createAssessmentSessionMachine = (source: unknown, ports: PlatformPorts) => {
  const load = async (): Promise<Loaded> => {
    const assessment = parseAssessment(source);
    const stored = await ports.storage.get(progressKey(assessment));
    const candidate = stored as Partial<AssessmentProgress> | null;
    const responses = candidate?.schemaVersion === 1
      && candidate.assessmentId === assessment.id
      && candidate.assessmentVersion === assessment.version
      && Array.isArray(candidate.responses)
      ? candidate.responses.filter((response): response is AssessmentResponse =>
          !!response && typeof response === "object"
          && assessment.activities.some(({ id }) => id === response.activityId))
      : [];
    const firstUnanswered = assessment.activities.findIndex((activity) =>
      !responses.some(({ activityId }) => activityId === activity.id));
    return {
      assessment,
      progress: {
        schemaVersion: 1,
        assessmentId: assessment.id,
        assessmentVersion: assessment.version,
        responses,
        updatedAt: ports.clock.now(),
      },
      currentIndex: firstUnanswered < 0 ? assessment.activities.length : firstUnanswered,
    };
  };

  const persistResponse = async (input: { context: Context }): Promise<AssessmentProgress> => {
    const { assessment, progress, pendingResponse } = input.context;
    if (!assessment || !progress || !pendingResponse) throw new Error("Response is unavailable.");
    const next = {
      ...progress,
      responses: [...progress.responses.filter(({ activityId }) => activityId !== pendingResponse.activityId), pendingResponse],
      updatedAt: ports.clock.now(),
    };
    await ports.storage.set(progressKey(assessment), next);
    await ports.storage.append(responseKey(assessment), pendingResponse);
    await ports.syncQueue?.enqueue(assessmentSyncEvent(pendingResponse, assessment.courseId, assessment.courseVersion));
    return next;
  };

  const finalize = async (input: { context: Context }): Promise<Finalized> => {
    const { assessment, progress } = input.context;
    if (!assessment || !progress) throw new Error("Assessment is unavailable.");
    const gaps = deriveSkillGaps(assessment, progress.responses);
    const schedule = scheduleFromGaps(assessment, gaps, ports.clock.now());
    await ports.storage.set(scheduleKey(assessment), schedule);
    return { gaps, schedule };
  };
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<Loaded>(load),
      persistResponse: fromPromise<AssessmentProgress, { context: Context }>(({ input }) => persistResponse(input)),
      finalize: fromPromise<Finalized, { context: Context }>(({ input }) => finalize(input)),
    },
    guards: {
      hasAnswer: ({ context }) => {
        const activity = context.assessment?.activities[context.currentIndex];
        return !!activity && isAnswerComplete(activity, context.draftAnswer);
      },
      validConfidence: ({ event }) => event.type === "CONFIDENCE"
        && Number.isInteger(event.value) && event.value >= 1 && event.value <= 5,
      hasMore: ({ context }) => !!context.assessment && context.currentIndex + 1 < context.assessment.activities.length,
    },
    actions: {
      loaded: assign(({ event }) => {
        const output = outputOf<Loaded>(event);
        return {
          assessment: output.assessment,
          progress: output.progress,
          currentIndex: output.currentIndex,
          draftAnswer: emptyAnswer(output.assessment, output.currentIndex),
          startedAtMs: Date.now(),
          error: null,
        };
      }),
      loadFailed: assign({ error: () => ({ code: "CONTENT_INVALID" as const, message: "This assessment could not be opened safely." }) }),
      setAnswer: assign(({ event }) => event.type === "ANSWER" ? { draftAnswer: event.answer } : {}),
      setConfidence: assign(({ event }) => event.type === "CONFIDENCE" ? { confidence: event.value } : {}),
      stageResponse: assign(({ context }) => {
        const activity = context.assessment?.activities[context.currentIndex];
        if (!context.assessment || !activity) return {};
        const id = ports.ids.create();
        const pendingResponse: AssessmentResponse = {
          schemaVersion: 1,
          type: "assessment.responded",
          id,
          idempotencyKey: id,
          assessmentId: context.assessment.id,
          assessmentVersion: context.assessment.version,
          activityId: activity.id,
          skillIds: activity.skillIds,
          answer: context.draftAnswer,
          confidence: context.confidence,
          elapsedMs: Math.max(0, Date.now() - context.startedAtMs),
          attemptNumber: 1,
          correct: gradeAnswer(activity, context.draftAnswer),
          occurredAt: ports.clock.now(),
        };
        return { pendingResponse, reviewedResponse: pendingResponse };
      }),
      responseSaved: assign(({ event }) => ({ progress: outputOf<AssessmentProgress>(event), pendingResponse: null, error: null })),
      saveFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "This response is not saved on this device yet." }) }),
      acceptUnsaved: assign(({ context }) => {
        if (!context.progress || !context.pendingResponse) return {};
        return {
          progress: {
            ...context.progress,
            responses: [...context.progress.responses, context.pendingResponse],
            updatedAt: ports.clock.now(),
          },
          pendingResponse: null,
        };
      }),
      nextActivity: assign(({ context }) => {
        const nextIndex = context.currentIndex + 1;
        return {
          currentIndex: nextIndex,
          draftAnswer: emptyAnswer(context.assessment, nextIndex),
          confidence: 3,
          reviewedResponse: null,
          startedAtMs: Date.now(),
        };
      }),
      finalized: assign(({ event }) => {
        const output = outputOf<Finalized>(event);
        return { gaps: output.gaps, schedule: output.schedule, error: null };
      }),
      finalizeFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "Results could not be prepared yet." }) }),
    },
  }).createMachine({
    id: "assessmentSession",
    initial: "loading",
    context: {
      assessment: null,
      progress: null,
      currentIndex: 0,
      draftAnswer: "",
      confidence: 3,
      startedAtMs: Date.now(),
      pendingResponse: null,
      reviewedResponse: null,
      gaps: [],
      schedule: null,
      error: null,
    },
    states: {
      loading: { invoke: { src: "load", onDone: { target: "introduction", actions: "loaded" }, onError: { target: "failed", actions: "loadFailed" } } },
      introduction: { on: { START: "answering", FINISH: "submitting", ABANDON: "abandoned" } },
      answering: { on: { ANSWER: { actions: "setAnswer" }, CONFIDENCE: { guard: "validConfidence", actions: "setConfidence" }, SUBMIT: { target: "saving", guard: "hasAnswer", actions: "stageResponse" }, ABANDON: "abandoned" } },
      saving: { invoke: { src: "persistResponse", input: ({ context }) => ({ context }), onDone: { target: "reviewing", actions: "responseSaved" }, onError: { target: "degraded", actions: "saveFailed" } } },
      degraded: { on: { RETRY: "saving", CONTINUE_OFFLINE: { target: "reviewing", actions: "acceptUnsaved" }, ABANDON: "abandoned" } },
      reviewing: { on: { CONTINUE: [{ target: "answering", guard: "hasMore", actions: "nextActivity" }, { target: "submitting" }], ABANDON: "abandoned" } },
      submitting: { invoke: { src: "finalize", input: ({ context }) => ({ context }), onDone: { target: "graded", actions: "finalized" }, onError: { target: "failed", actions: "finalizeFailed" } } },
      graded: {},
      abandoned: { on: { RETRY: "loading" } },
      failed: { on: { RETRY: "loading" } },
    },
  });
};