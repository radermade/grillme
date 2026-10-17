import assert from "node:assert/strict";
import test from "node:test";
import { createActor, waitFor } from "xstate";
import { createServer } from "vite";

const server = await createServer({ configFile: false, root: "apps/desktop", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
const root = "/@fs/" + process.cwd();
const content = await server.ssrLoadModule(root + "/packages/content/src/index.ts");
const machines = await server.ssrLoadModule(root + "/packages/machines/src/index.ts");

const grill = content.parseGrill({
  schemaVersion: 1, id: "grill", version: "1", courseId: "course", courseVersion: "1",
  title: "Grill", description: "Description", maxTurns: 2, maxEvaluationAttempts: 2, evaluationBudget: 2,
  prompts: [{
    id: "prompt-one", skillId: "skill-one", question: "Explain validation", reason: "Baseline", hint: "Think schema",
    rubric: { id: "rubric-one", version: "1", concepts: [
      { id: "schema", label: "Schema", terms: ["schema"], remediation: "Use schema validation", probe: "Why schema?" },
      { id: "safety", label: "Safety", terms: ["safety"], remediation: "Use safety policy", probe: "What about safety?" },
    ], misconceptions: [{ id: "parse-only", label: "Parsing is enough", terms: ["parse is enough"], correction: "Parsing is not validation.", probe: "What remains after parsing?" }] },
  }, {
    id: "prompt-two", skillId: "skill-two", question: "Explain retries", reason: "Next skill", hint: "Think limits",
    rubric: { id: "rubric-two", version: "1", concepts: [
      { id: "bounded", label: "Bounded", terms: ["bounded"], remediation: "Bound retries", probe: "How are retries bounded?" },
    ], misconceptions: [] },
  }],
});

const memoryPorts = () => {
  const values = new Map();
  let id = 0;
  return { values, ports: {
    storage: {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => { values.set(key, value); },
      append: async (key, value) => { const current = values.get(key) ?? []; if (!current.some((item) => item.idempotencyKey === value.idempotencyKey)) values.set(key, [...current, value]); },
      remove: async (key) => { values.delete(key); },
    },
    telemetry: { record() {} }, clock: { now: () => "2026-10-16T00:00:00.000Z" },
    ids: { create: () => `id-${++id}` }, navigation: { openExternal: async () => {} },
  } };
};

const startComposing = async (actor) => {
  await waitFor(actor, (state) => state.matches("introduction"));
  actor.send({ type: "START" });
  await waitFor(actor, (state) => state.matches("composing"));
};
test("validates rubrics and rejects duplicate prompt IDs", () => {
  assert.equal(grill.prompts.length, 2);
  const duplicate = structuredClone(grill);
  duplicate.prompts[1].id = duplicate.prompts[0].id;
  assert.throws(() => content.parseGrill(duplicate));
});

test("deterministic evaluator links evidence and adaptive follow-up reasons", () => {
  const result = machines.evaluateDeterministically(grill.prompts[0].rubric, "Use schema validation.");
  assert.deepEqual(result.coveredConceptIds, ["schema"]);
  assert.deepEqual(result.missingConceptIds, ["safety"]);
  assert.equal(result.evidence[0].excerpt.includes("schema"), true);
  assert.equal(result.followUp.reason.includes("Safety"), true);
});

test("blocks common secrets before evaluation", async () => {
  const { ports } = memoryPorts();
  let calls = 0;
  const actor = createActor(machines.createGrillSessionMachine(grill, ports, {
    evaluate: async () => { calls += 1; return {}; },
  })).start();
  await startComposing(actor);
  actor.send({ type: "RESPOND", response: "aws_secret_access_key=supersecretvalue" });
  actor.send({ type: "SUBMIT" });
  assert.equal(actor.getSnapshot().matches("composing"), true);
  assert.equal(calls, 0);
  actor.stop();
});

test("rejects malformed provider output twice and uses deterministic fallback", async () => {
  const { ports, values } = memoryPorts();
  let calls = 0;
  const actor = createActor(machines.createGrillSessionMachine(grill, ports, {
    evaluate: async () => { calls += 1; return { malformed: true }; },
  }, 50)).start();
  await startComposing(actor);
  actor.send({ type: "RESPOND", response: "Use schema validation and safety policy." });
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (state) => state.matches("fallback"));
  assert.equal(calls, 2);
  actor.send({ type: "USE_FALLBACK" });
  const feedback = await waitFor(actor, (state) => state.matches("feedback"));
  assert.equal(feedback.context.currentEvaluation.evaluatorId, "deterministic-fallback");
  assert.equal(values.get("grill-events:grill:1").length, 1);
  actor.stop();
});

test("timeout reaches fallback even when provider ignores cancellation", async () => {
  const { ports } = memoryPorts();
  const actor = createActor(machines.createGrillSessionMachine(grill, ports, {
    evaluate: async () => new Promise(() => {}),
  }, 5)).start();
  await startComposing(actor);
  actor.send({ type: "RESPOND", response: "Use schema validation." });
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (state) => state.matches("fallback"), { timeout: 500 });
  actor.stop();
});
test("multi-turn session shows follow-up reason, preserves evidence, and creates review", async () => {
  const { ports, values } = memoryPorts();
  const evaluator = machines.createDeterministicEvaluationPort((id) => grill.prompts.find((prompt) => prompt.id === id));
  let actor = createActor(machines.createGrillSessionMachine(grill, ports, evaluator)).start();
  await startComposing(actor);
  actor.send({ type: "RESPOND", response: "Use schema validation." });
  actor.send({ type: "CONFIDENCE", value: 4 });
  actor.send({ type: "SUBMIT" });
  let feedback = await waitFor(actor, (state) => state.matches("feedback"));
  assert.equal(feedback.context.currentEvaluation.followUp.reason.includes("Safety"), true);
  actor.send({ type: "CHALLENGE_FEEDBACK" });
  await waitFor(actor, (state) => state.matches("feedback"));
  assert.equal(values.get("grill-challenges:grill:1").length, 1);
  actor.send({ type: "CONTINUE" });
  let composing = await waitFor(actor, (state) => state.matches("composing"));
  assert.equal(composing.context.reason.includes("Safety"), true);
  actor.send({ type: "RESPOND", response: "Apply safety guardrails and authorization policy." });
  actor.send({ type: "SUBMIT" });
  feedback = await waitFor(actor, (state) => state.matches("feedback"));
  assert.equal(feedback.context.progress.turns.length, 2);
  actor.stop();

  actor = createActor(machines.createGrillSessionMachine(grill, ports, evaluator)).start();
  const resumed = await waitFor(actor, (state) => state.matches("introduction"));
  assert.equal(resumed.context.progress.turns.length, 2);
  actor.send({ type: "START" });
  await waitFor(actor, (state) => state.matches("composing"));
  actor.send({ type: "END_EARLY" });
  const complete = await waitFor(actor, (state) => state.matches("complete"));
  assert.equal(complete.context.summary.turnsCompleted, 2);
  assert.ok(values.get("review-schedule:course:1").items.length > 0);
  actor.stop();
});

test("evaluation budget ends the session coherently", async () => {
  const oneUnit = { ...grill, evaluationBudget: 1, maxTurns: 3 };
  const { ports } = memoryPorts();
  const evaluator = machines.createDeterministicEvaluationPort((id) => oneUnit.prompts.find((prompt) => prompt.id === id));
  const actor = createActor(machines.createGrillSessionMachine(oneUnit, ports, evaluator)).start();
  await startComposing(actor);
  actor.send({ type: "RESPOND", response: "Use schema and safety controls." });
  actor.send({ type: "SUBMIT" });
  await waitFor(actor, (state) => state.matches("feedback"));
  actor.send({ type: "CONTINUE" });
  await waitFor(actor, (state) => state.matches("budgetExhausted"));
  actor.send({ type: "CONTINUE" });
  const complete = await waitFor(actor, (state) => state.matches("complete"));
  assert.equal(complete.context.summary.budgetUsed, 1);
  actor.stop();
});

test.after(() => server.close());