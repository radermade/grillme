import assert from "node:assert/strict";
import test from "node:test";
import { createActor, waitFor } from "xstate";
import { createServer } from "vite";

const server = await createServer({ configFile: false, root: "apps/desktop", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
const root = "/@fs/" + process.cwd();
const content = await server.ssrLoadModule(root + "/packages/content/src/index.ts");
const evaluation = await server.ssrLoadModule(root + "/packages/evaluation/src/index.ts");
const machines = await server.ssrLoadModule(root + "/packages/machines/src/index.ts");

const architecture = content.parseScenario({
  schemaVersion: 1, id: "architecture", version: "1", courseId: "course", courseVersion: "1",
  kind: "architecture", title: "Architecture", description: "Description", skillIds: ["skill"],
  availableComponents: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "bad", label: "Bad" }],
  availableSettings: [{ id: "mode", label: "Mode", options: ["unsafe", "safe"] }], resources: [],
  initialWorkspace: { selectedComponents: ["a"], connections: [], settings: { mode: "unsafe" }, diagnosis: "" },
  checkpoints: [{ id: "build", title: "Build", objective: "Build safely", instruction: "Add B and connect A to B.", rationale: "Safe flow", hints: ["Add B", "Connect A to B"], checks: [
    { id: "has-b", type: "component-selected", componentId: "b", message: "Add B" },
    { id: "no-bad", type: "component-absent", componentId: "bad", message: "Remove Bad" },
    { id: "a-b", type: "connection", from: "a", to: "b", message: "Connect A to B" },
    { id: "safe", type: "setting", settingId: "mode", value: "safe", message: "Use safe mode" },
  ] }],
  debrief: { rootCause: "Unsafe flow", prevention: "Validate it", explanation: "Outcome checks" },
});
const debugging = content.parseScenario({
  schemaVersion: 1, id: "debugging", version: "1", courseId: "course", courseVersion: "1",
  kind: "debugging", title: "Debug", description: "Description", skillIds: ["skill"], availableComponents: [],
  availableSettings: [{ id: "attempts", label: "Attempts", options: ["unlimited", "2"] }],
  resources: [{ id: "logs", type: "log", title: "Logs", body: "timeout retrying" }],
  initialWorkspace: { selectedComponents: [], connections: [], settings: { attempts: "unlimited" }, diagnosis: "" },
  checkpoints: [{ id: "repair", title: "Repair", objective: "Repair retries", instruction: "Bound retries", rationale: "Reliability", hints: ["No limit"], checks: [
    { id: "bounded", type: "setting", settingId: "attempts", value: "2", message: "Bound attempts" },
    { id: "diagnosis", type: "diagnosis-concepts", concepts: [["unbounded", "no limit"], ["timeout"]], message: "Explain both risks" },
  ] }], debrief: { rootCause: "No limit", prevention: "Bound retries", explanation: "No code runs" },
});

const memoryPorts = (failWrites = false) => {
  const values = new Map(); let id = 0;
  return { values, ports: { storage: {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => { if (failWrites) throw new Error("failed"); values.set(key, value); },
    append: async (key, value) => { if (failWrites) throw new Error("failed"); const current = values.get(key) ?? []; if (!current.some((item) => item.idempotencyKey === value.idempotencyKey)) values.set(key, [...current, value]); },
    remove: async (key) => { values.delete(key); },
  }, telemetry: { record() {} }, clock: { now: () => "2026-10-16T00:00:00.000Z" }, ids: { create: () => `id-${++id}` }, navigation: { openExternal: async () => {} } } };
};

const openScenario = async (actor, scenarioId, mode) => {
  actor.send({ type: "SELECT_SCENARIO", scenarioId });
  actor.send({ type: "SELECT_MODE", mode });
  await waitFor(actor, (state) => state.matches("briefing"));
  actor.send({ type: "START" });
  await waitFor(actor, (state) => state.matches(mode === "walkthrough" ? "demonstrating" : "working"));
  if (mode === "walkthrough") actor.send({ type: "CONTINUE" });
};
test("schema rejects unknown component and invalid setting references", () => {
  const unknown = structuredClone(architecture);
  unknown.checkpoints[0].checks[0].componentId = "missing";
  assert.throws(() => content.parseScenario(unknown));
  const invalid = structuredClone(architecture);
  invalid.checkpoints[0].checks[3].value = "missing";
  assert.throws(() => content.parseScenario(invalid));
});

test("validator covers component, absence, connection, setting, and diagnosis checks", () => {
  const result = evaluation.validateScenarioWorkspace(architecture.checkpoints[0].checks, {
    selectedComponents: ["a", "b"], connections: [{ from: "a", to: "b" }], settings: { mode: "safe" }, diagnosis: "",
  });
  assert.equal(result.passed, true);
  const diagnosis = evaluation.validateScenarioWorkspace(debugging.checkpoints[0].checks, {
    selectedComponents: [], connections: [], settings: { attempts: "2" }, diagnosis: "An unbounded retry has no limit during timeout failures.",
  });
  assert.equal(diagnosis.passed, true);
});

