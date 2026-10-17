import assert from "node:assert/strict";
import test from "node:test";
import { createActor, waitFor } from "xstate";
import { createServer } from "vite";

const server = await createServer({ configFile: false, root: "apps/desktop", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
const root = "/@fs/" + process.cwd();
const content = await server.ssrLoadModule(root + "/packages/content/src/index.ts");
const machines = await server.ssrLoadModule(root + "/packages/machines/src/index.ts");
const assessment = content.parseAssessment({
  schemaVersion: 1, id: "baseline", version: "1", courseId: "course", courseVersion: "1", title: "Baseline", description: "Description",
  skills: [{ id: "skill", title: "Skill", remediation: "Review it", reviewPrompt: "Recall it", reviewAnswer: "Expected answer" }],
  activities: [
    { id: "single", type: "single-choice", prompt: "Single", skillIds: ["skill"], rationale: "Why", choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }], correctOptionId: "b" },
    { id: "multiple", type: "multiple-choice", prompt: "Multiple", skillIds: ["skill"], rationale: "Why", choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }], correctOptionIds: ["a", "c"] },
    { id: "order", type: "ordering", prompt: "Order", skillIds: ["skill"], rationale: "Why", items: [{ id: "a", label: "A" }, { id: "b", label: "B" }], correctOrder: ["b", "a"] },
    { id: "text", type: "short-text", prompt: "Text", skillIds: ["skill"], rationale: "Why", requiredConcepts: [{ label: "bounded", terms: ["limit"] }, { label: "failure", terms: ["error"] }] },
  ],
});

const memoryPorts = ({ failWrites = false, failAppendOnce = false, start = "2026-10-16T00:00:00.000Z" } = {}) => {
  const values = new Map();
  let id = 0;
  let now = start;
  let shouldFailAppend = failAppendOnce;
  return {
    values,
    setNow: (value) => { now = value; },
    ports: {
      storage: {
        get: async (key) => values.get(key) ?? null,
        set: async (key, value) => { if (failWrites) throw new Error("failed"); values.set(key, value); },
        append: async (key, value) => {
          if (failWrites) throw new Error("failed");
          const current = values.get(key) ?? [];
          if (!current.some((item) => item.idempotencyKey === value.idempotencyKey)) values.set(key, [...current, value]);
          if (shouldFailAppend) { shouldFailAppend = false; throw new Error("partial failure"); }
        },
        remove: async (key) => { values.delete(key); },
      },
      telemetry: { record() {} }, clock: { now: () => now }, ids: { create: () => `id-${++id}` }, navigation: { openExternal: async () => {} },
    },
  };
};
test("grades all four response types deterministically", () => {
  assert.equal(machines.gradeAnswer(assessment.activities[0], "b"), true);
  assert.equal(machines.gradeAnswer(assessment.activities[1], ["c", "a"]), true);
  assert.equal(machines.gradeAnswer(assessment.activities[1], ["a"]), false);
  assert.equal(machines.gradeAnswer(assessment.activities[2], ["b", "a"]), true);
  assert.equal(machines.gradeAnswer(assessment.activities[3], "Use an attempt limit, then return an error."), true);
});

test("rejects invalid answer keys and unknown skills", () => {
  const source = structuredClone(assessment);
  source.activities[0].correctOptionId = "missing";
  assert.throws(() => content.parseAssessment(source));
  const unknown = structuredClone(assessment);
  unknown.activities[0].skillIds = ["missing"];
  assert.throws(() => content.parseAssessment(unknown));
});

