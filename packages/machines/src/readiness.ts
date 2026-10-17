import { assign, fromPromise, setup } from "xstate";
import { parseReadinessEvidence, parseReadinessRules } from "@grillme/content";
import { deriveReadiness } from "@grillme/evaluation";
import type { ReadinessRuleSet, ReadinessSummary } from "@grillme/domain";
import type { ClockPort, ReadinessEvidencePort } from "@grillme/platform";

type Context = { courseId: string; courseVersion: string; skillIds: string[]; rules: ReadinessRuleSet; summary: ReadinessSummary | null; error: string | null };
type Event = { type: "REFRESH" } | { type: "CHANGE_RULES"; rules: unknown } | { type: "RETRY" };
type Done = { output: ReadinessSummary };
export const createReadinessMachine = (courseId: string, courseVersion: string, skillIds: string[], ruleSource: unknown, evidence: ReadinessEvidencePort, clock: ClockPort) => {
  const initialRules = parseReadinessRules(ruleSource);
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: { calculate: fromPromise<ReadinessSummary, { rules: ReadinessRuleSet }>(async ({ input }) => deriveReadiness(courseId, courseVersion, skillIds, parseReadinessEvidence(await evidence.load()), input.rules, clock.now())) },
    guards: { validRules: ({ event }) => event.type === "CHANGE_RULES" && (() => { try { parseReadinessRules(event.rules); return true; } catch { return false; } })() },
    actions: {
      setRules: assign(({ event }) => event.type === "CHANGE_RULES" ? { rules: parseReadinessRules(event.rules) } : {}),
      calculated: assign(({ event }) => ({ summary: (event as unknown as Done).output, error: null })),
      failed: assign({ error: () => "Readiness evidence could not be loaded." }),
    },
  }).createMachine({
    id: "readiness",
    initial: "loading",
    context: { courseId, courseVersion, skillIds, rules: initialRules, summary: null, error: null },
    states: {
      loading: { invoke: { src: "calculate", input: ({ context }) => ({ rules: context.rules }), onDone: { target: "ready", actions: "calculated" }, onError: { target: "failed", actions: "failed" } } },
      ready: { on: { REFRESH: "loading", CHANGE_RULES: { target: "loading", guard: "validRules", actions: "setRules" } } },
      failed: { on: { RETRY: "loading" } },
    },
  });
};