test("walkthrough, practice, and challenge share validation but differ in guidance", async () => {
  for (const mode of ["walkthrough", "practice", "challenge"]) {
    const { ports } = memoryPorts();
    const actor = createActor(machines.createScenarioSessionMachine([architecture], ports)).start();
    await openScenario(actor, "architecture", mode);
    assert.equal(actor.getSnapshot().matches("working"), true);
    actor.send({ type: "SHOW_HINT" });
    assert.equal(actor.getSnapshot().context.progress.hintLevel, mode === "practice" ? 1 : 0);
    actor.stop();
  }
});

test("failed validation persists evidence, supports reset, and later passes", async () => {
  const { ports, values } = memoryPorts();
  const actor = createActor(machines.createScenarioSessionMachine([architecture], ports)).start();
  await openScenario(actor, "architecture", "practice");
  actor.send({ type: "SHOW_HINT" });
  actor.send({ type: "VALIDATE" });
  await waitFor(actor, (state) => state.matches("failedCheckpoint"));
  assert.equal(values.get("scenario-events:architecture:1")[0].passed, false);
  actor.send({ type: "RESET_CHECKPOINT" });
  assert.deepEqual(actor.getSnapshot().context.progress.workspace.selectedComponents, ["a"]);
  actor.send({ type: "TOGGLE_COMPONENT", componentId: "b" });
  actor.send({ type: "CONNECT", from: "a", to: "b" });
  actor.send({ type: "SET_SETTING", settingId: "mode", value: "safe" });
  actor.send({ type: "VALIDATE" });
  await waitFor(actor, (state) => state.matches("passedCheckpoint"));
  assert.equal(values.get("scenario-events:architecture:1").length, 2);
  assert.deepEqual(values.get("scenario-events:architecture:1").map(({ passed }) => passed), [false, true]);
  actor.stop();
});
test("debugging workspace validates settings and diagnosis without executing fixture code", async () => {
  const { ports } = memoryPorts();
  const actor = createActor(machines.createScenarioSessionMachine([debugging], ports)).start();
  await openScenario(actor, "debugging", "challenge");
  actor.send({ type: "SET_SETTING", settingId: "attempts", value: "2" });
  actor.send({ type: "SET_DIAGNOSIS", value: "The timeout repeats because retries are unbounded with no limit." });
  actor.send({ type: "VALIDATE" });
  await waitFor(actor, (state) => state.matches("passedCheckpoint"));
  actor.send({ type: "CONTINUE" });
  await waitFor(actor, (state) => state.matches("debriefing"));
  actor.send({ type: "CONTINUE" });
  assert.equal(actor.getSnapshot().matches("complete"), true);
  actor.stop();
});

test("progress resumes by scenario and mode", async () => {
  const { ports } = memoryPorts();
  let actor = createActor(machines.createScenarioSessionMachine([architecture], ports)).start();
  await openScenario(actor, "architecture", "practice");
  actor.send({ type: "TOGGLE_COMPONENT", componentId: "b" });
  actor.send({ type: "VALIDATE" });
  await waitFor(actor, (state) => state.matches("failedCheckpoint"));
  actor.stop();
  actor = createActor(machines.createScenarioSessionMachine([architecture], ports)).start();
  await openScenario(actor, "architecture", "practice");
  assert.equal(actor.getSnapshot().context.progress.workspace.selectedComponents.includes("b"), true);
  assert.equal(actor.getSnapshot().context.progress.attempts, 1);
  actor.stop();
});

test("save failure enters degraded state and can continue unsaved", async () => {
  const { ports } = memoryPorts(true);
  const actor = createActor(machines.createScenarioSessionMachine([debugging], ports)).start();
  await openScenario(actor, "debugging", "practice");
  actor.send({ type: "VALIDATE" });
  await waitFor(actor, (state) => state.matches("degraded"));
  actor.send({ type: "CONTINUE_OFFLINE" });
  await waitFor(actor, (state) => state.matches("failedCheckpoint"));
  actor.stop();
});

test("forged operations and malformed persisted progress are ignored safely", async () => {
  const { ports, values } = memoryPorts();
  values.set("scenario-progress:architecture:1:challenge", { schemaVersion: 1, workspace: "corrupt" });
  const actor = createActor(machines.createScenarioSessionMachine([architecture], ports)).start();
  await openScenario(actor, "architecture", "challenge");
  actor.send({ type: "TOGGLE_COMPONENT", componentId: "missing" });
  actor.send({ type: "SET_SETTING", settingId: "mode", value: "missing" });
  actor.send({ type: "CONNECT", from: "a", to: "missing" });
  const workspace = actor.getSnapshot().context.progress.workspace;
  assert.deepEqual(workspace.selectedComponents, ["a"]);
  assert.equal(workspace.settings.mode, "unsafe");
  assert.equal(workspace.connections.length, 0);
  actor.stop();
});

test.after(() => server.close());