import { containsPotentialSecret, evaluateDeterministically } from "@grillme/evaluation";
import type { EvaluationResult, GrillPrompt } from "@grillme/domain";
import {
  EvaluationServiceError,
  type EvaluationEnvelope,
  type EvaluationResponse,
  type EvaluationServiceDependencies,
} from "./contracts";
import { parseEvaluationEnvelope, validateProviderResult } from "./schema";

const withTimeout = async <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => controller.signal.addEventListener(
        "abort",
        () => reject(new Error("Provider timed out.")),
        { once: true },
      )),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const providerEvaluate = async (
  envelope: EvaluationEnvelope,
  prompt: GrillPrompt,
  deps: EvaluationServiceDependencies,
): Promise<{ result: EvaluationResult | null; attempts: number }> => {
  for (let attempt = 1; attempt <= deps.maxAttempts; attempt += 1) {
    try {
      const raw = await withTimeout(
        (signal) => deps.provider.evaluate({ request: envelope.request, prompt }, signal),
        deps.timeoutMs,
      );
      const result = validateProviderResult(raw, prompt, deps.provider);
      if (result) return { result, attempts: attempt };
    } catch {
      // Provider details are intentionally discarded; fallback is deterministic.
    }
  }
  return { result: null, attempts: deps.maxAttempts };
};
export const createEvaluationService = (deps: EvaluationServiceDependencies) => ({
  async evaluate(input: unknown): Promise<EvaluationResponse> {
    const startedAt = deps.clock.nowMs();
    const envelope = parseEvaluationEnvelope(input);
    if (!envelope || envelope.request.response.length > deps.maxResponseLength
      || containsPotentialSecret(envelope.request.response)) {
      if (envelope) await deps.audit.record({
        requestId: envelope.requestId,
        userId: "unknown",
        promptId: envelope.request.promptId,
        rubricId: envelope.request.rubricId,
        outcome: "invalid-request",
        attempts: 0,
        costUnits: 0,
        durationMs: deps.clock.nowMs() - startedAt,
      });
      throw new EvaluationServiceError("INVALID_REQUEST", "The evaluation request is invalid.");
    }

    const auth = await deps.auth.authenticate(envelope.authorization);
    if (!auth) {
      await deps.audit.record({
        requestId: envelope.requestId,
        userId: "unknown",
        promptId: envelope.request.promptId,
        rubricId: envelope.request.rubricId,
        outcome: "unauthorized",
        attempts: 0,
        costUnits: 0,
        durationMs: deps.clock.nowMs() - startedAt,
      });
      throw new EvaluationServiceError("UNAUTHORIZED", "Authentication is required.");
    }

    const prompt = await deps.rubrics.findPrompt(envelope.request);
    if (!prompt) {
      throw new EvaluationServiceError("RUBRIC_NOT_FOUND", "The requested rubric is unavailable.");
    }
    const reserved = await deps.quota.reserve({ userId: auth.userId, requestId: envelope.requestId, units: 1 });
    if (!reserved) {
      await deps.audit.record({
        requestId: envelope.requestId,
        userId: auth.userId,
        promptId: envelope.request.promptId,
        rubricId: envelope.request.rubricId,
        outcome: "quota-rejected",
        attempts: 0,
        costUnits: 0,
        durationMs: deps.clock.nowMs() - startedAt,
      });
      throw new EvaluationServiceError("QUOTA_EXCEEDED", "The evaluation budget is exhausted.");
    }

    try {
      const evaluated = await providerEvaluate(envelope, prompt, deps);
      const result = evaluated.result ?? evaluateDeterministically(
        prompt.rubric,
        envelope.request.response,
        "deterministic-server-fallback",
      );
      if (result.costUnits > deps.maxCostUnits) {
        throw new Error("Evaluation cost exceeded its reservation.");
      }
      await deps.quota.commit({ userId: auth.userId, requestId: envelope.requestId, units: result.costUnits });
      await deps.audit.record({
        requestId: envelope.requestId,
        userId: auth.userId,
        promptId: envelope.request.promptId,
        rubricId: envelope.request.rubricId,
        outcome: evaluated.result ? "provider" : "fallback",
        attempts: evaluated.attempts,
        costUnits: result.costUnits,
        durationMs: deps.clock.nowMs() - startedAt,
      });
      return { requestId: envelope.requestId, result, fallbackUsed: !evaluated.result };
    } catch (error) {
      await deps.quota.release({ userId: auth.userId, requestId: envelope.requestId });
      throw error;
    }
  },
});