test("assessment records append-only evidence, resumes, and creates skill gaps", async () => {
  const { ports, values } = memoryPorts();
  let actor = createActor(machines.createAssessmentSessionMachine(assessment, ports)).start();
  await waitFor(actor, (state) => state.matches("introduction"));
  actor.send({ type: "START" });
  actor.send({ type: "ANSWER", answer: "b" });
  actor.send({ type: "CONFIDENCE", value: 4 });
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (state) => state.matches("reviewing"));
  assert.equal(values.get("assessment-responses:baseline:1").length, 1);
  actor.stop();

  actor = createActor(machines.createAssessmentSessionMachine(assessment, ports)).start();
  const resumed = await waitFor(actor, (state) => state.matches("introduction"));
  assert.equal(resumed.context.currentIndex, 1);
  actor.send({ type: "START" });
  for (const answer of [["a"], ["a", "b"], "retry forever"]) {
    actor.send({ type: "ANSWER", answer });
    actor.send({ type: "SUBMIT" });
    await waitFor(actor, (state) => state.matches("reviewing"));
    actor.send({ type: "CONTINUE" });
    await waitFor(actor, (state) => state.matches("answering") || state.matches("graded"));
  }
  const graded = await waitFor(actor, (state) => state.matches("graded"));
  assert.equal(graded.context.gaps[0].weak, true);
  assert.equal(graded.context.schedule.items.length, 1);
  assert.equal(values.get("assessment-responses:baseline:1").length, 4);
  actor.stop();
});

test("assessment enters degraded state when evidence cannot save", async () => {
  const { ports } = memoryPorts({ failWrites: true });
  const actor = createActor(machines.createAssessmentSessionMachine(assessment, ports)).start();
  await waitFor(actor, (state) => state.matches("introduction"));
  actor.send({ type: "START" });
  actor.send({ type: "ANSWER", answer: "b" });
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (state) => state.matches("degraded"));
  actor.send({ type: "CONTINUE_OFFLINE" });
  const reviewing = await waitFor(actor, (state) => state.matches("reviewing"));
  assert.equal(reviewing.context.progress.responses.length, 1);
  actor.stop();
});
test("review rules use fixed intervals and remove after two strong recalls", () => {
  const item = machines.scheduleFromGaps(assessment, [{
    skillId: "skill", title: "Skill", correct: 0, total: 1, accuracy: 0,
    averageConfidence: 5, weak: true, remediation: "Review it",
  }], "2026-10-16T00:00:00.000Z").items[0];
  assert.equal(machines.rescheduleItem(item, 2, "2026-10-16T00:00:00.000Z").dueAt, "2026-10-17T00:00:00.000Z");
  assert.equal(machines.rescheduleItem(item, 3, "2026-10-16T00:00:00.000Z").dueAt, "2026-10-19T00:00:00.000Z");
  const strong = machines.rescheduleItem(item, 5, "2026-10-16T00:00:00.000Z");
  assert.equal(strong.dueAt, "2026-10-23T00:00:00.000Z");
  assert.equal(machines.rescheduleItem(strong, 4, "2026-10-23T00:00:00.000Z"), null);
});

test("review machine persists across restarts and removes after two strong recalls", async () => {
  const { ports, values, setNow } = memoryPorts();
  const schedule = machines.scheduleFromGaps(assessment, [{
    skillId: "skill", title: "Skill", correct: 0, total: 1, accuracy: 0,
    averageConfidence: 2, weak: true, remediation: "Review it",
  }], "2026-10-16T00:00:00.000Z");
  values.set("review-schedule:course:1", schedule);
  let actor = createActor(machines.createReviewSessionMachine("course", "1", ports)).start();
  await waitFor(actor, (state) => state.matches("selection"));
  actor.send({ type: "SELECT", skillId: "skill" });
  actor.send({ type: "REVEAL" });
  actor.send({ type: "ASSESS" });
  actor.send({ type: "RATE", confidence: 5 });
  let selection = await waitFor(actor, (state) => state.matches("selection"));
  assert.equal(selection.context.schedule.items[0].dueAt, "2026-10-23T00:00:00.000Z");
  assert.equal(values.get("review-events:course:1").length, 1);
  actor.stop();

  setNow("2026-10-23T00:00:00.000Z");
  actor = createActor(machines.createReviewSessionMachine("course", "1", ports)).start();
  await waitFor(actor, (state) => state.matches("selection"));
  actor.send({ type: "SELECT", skillId: "skill" });
  actor.send({ type: "REVEAL" });
  actor.send({ type: "ASSESS" });
  actor.send({ type: "RATE", confidence: 4 });
  const complete = await waitFor(actor, (state) => state.matches("complete"));
  assert.equal(complete.context.schedule.items.length, 0);
  assert.equal(values.get("review-events:course:1").length, 2);
  actor.stop();
});

