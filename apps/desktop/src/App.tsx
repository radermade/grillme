import { useEffect, useMemo, useState } from "react";
import { useMachine } from "@xstate/react";
import { createAppMachine, createCourseSessionMachine } from "@grillme/machines";
import type { ContentBlock, Course, CourseProgress, Lesson } from "@grillme/domain";
import courseSource from "./course.json";
import { loadMetadata, platform, updates } from "./adapters";

const blocks = (items: ContentBlock[]) => items.map((block, index) => {
  if (block.type === "text") return <p key={index}>{block.body}</p>;
  if (block.type === "code") return <pre key={index}><code>{block.code}</code></pre>;
  if (block.type === "callout") return <aside key={index} className={`callout ${block.tone}`}><strong>{block.title}</strong><p>{block.body}</p></aside>;
  return <figure key={index}><figcaption><strong>{block.title}</strong><p>{block.description}</p></figcaption><ol className="diagram">{block.nodes.map((node) => <li key={node}>{node}</li>)}</ol></figure>;
});

export function App() {
  const appMachine = useMemo(() => createAppMachine({ loadMetadata, updates }), []);
  const courseMachine = useMemo(() => createCourseSessionMachine(courseSource, platform), []);
  const [appState, sendApp] = useMachine(appMachine, {});
  const [courseState, sendCourse] = useMachine(courseMachine, {});
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const course = courseState.context.course as Course | null;
  const progress = (courseState.context.pendingProgress ?? courseState.context.progress) as CourseProgress | null;
  const lessons = course?.modules.flatMap((module) => module.lessons) ?? [];
  const lesson = lessons.find(({ id }) => id === progress?.currentLessonId) as Lesson | undefined;

  useEffect(() => {
    if (lesson) document.querySelector<HTMLElement>("#lesson")?.focus();
  }, [lesson?.id]);

  const openSource = async (url: string) => {
    setNavigationError(null);
    try { await platform.navigation.openExternal(url); }
    catch { setNavigationError("The secure source link could not be opened."); }
  };

  if (appState.matches("bootstrapping") || courseState.matches("loading")) {
    return <main><p className="eyebrow">Grill Me</p><h1>Opening your course</h1><p role="status">Loading and restoring progress…</p></main>;
  }
  if (appState.matches("failed")) {
    return <main><h1>Startup interrupted</h1><p role="alert">{appState.context.error}</p><button className="primary" onClick={() => sendApp({ type: "RETRY" })}>Retry</button></main>;
  }
  if (courseState.matches("failed")) {
    return <main><h1>Course unavailable</h1><p role="alert">{courseState.context.error?.message}</p><button className="primary" onClick={() => sendCourse({ type: "RETRY" })}>Retry</button></main>;
  }
  if (!course || !progress || !lesson) {
    return <main><h1>No lesson available</h1><p role="alert">The course does not contain a readable lesson.</p></main>;
  }

  const currentIndex = lessons.findIndex(({ id }) => id === lesson.id);
  const isComplete = progress.completedLessonIds.includes(lesson.id);
  return <div className="shell">
    <aside className="sidebar" aria-label="Course navigation">
      <p className="brand">Grill Me</p>
      <p className="course-title">{course.title}</p>
      {course.modules.map((module) => <section key={module.id}>
        <h2>{module.title}</h2>
        <ol className="lesson-list">{module.lessons.map((item) => <li key={item.id}>
          <button
            className={`lesson-link ${item.id === lesson.id ? "current" : ""} ${progress.completedLessonIds.includes(item.id) ? "complete" : ""}`}
            aria-current={item.id === lesson.id ? "page" : undefined}
            onClick={() => sendCourse({ type: "GO_TO", lessonId: item.id })}
          >{item.title}</button>
        </li>)}</ol>
      </section>)}
    </aside>
    <main id="lesson" tabIndex={-1}>
      <p className="eyebrow">Lesson {currentIndex + 1} of {lessons.length}</p>
      <h1>{lesson.title}</h1>
      <p className="summary">{lesson.summary}</p>
      {blocks(lesson.blocks)}
      {lesson.activities.length > 0 && <section><h2>Practice</h2><ul>{lesson.activities.map((activity) => <li key={activity.id}>{activity.title}</li>)}</ul></section>}
      {courseState.matches("saving") && <p className="status" role="status">Saving progress…</p>}
      {courseState.matches("degraded") && <div className="status" role="alert">
        <p>{courseState.context.error?.message}</p>
        <div className="actions"><button className="primary" onClick={() => sendCourse({ type: "RETRY" })}>Retry save</button><button className="secondary" onClick={() => sendCourse({ type: "CONTINUE_OFFLINE" })}>Continue unsaved</button></div>
      </div>}
      <div className="actions">
        <button className="secondary" disabled={currentIndex === 0} onClick={() => sendCourse({ type: "PREVIOUS" })}>Previous</button>
        <button className="secondary" disabled={isComplete} onClick={() => sendCourse({ type: "COMPLETE" })}>{isComplete ? "Completed" : "Mark complete"}</button>
        <button className="primary" disabled={currentIndex === lessons.length - 1} onClick={() => sendCourse({ type: "NEXT" })}>Next lesson</button>
      </div>
      <footer><p>Course version {course.version} · App {appState.context.metadata?.version ?? "unknown"}</p>
        {navigationError && <p role="alert">{navigationError}</p>}
        {course.sources.map((source) => <p key={source.url}><button className="source-link" onClick={() => void openSource(source.url)}>Open source: {source.title}</button></p>)}
      </footer>
    </main>
  </div>;
}