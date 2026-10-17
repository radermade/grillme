import assert from "node:assert/strict";
import { createServer } from "vite";
import { createActor } from "xstate";

const server = await createServer({ root: "prototypes/learning-loop/web", server: { middlewareMode: true } });

try {
  const { prototypeMachine } = await server.ssrLoadModule("/src/machine.ts");
  const actor = createActor(prototypeMachine).start();
  actor.send({ type: "NEXT" });
  actor.send({ type: "ANSWER", key: "baseline", value: "Parsing needs schema validation and bounded retries." });
  actor.send({ type: "NEXT" });
  actor.send({ type: "NEXT" });
  actor.send({ type: "ANSWER", key: "grillOne", value: "Parsing JSON does not validate field types or schema." });
  actor.send({ type: "ANSWER", key: "grillTwo", value: "Use maximum attempts, then return a terminal error." });
  actor.send({ type: "NEXT" });
  actor.send({ type: "ANSWER", key: "scenario", value: "Choose option B because latency, cost, and safety matter; revise if requirements change." });
  actor.send({ type: "NEXT" });

  for (const command of [
    "set max-attempts 2", "set schema strict", "set safety block",
    "set telemetry sanitized", "check",
  ]) actor.send({ type: "LAB_COMMAND", command });

  assert.equal(actor.getSnapshot().matches({ active: { implementing: "success" } }), true);
  actor.send({ type: "NEXT" });
  actor.send({ type: "ANSWER", key: "validation", value: "Deterministic checks passed schema, safety, retries, and sanitized telemetry." });
  actor.send({ type: "NEXT" });
  actor.send({ type: "ANSWER", key: "reflection", value: "Validate untrusted output with deterministic policy, bounded retries, metrics, latency and cost monitoring." });
  actor.send({ type: "NEXT" });
  assert.equal(actor.getSnapshot().matches({ active: "review" }), true);
  assert.ok(actor.getSnapshot().context.evaluation);

  for (const [key, value] of [
    ["miniLabImprovedUnderstanding", true],
    ["wouldChooseDeeperLab", true],
    ["severeUnresolvedIssue", false],
  ]) actor.send({ type: "LEARNER_FEEDBACK", key, value });
  actor.send({ type: "NEXT" });
  assert.equal(actor.getSnapshot().matches({ active: "complete" }), true);
  actor.stop();
  console.log("Solo learning-loop smoke check passed.");
} finally {
  await server.close();
}