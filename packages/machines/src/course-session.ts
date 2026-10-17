import { assign, fromPromise, setup } from "xstate";
import { lessonIds, parseCourse } from "@grillme/content";
import type { AppError, Course, CourseProgress, LearningEvent } from "@grillme/domain";
import type { PlatformPorts } from "@grillme/platform";
import { lessonSyncEvent } from "./sync-event";

const progressKey = (course: Course) => `course-progress:${course.id}:${course.version}`;
const eventsKey = (course: Course) => `learning-events:${course.id}:${course.version}`;

type Context = {
  course: Course | null;
  progress: CourseProgress | null;
  pendingProgress: CourseProgress | null;
  pendingEvent: LearningEvent | null;
  error: AppError | null;
};
type Event =
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "GO_TO"; lessonId: string }
  | { type: "COMPLETE" }
  | { type: "RETRY" }
  | { type: "CONTINUE_OFFLINE" };
type Loaded = { course: Course; progress: CourseProgress };
type DoneEvent<T> = { output: T };

const outputOf = <T>(event: unknown): T => (event as DoneEvent<T>).output;
const contentError: AppError = { code: "CONTENT_INVALID", message: "This course could not be opened safely." };
const storageError: AppError = { code: "STORAGE_FAILED", message: "Progress is not saved on this device yet." };

export const createCourseSessionMachine = (source: unknown, ports: PlatformPorts, initialLessonId?: string) => {
  const load = async (): Promise<Loaded> => {
    const course = parseCourse(source);
    const ids = lessonIds(course);
    const stored = await ports.storage.get(progressKey(course));
    const candidate = stored as Partial<CourseProgress> | null;
    const currentLessonId = typeof initialLessonId === "string" && ids.includes(initialLessonId)
      ? initialLessonId
      : candidate?.courseId === course.id
      && candidate.courseVersion === course.version
      && typeof candidate.currentLessonId === "string"
      && ids.includes(candidate.currentLessonId)
      ? candidate.currentLessonId
      : ids[0];
    if (!currentLessonId) throw new Error("Course has no lessons.");
    return {
      course,
      progress: {
        schemaVersion: 1,
        courseId: course.id,
        courseVersion: course.version,
        currentLessonId,
        completedLessonIds: Array.isArray(candidate?.completedLessonIds)
          ? candidate.completedLessonIds.filter((id): id is string => typeof id === "string" && ids.includes(id))
          : [],
        updatedAt: ports.clock.now(),
      },
    };
  };

  const save = async (input: { context: Context }): Promise<CourseProgress> => {
    const { course, pendingProgress, pendingEvent } = input.context;
    if (!course || !pendingProgress) throw new Error("No progress is ready to save.");
    await ports.storage.set(progressKey(course), pendingProgress);
    if (pendingEvent) {
      await ports.storage.append(eventsKey(course), pendingEvent);
      await ports.syncQueue?.enqueue(lessonSyncEvent(pendingEvent));
    }
    return pendingProgress;
  };

  const stage = (context: Context, lessonId: string, completedLessonIds = context.progress?.completedLessonIds ?? []): CourseProgress | null => {
    if (!context.course) return null;
    return {
      schemaVersion: 1,
      courseId: context.course.id,
      courseVersion: context.course.version,
      currentLessonId: lessonId,
      completedLessonIds,
      updatedAt: ports.clock.now(),
    };
  };

  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<Loaded>(load),
      save: fromPromise<CourseProgress, { context: Context }>(({ input }) => save(input)),
    },
    actions: {
      loaded: assign(({ event }) => {
        const output = outputOf<Loaded>(event);
        return { course: output.course, progress: output.progress, error: null };
      }),
      loadFailed: assign({ error: () => contentError }),
      saveFailed: assign({ error: () => storageError }),
      saved: assign(({ event }) => ({
        progress: outputOf<CourseProgress>(event), pendingProgress: null, pendingEvent: null, error: null,
      })),
      acceptPending: assign(({ context }) => ({
        progress: context.pendingProgress ?? context.progress, pendingProgress: null, pendingEvent: null,
      })),
      next: assign(({ context }) => {
        if (!context.course || !context.progress) return {};
        const ids = lessonIds(context.course);
        const index = ids.indexOf(context.progress.currentLessonId);
        const lessonId = ids[Math.min(index + 1, ids.length - 1)] ?? ids[0];
        return lessonId ? { pendingProgress: stage(context, lessonId), pendingEvent: null } : {};
      }),
      previous: assign(({ context }) => {
        if (!context.course || !context.progress) return {};
        const ids = lessonIds(context.course);
        const index = ids.indexOf(context.progress.currentLessonId);
        const lessonId = ids[Math.max(index - 1, 0)] ?? ids[0];
        return lessonId ? { pendingProgress: stage(context, lessonId), pendingEvent: null } : {};
      }),
      goTo: assign(({ context, event }) => event.type === "GO_TO"
        ? { pendingProgress: stage(context, event.lessonId), pendingEvent: null }
        : {}),
      complete: assign(({ context }) => {
        if (!context.course || !context.progress) return {};
        const completed = [...new Set([...context.progress.completedLessonIds, context.progress.currentLessonId])];
        const id = ports.ids.create();
        const pendingEvent: LearningEvent = {
          schemaVersion: 1,
          id,
          idempotencyKey: id,
          type: "lesson.completed",
          courseId: context.course.id,
          courseVersion: context.course.version,
          lessonId: context.progress.currentLessonId,
          occurredAt: ports.clock.now(),
        };
        return {
          pendingProgress: stage(context, context.progress.currentLessonId, completed),
          pendingEvent,
        };
      }),
    },
    guards: {
      validDestination: ({ context, event }) => event.type === "GO_TO"
        && !!context.course
        && lessonIds(context.course).includes(event.lessonId),
    },
  }).createMachine({
    id: "courseSession",
    initial: "loading",
    context: { course: null, progress: null, pendingProgress: null, pendingEvent: null, error: null },
    states: {
      loading: {
        invoke: { src: "load", onDone: { target: "ready", actions: "loaded" }, onError: { target: "failed", actions: "loadFailed" } },
      },
      ready: { always: "reading" },
      reading: {
        on: {
          NEXT: { target: "saving", actions: "next" },
          PREVIOUS: { target: "saving", actions: "previous" },
          GO_TO: { target: "saving", guard: "validDestination", actions: "goTo" },
          COMPLETE: { target: "saving", actions: "complete" },
        },
      },
      saving: {
        invoke: {
          src: "save",
          input: ({ context }) => ({ context }),
          onDone: { target: "reading", actions: "saved" },
          onError: { target: "degraded", actions: "saveFailed" },
        },
      },
      degraded: {
        on: { RETRY: "saving", CONTINUE_OFFLINE: { target: "reading", actions: "acceptPending" } },
      },
      failed: { on: { RETRY: "loading" } },
    },
  });
};