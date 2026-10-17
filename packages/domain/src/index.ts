export * from "./assessment";
export * from "./review";
export type ContentBlock =
  | { type: "text"; body: string }
  | { type: "code"; language: string; code: string }
  | { type: "callout"; tone: "info" | "warning"; title: string; body: string }
  | { type: "diagram"; title: string; description: string; nodes: string[] };

export type Activity = { id: string; type: "reflection" | "knowledge-check" | "lab"; title: string };
export type Lesson = { id: string; title: string; summary: string; blocks: ContentBlock[]; activities: Activity[] };
export type CourseModule = { id: string; title: string; lessons: Lesson[] };
export type CourseSource = { title: string; url: string; retrievedAt: string };
export type Course = {
  schemaVersion: 1;
  id: string;
  version: string;
  title: string;
  description: string;
  locale: string;
  sources: CourseSource[];
  modules: CourseModule[];
};

export type CourseProgress = {
  schemaVersion: 1;
  courseId: string;
  courseVersion: string;
  currentLessonId: string;
  completedLessonIds: string[];
  updatedAt: string;
};

export type LearningEvent = {
  schemaVersion: 1;
  id: string;
  type: "lesson.completed";
  courseId: string;
  courseVersion: string;
  lessonId: string;
  occurredAt: string;
};

export type AppError = { code: "CONTENT_INVALID" | "STORAGE_FAILED" | "UNKNOWN"; message: string };