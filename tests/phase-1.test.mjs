import assert from "node:assert/strict";
import test from "node:test";
import { createActor, waitFor } from "xstate";
import { createServer } from "vite";

const server = await createServer({ configFile: false, root: "apps/desktop", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
const root = "/@fs/" + process.cwd();
const { parseCourse } = await server.ssrLoadModule(root + "/packages/content/src/index.ts");
const { createCourseSessionMachine } = await server.ssrLoadModule(root + "/packages/machines/src/course-session.ts");
const { createAppMachine } = await server.ssrLoadModule(root + "/packages/machines/src/app.ts");
const course = { schemaVersion: 1, id: "sample", version: "1", title: "Sample", description: "Description", locale: "en-US", sources: [], modules: [{ id: "module", title: "Module", lessons: ["one", "two"].map((id) => ({ id, title: id, summary: id, blocks: [{ type: "text", body: id }], activities: [] })) }] };

const memoryPorts = (failWrites = false) => {
  const values = new Map();
  return { values, ports: {
    storage: {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { if (failWrites) throw new Error("write failed"); values.set(key, value); },
      append: async (key, value) => { if (failWrites) throw new Error("write failed"); values.set(key, [...(values.get(key) ?? []), value]); },
      remove: async (key) => { values.delete(key); },
    },
    telemetry: { record() {} }, clock: { now: () => "2026-10-16T00:00:00.000Z" }, ids: { create: () => "event-1" },
    navigation: { openExternal: async () => {} },
  } };
};

test("validates portable course content and rejects unsafe blocks", () => {
  assert.equal(parseCourse(course).modules[0].lessons[0].id, "one");
  assert.throws(() => parseCourse({ ...course, modules: [{ ...course.modules[0], lessons: [{ ...course.modules[0].lessons[0], blocks: [{ type: "html", body: "<script>" }] }] }] }));
});

test("navigates, persists completion evidence, and resumes", async () => {
  const { ports, values } = memoryPorts();
  let actor = createActor(createCourseSessionMachine(course, ports)).start();
  await waitFor(actor, (state) => state.matches("reading"));
  actor.send({ type: "COMPLETE" });
  await waitFor(actor, (state) => state.matches("reading") && state.context.progress?.completedLessonIds.includes("one"));
  assert.equal(values.get("learning-events:sample:1")[0].type, "lesson.completed");
  actor.send({ type: "NEXT" });
  await waitFor(actor, (state) => state.matches("reading") && state.context.progress?.currentLessonId === "two");
  actor.stop();
  actor = createActor(createCourseSessionMachine(course, ports)).start();
  const resumed = await waitFor(actor, (state) => state.matches("reading"));
  assert.equal(resumed.context.progress.currentLessonId, "two");
  actor.stop();
});

test("enters degraded state on save failure and can continue unsaved", async () => {
  const { ports } = memoryPorts(true);
  const actor = createActor(createCourseSessionMachine(course, ports)).start();
  await waitFor(actor, (state) => state.matches("reading"));
  actor.send({ type: "NEXT" });
  await waitFor(actor, (state) => state.matches("degraded"));
  actor.send({ type: "CONTINUE_OFFLINE" });
  const continued = await waitFor(actor, (state) => state.matches("reading"));
  assert.equal(continued.context.progress.currentLessonId, "two");
  actor.stop();
});

test("invalid course content enters a sanitized failure state", async () => {
  const { ports } = memoryPorts();
  const actor = createActor(createCourseSessionMachine({ schemaVersion: 1 }, ports)).start();
  const failed = await waitFor(actor, (state) => state.matches("failed"));
  assert.deepEqual(failed.context.error, {
    code: "CONTENT_INVALID",
    message: "This course could not be opened safely.",
  });
  actor.stop();
});

test("bootstrap failure is sanitized and retryable", async () => {
  let attempts = 0;
  const machine = createAppMachine({
    loadMetadata: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("sensitive startup details");
      return { version: "1.0.0" };
    },
    updates: { check: async () => ({ available: false }) },
  });
  const actor = createActor(machine).start();
  const failed = await waitFor(actor, (state) => state.matches("failed"));
  assert.equal(failed.context.error, "The application could not finish starting.");
  actor.send({ type: "RETRY" });
  const ready = await waitFor(actor, (state) => state.matches("ready"));
  assert.equal(ready.context.metadata.version, "1.0.0");
  actor.stop();
});

test.after(() => server.close());