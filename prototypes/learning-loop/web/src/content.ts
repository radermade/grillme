export const steps = [
  "intro",
  "baseline",
  "teaching",
  "grilling",
  "scenario",
  "implementing",
  "validating",
  "reflecting",
  "review",
  "complete",
] as const;

export type Step = (typeof steps)[number];

export const titles: Record<Step, string> = {
  intro: "Structured output under pressure",
  baseline: "Start with what you know",
  teaching: "A focused mental model",
  grilling: "Defend the details",
  scenario: "Make the trade-off",
  implementing: "Repair the behavior",
  validating: "Validate deterministically",
  reflecting: "Explain the final design",
  review: "Your evaluation",
  complete: "Session complete",
};

export const prompts = {
  baseline: "How should an application handle malformed, invalid, or unsafe model output, including repeated failure?",
  grillOne: "Why is JSON.parse insufficient for model output?",
  grillTwo: "What should determine whether the application retries?",
  scenario: "Choose A, B, or C. Defend the choice and state one condition that would make you revise it.",
  reflection: "Explain the final design, its bounded retry behavior, deterministic decisions, useful metrics, and one uncertainty.",
} as const;