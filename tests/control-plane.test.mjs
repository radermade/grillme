import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

const server = await createServer({ configFile: false, root: ".", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
const root = "/@fs/" + process.cwd();
const { createEvaluationHttpHandler, createEvaluationService, EvaluationServiceError } = await server.ssrLoadModule(root + "/apps/control-plane/src/index.ts");
const { evaluateDeterministically } = await server.ssrLoadModule(root + "/packages/evaluation/src/index.ts");

const prompt = {
  id: "prompt", skillId: "skill", question: "Explain", reason: "Reason", hint: "Hint",
  rubric: { id: "rubric", version: "1", concepts: [
    { id: "schema", label: "Schema", terms: ["schema"], remediation: "Use schema", probe: "Why schema?" },
    { id: "safety", label: "Safety", terms: ["safety"], remediation: "Use safety", probe: "Why safety?" },
  ], misconceptions: [] },
};
const envelope = {
  authorization: "Bearer valid-token", requestId: "request-1",
  request: { schemaVersion: 1, sessionId: "session", turnId: "turn", promptId: "prompt", rubricId: "rubric", rubricVersion: "1", response: "Use schema and safety checks.", confidence: 4 },
};

const validProviderResult = () => ({
  ...evaluateDeterministically(prompt.rubric, envelope.request.response, "provider"),
  evaluatorVersion: "1",
  modelVersion: "model-1",
});

const harness = ({ authenticated = true, quota = true, provider, timeoutMs = 30 } = {}) => {
  const audits = [];
  const calls = { provider: 0, reserve: 0, commit: 0, release: 0 };
  const deps = {
    auth: { authenticate: async () => authenticated ? { userId: "user-1" } : null },
    quota: {
      reserve: async () => { calls.reserve += 1; return quota; },
      commit: async () => { calls.commit += 1; },
      release: async () => { calls.release += 1; },
    },
    rubrics: { findPrompt: async ({ promptId, rubricId, rubricVersion }) =>
      promptId === prompt.id && rubricId === prompt.rubric.id && rubricVersion === prompt.rubric.version ? prompt : null },
    provider: {
      id: "provider", version: "1", modelVersion: "model-1",
      evaluate: async (...args) => { calls.provider += 1; return provider ? provider(...args) : validProviderResult(); },
    },
    audit: { record: async (event) => { audits.push(event); } },
    clock: { nowMs: (() => { let now = 100; return () => ++now; })() },
    timeoutMs,
    maxAttempts: 2,
    maxCostUnits: 1,
    maxResponseLength: 5_000,
  };
  return { service: createEvaluationService(deps), audits, calls };
};
test("rejects unauthorized requests before quota or provider use", async () => {
  const { service, audits, calls } = harness({ authenticated: false });
  await assert.rejects(() => service.evaluate(envelope), (error) =>
    error instanceof EvaluationServiceError && error.code === "UNAUTHORIZED");
  assert.equal(calls.reserve, 0);
  assert.equal(calls.provider, 0);
  assert.equal(audits[0].outcome, "unauthorized");
});

test("rejects quota exhaustion before provider use", async () => {
  const { service, audits, calls } = harness({ quota: false });
  await assert.rejects(() => service.evaluate(envelope), (error) =>
    error instanceof EvaluationServiceError && error.code === "QUOTA_EXCEEDED");
  assert.equal(calls.provider, 0);
  assert.equal(audits[0].outcome, "quota-rejected");
});

test("accepts validated provider output and audits metadata only", async () => {
  const { service, audits, calls } = harness();
  const response = await service.evaluate(envelope);
  assert.equal(response.fallbackUsed, false);
  assert.equal(response.result.modelVersion, "model-1");
  assert.equal(calls.commit, 1);
  assert.equal(audits[0].outcome, "provider");
  assert.equal(JSON.stringify(audits[0]).includes(envelope.request.response), false);
  assert.equal(JSON.stringify(audits[0]).includes(envelope.authorization), false);
});

test("retries malformed output and falls back deterministically", async () => {
  const { service, audits, calls } = harness({ provider: async () => ({ malformed: true }) });
  const response = await service.evaluate(envelope);
  assert.equal(calls.provider, 2);
  assert.equal(response.fallbackUsed, true);
  assert.equal(response.result.evaluatorId, "deterministic-server-fallback");
  assert.equal(audits[0].outcome, "fallback");
});

test("hard timeout falls back when provider ignores cancellation", async () => {
  const { service, calls } = harness({ provider: async () => new Promise(() => {}), timeoutMs: 5 });
  const response = await service.evaluate(envelope);
  assert.equal(response.fallbackUsed, true);
  assert.equal(calls.provider, 2);
});

test("rejects credential patterns before auth, quota, and provider calls", async () => {
  const { service, calls } = harness();
  const unsafe = structuredClone(envelope);
  unsafe.request.response = "aws_secret_access_key=supersecretvalue";
  await assert.rejects(() => service.evaluate(unsafe), (error) =>
    error instanceof EvaluationServiceError && error.code === "INVALID_REQUEST");
  assert.equal(calls.reserve, 0);
  assert.equal(calls.provider, 0);
});

test("rejects valid-shaped output with incorrect provider provenance", async () => {
  const { service, calls } = harness({ provider: async () => ({ ...validProviderResult(), modelVersion: "other-model" }) });
  const response = await service.evaluate(envelope);
  assert.equal(calls.provider, 2);
  assert.equal(response.fallbackUsed, true);
});

test("releases quota when provider reports more cost than reserved", async () => {
  const { service, calls } = harness({ provider: async () => ({ ...validProviderResult(), costUnits: 2 }) });
  await assert.rejects(() => service.evaluate(envelope));
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
});

test("HTTP boundary takes authorization from headers and sanitizes errors", async () => {
  const { service } = harness();
  const handler = createEvaluationHttpHandler(service);
  const request = {
    method: "POST",
    headers: { get: (name) => name === "authorization" ? envelope.authorization : name === "content-type" ? "application/json" : null },
    json: async () => ({ requestId: envelope.requestId, request: envelope.request }),
  };
  const success = await handler(request);
  assert.equal(success.status, 200);
  const denied = await createEvaluationHttpHandler(harness({ authenticated: false }).service)(request);
  assert.deepEqual(denied, { status: 401, body: { error: "UNAUTHORIZED" } });
  const invalid = await handler({ ...request, json: async () => { throw new Error("raw parser detail"); } });
  assert.deepEqual(invalid, { status: 400, body: { error: "INVALID_JSON" } });
});

test.after(() => server.close());