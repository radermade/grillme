import type {
  EvaluationRequest,
  EvaluationResult,
  GrillPrompt,
  GrillRubric,
} from "@grillme/domain";
import type { EvaluationPort } from "@grillme/platform";

const hasTerm = (response: string, terms: string[]) =>
  terms.some((term) => response.toLowerCase().includes(term.toLowerCase()));
const excerpt = (response: string, terms: string[]): string => {
  const lower = response.toLowerCase();
  const term = terms.find((candidate) => lower.includes(candidate.toLowerCase()));
  if (!term) return response.slice(0, 160);
  const index = lower.indexOf(term.toLowerCase());
  return response.slice(Math.max(0, index - 60), Math.min(response.length, index + term.length + 100));
};

export const evaluateDeterministically = (
  rubric: GrillRubric,
  response: string,
  evaluatorId = "deterministic-rubric",
): EvaluationResult => {
  const covered = rubric.concepts.filter((concept) => hasTerm(response, concept.terms));
  const missing = rubric.concepts.filter((concept) => !covered.includes(concept));
  const misconceptions = rubric.misconceptions.filter((item) => hasTerm(response, item.terms));
  const firstMisconception = misconceptions[0];
  const firstMissing = missing[0];
  const followUp = firstMisconception
    ? { question: firstMisconception.probe, reason: `Your response may reflect: ${firstMisconception.label}.` }
    : firstMissing
      ? { question: firstMissing.probe, reason: `Probe the missing concept: ${firstMissing.label}.` }
      : null;
  return {
    schemaVersion: 1,
    rubricId: rubric.id,
    rubricVersion: rubric.version,
    evaluatorId,
    evaluatorVersion: "1.0.0",
    modelVersion: null,
    coveredConceptIds: covered.map(({ id }) => id),
    missingConceptIds: missing.map(({ id }) => id),
    misconceptionIds: misconceptions.map(({ id }) => id),
    evidence: covered.map((concept) => ({ conceptId: concept.id, excerpt: excerpt(response, concept.terms) })),
    score: covered.length / rubric.concepts.length,
    feedback: misconceptions.length
      ? misconceptions.map(({ correction }) => correction).join(" ")
      : missing.length
        ? `Strengthen: ${missing.map(({ label }) => label).join(", ")}.`
        : "Your explanation covered the required concepts.",
    followUp,
    costUnits: 1,
  };
};

export const createDeterministicEvaluationPort = (
  promptById: (promptId: string) => GrillPrompt | undefined,
): EvaluationPort => ({
  async evaluate(request: EvaluationRequest, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) throw new Error("Evaluation cancelled.");
    const prompt = promptById(request.promptId);
    if (!prompt || prompt.rubric.id !== request.rubricId || prompt.rubric.version !== request.rubricVersion) {
      throw new Error("Rubric unavailable.");
    }
    return evaluateDeterministically(prompt.rubric, request.response);
  },
});export const containsPotentialSecret = (value: string): boolean => [
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:aws_secret_access_key|secret[_ -]?key|api[_ -]?key)\s*[:=]\s*\S+/i,
  /bearer\s+[A-Za-z0-9._~+\/-]{20,}/i,
].some((pattern) => pattern.test(value));
export { validateScenarioWorkspace } from "./scenario";
export { deriveReadiness, assessmentReadinessEvidence, grillReadinessEvidence, labReadinessEvidence, mockReadinessEvidence, scenarioReadinessEvidence } from "./readiness";
export { decideMobileDirection } from "./mobile-discovery";