test("rejects malformed persisted progress and forged answers safely", async () => {
  const { ports, values } = memoryPorts();
  values.set("assessment-progress:baseline:1", { schemaVersion: 1, responses: "corrupt" });
  const actor = createActor(machines.createAssessmentSessionMachine(assessment, ports)).start();
  const intro = await waitFor(actor, (state) => state.matches("introduction"));
  assert.equal(intro.context.progress.responses.length, 0);
  actor.send({ type: "START" });
  actor.send({ type: "CONFIDENCE", value: 9 });
  assert.equal(actor.getSnapshot().context.confidence, 3);
  actor.send({ type: "ANSWER", answer: "missing-choice" });
  actor.send({ type: "SUBMIT" });
  assert.equal(actor.getSnapshot().matches("answering"), true);
  actor.stop();
});

test("response retry does not duplicate evidence after a partial write", async () => {
  const { ports, values } = memoryPorts({ failAppendOnce: true });
  const actor = createActor(machines.createAssessmentSessionMachine(assessment, ports)).start();
  await waitFor(actor, (state) => state.matches("introduction"));
  actor.send({ type: "START" });
  actor.send({ type: "ANSWER", answer: "b" });
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (state) => state.matches("degraded"));
  actor.send({ type: "RETRY" });
  await waitFor(actor, (state) => state.matches("reviewing"));
  assert.equal(values.get("assessment-responses:baseline:1").length, 1);
  actor.stop();
});

test("clean assessment creates no review items", () => {
  const responses = assessment.activities.map((activity, index) => ({
    schemaVersion: 1, type: "assessment.responded", id: `r${index}`, idempotencyKey: `r${index}`,
    assessmentId: assessment.id, assessmentVersion: assessment.version, activityId: activity.id,
    skillIds: activity.skillIds, answer: "", confidence: 5, elapsedMs: 1, attemptNumber: 1,
    correct: true, occurredAt: "2026-10-16T00:00:00.000Z",
  }));
  const gaps = machines.deriveSkillGaps(assessment, responses);
  assert.equal(machines.scheduleFromGaps(assessment, gaps, "2026-10-16T00:00:00.000Z").items.length, 0);
});

test("review rejects future items and malformed schedules", async () => {
  const { ports, values } = memoryPorts();
  values.set("review-schedule:course:1", { schemaVersion: 1, courseId: "course", courseVersion: "1", items: "corrupt" });
  let actor = createActor(machines.createReviewSessionMachine("course", "1", ports)).start();
  await waitFor(actor, (state) => state.matches("complete"));
  actor.stop();

  const schedule = machines.scheduleFromGaps(assessment, [{
    skillId: "skill", title: "Skill", correct: 0, total: 1, accuracy: 0,
    averageConfidence: 1, weak: true, remediation: "Review it",
  }], "2026-10-16T00:00:00.000Z");
  schedule.items[0].dueAt = "2026-10-17T00:00:00.000Z";
  values.set("review-schedule:course:1", schedule);
  actor = createActor(machines.createReviewSessionMachine("course", "1", ports)).start();
  await waitFor(actor, (state) => state.matches("selection"));
  actor.send({ type: "SELECT", skillId: "skill" });
  assert.equal(actor.getSnapshot().matches("selection"), true);
  actor.stop();
});

test.after(() => server.close());