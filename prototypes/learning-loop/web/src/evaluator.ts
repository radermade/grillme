export type RubricDimension = "outputHandling" | "safety" | "operations" | "tradeoffs";
export type RubricScores = Record<RubricDimension, number>;

export type EvaluationResult = {
  baseline: RubricScores;
  final: RubricScores;
  evidence: Record<RubricDimension, string[]>;
  missing: Record<RubricDimension, string[]>;
  identifiedMalformedOutput: boolean;
  identifiedUnboundedRetry: boolean;
  explainedDeterministicValidation: boolean;
};

type Criterion = { label: string; patterns: RegExp[] };
type Rubric = Record<RubricDimension, Criterion[]>;

const rubric: Rubric = {
  outputHandling: [
    { label: "separates parsing from validation", patterns: [/pars(e|ing)/i, /validat(e|ion)/i] },
    { label: "checks schema or field constraints", patterns: [/schema/i, /field|type|range|shape/i] },
    { label: "uses bounded retries and terminal failure", patterns: [/bound|max(imum)? attempt|two (calls|attempts)/i, /terminal|fail|error|stop/i] },
  ],
  safety: [
    { label: "treats model output as untrusted", patterns: [/untrusted|unsafe|malicious/i] },
    { label: "applies deterministic safety controls", patterns: [/block|guardrail|saniti[sz]e|escape|policy/i] },
    { label: "keeps authority outside the model", patterns: [/authori[sz]|permission|tool|privilege/i, /deterministic|outside|not.*model/i] },
  ],
  operations: [
    { label: "captures operational signals", patterns: [/metric|monitor|observ|log/i] },
    { label: "tracks latency, cost, attempts, or failure categories", patterns: [/latency|cost|attempt|failure categor/i] },
    { label: "avoids sensitive raw telemetry", patterns: [/redact|saniti[sz]ed telemetry|no raw|without.*content|sensitive/i] },
  ],
  tradeoffs: [
    { label: "considers multiple constraints", patterns: [/latency|cost/i, /safety|quality|reliab/i] },
    { label: "defends a design choice", patterns: [/choose|choice|because|prefer|option b/i] },
    { label: "states when the choice should change", patterns: [/change|revise|unless|if .*require|when/i] },
  ],
};
const matchCriterion = (text: string, criterion: Criterion): boolean =>
  criterion.patterns.every((pattern) => pattern.test(text));

const evaluateText = (text: string): Pick<EvaluationResult, "baseline" | "evidence" | "missing"> => {
  const baseline = {} as RubricScores;
  const evidence = {} as Record<RubricDimension, string[]>;
  const missing = {} as Record<RubricDimension, string[]>;
  for (const dimension of Object.keys(rubric) as RubricDimension[]) {
    const matched = rubric[dimension].filter((criterion) => matchCriterion(text, criterion));
    baseline[dimension] = matched.length;
    evidence[dimension] = matched.map(({ label }) => label);
    missing[dimension] = rubric[dimension]
      .filter((criterion) => !matched.includes(criterion))
      .map(({ label }) => label);
  }
  return { baseline, evidence, missing };
};

export const evaluateResponses = (answers: {
  baseline: string;
  grillOne: string;
  grillTwo: string;
  scenario: string;
  validation: string;
  reflection: string;
}): EvaluationResult => {
  const initial = evaluateText(answers.baseline);
  const finalText = [answers.grillOne, answers.grillTwo, answers.scenario, answers.validation, answers.reflection].join("\n");
  const finalResult = evaluateText(finalText);
  return {
    baseline: initial.baseline,
    final: finalResult.baseline,
    evidence: finalResult.evidence,
    missing: finalResult.missing,
    identifiedMalformedOutput: /malform|pars(e|ing)|invalid json/i.test(finalText),
    identifiedUnboundedRetry: /unbound|infinite retry|retry forever|max(imum)? attempt|bounded retry|two (calls|attempts)/i.test(finalText),
    explainedDeterministicValidation: /deterministic/i.test(finalText) && /validat(e|ion)|check/i.test(finalText),
  };
};