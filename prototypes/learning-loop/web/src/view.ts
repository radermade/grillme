import { prompts, steps, titles, type Step } from "./content";
import type {
  AnswerKey,
  LearnerFeedbackKey,
  PrototypeContext,
} from "./machine";
import type { RubricDimension } from "./evaluator";

const escapeHtml = (value: string): string => value.replace(/[&<>"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
})[character] ?? character);

const field = (key: AnswerKey, label: string, value: string): string => `
  <label for="${key}"><strong>${label}</strong></label>
  <textarea id="${key}" data-answer="${key}" maxlength="5000">${escapeHtml(value)}</textarea>`;

const confidence = (phase: "baseline" | "final", value: number): string => `
  <label for="${phase}-confidence"><strong>Confidence</strong>, 1 to 5</label>
  <select id="${phase}-confidence" data-confidence="${phase}">
    ${[1, 2, 3, 4, 5].map((option) => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}
  </select>`;

export const stepFromValue = (value: unknown): Step | "paused" => {
  if (value === "paused") return "paused";
  if (value && typeof value === "object" && "active" in value) {
    const active = (value as { active: unknown }).active;
    if (active && typeof active === "object" && "implementing" in active) return "implementing";
    const activeName = String(active);
    if (steps.includes(activeName as Step)) return activeName as Step;
  }
  return "intro";
};

export const progress = (current: Step | "paused"): string => steps.map((step) =>
  `<li ${step === current ? 'aria-current="step"' : ""}>${titles[step]}</li>`,
).join("");
export const nextRequirementText = (
  step: Step | "paused",
  context: PrototypeContext,
): string => {
  if (step === "intro" && !context.participantId.trim()) return "Enter a participant ID to begin.";
  if (step === "baseline" && !context.answers.baseline.trim()) return "Write your baseline explanation to continue.";
  if (step === "grilling") {
    if (!context.answers.grillOne.trim()) return "Answer question 1: why JSON.parse is insufficient.";
    if (!context.answers.grillTwo.trim()) return "Answer question 2: what should determine whether the app retries.";
  }
  if (step === "scenario" && !context.answers.scenario.trim()) return "Choose A, B, or C, defend it, and state when you would revise the choice.";
  if (step === "implementing" && !context.lab.passed) return "Configure all four requirements and run check successfully.";
  if (step === "validating" && !context.answers.validation.trim()) return "Summarize what you changed and what the passing checks demonstrated.";
  if (step === "reflecting" && !context.answers.reflection.trim()) return "Explain the final design, deterministic controls, useful metrics, and one uncertainty.";
  if (step === "review") {
    const missingFeedback = Object.values(context.feedback).filter((value) => value === null).length;
    if (missingFeedback) return `Answer ${missingFeedback} more feedback question${missingFeedback === 1 ? "" : "s"}.`;
  }
  return "Required information is complete.";
};
const rubricDimensions: Array<[RubricDimension, string]> = [
  ["outputHandling", "Output handling"],
  ["safety", "Safety"],
  ["operations", "Operations"],
  ["tradeoffs", "Trade-offs"],
];

const feedbackQuestions: Array<[LearnerFeedbackKey, string]> = [
  ["miniLabImprovedUnderstanding", "Did the mini-lab improve your understanding?"],
  ["wouldChooseDeeperLab", "Would you choose a deeper hands-on lab for this topic?"],
  ["severeUnresolvedIssue", "Did you encounter a serious accessibility, safety, privacy, or trust issue?"],
];

const evaluationReview = (context: PrototypeContext): string => {
  const evaluation = context.evaluation;
  if (!evaluation) return '<p role="alert">Evaluation is unavailable. Go back and try again.</p>';
  const rows = rubricDimensions.map(([dimension, label]) => {
    const evidence = evaluation.evidence[dimension];
    const missing = evaluation.missing[dimension];
    return `<tr><th scope="row">${label}</th><td>${evaluation.baseline[dimension]}/3</td>
      <td>${evaluation.final[dimension]}/3</td><td>${evidence.length ? escapeHtml(evidence.join(", ")) : "No rubric evidence detected"}</td>
      <td>${missing.length ? escapeHtml(missing.join(", ")) : "None"}</td></tr>`;
  }).join("");
  const feedback = feedbackQuestions.map(([key, label]) => {
    const value = context.feedback[key];
    return `<fieldset class="observation"><legend>${label}</legend>
      <label><input type="radio" name="${key}" data-learner-feedback="${key}" value="true" ${value === true ? "checked" : ""} /> Yes</label>
      <label><input type="radio" name="${key}" data-learner-feedback="${key}" value="false" ${value === false ? "checked" : ""} /> No</label>
    </fieldset>`;
  }).join("");

  return `<p>This Phase 0 evaluator applies a transparent rubric to your written evidence and combines it with deterministic lab checks. It can miss valid phrasing and does not prove mastery.</p>
    <div class="table-wrap"><table><caption>Evidence-linked evaluation</caption><thead><tr><th>Dimension</th><th>Before</th><th>After</th><th>Detected evidence</th><th>Still missing</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p><strong>Lab result:</strong> ${context.lab.passed ? "Passed" : "Not passed"} after ${context.lab.checksRun} check attempt${context.lab.checksRun === 1 ? "" : "s"}.</p>
    <h2>Your feedback</h2><div class="observations">${feedback}</div>`;
};
export const labStatusText = (context: PrototypeContext): string => context.lab.passed
  ? "All deterministic checks pass. Continue is unlocked."
  : context.lab.checksRun > 0
    ? "Checks failed. Repair each failed requirement, then run check again."
    : "Environment ready. Configure all four requirements, then run check.";

export const labTranscriptHtml = (context: PrototypeContext): string =>
  context.lab.transcript.map((entry) =>
    `<p class="${entry.kind}">${entry.kind === "command" ? "$ " : ""}${escapeHtml(entry.text)}</p>`,
  ).join("");

export const labRequirementsHtml = (context: PrototypeContext): string => {
  const requirements = [
    [context.lab.config.maxAttempts === 2, "Exactly two total model-call attempts"],
    [context.lab.config.schema === "strict", "Strict structured-output validation"],
    [context.lab.config.safety === "block", "Unsafe output blocked"],
    [context.lab.config.telemetry === "sanitized", "Sanitized telemetry"],
  ] as const;
  return requirements.map(([ready, label]) =>
    `<li class="${ready ? "success" : "pending"}">${ready ? "Ready" : "Pending"}: ${label}</li>`,
  ).join("");
};

const labView = (context: PrototypeContext): string => `
  <p>You are operating a simulated GenAI service. Configure bounded retries, strict validation, output safety, and sanitized telemetry. Commands are interpreted by the prototype and are never executed by a shell.</p>
  <div class="card">
    <strong>Completion requirements</strong>
    <ul data-lab-requirements>${labRequirementsHtml(context)}</ul>
  </div>
  <div class="lab">
    <p class="lab-state" data-lab-status role="status">${labStatusText(context)}</p>
    <div class="terminal" data-lab-transcript role="log" aria-live="polite" aria-label="Lab terminal output">${labTranscriptHtml(context)}</div>
    <form class="command-line" data-lab-form>
      <span aria-hidden="true">$</span>
      <label class="sr-only" for="lab-command">Lab command</label>
      <input id="lab-command" data-lab-command autocomplete="off" maxlength="80" />
      <button class="primary" type="submit">Run</button>
    </form>
  </div>
  <p>Start with <code>help</code> to list commands. Run <code>check</code> after all four requirements show Ready.</p>`;

export const activity = (step: Step | "paused", context: PrototypeContext): string => {
  const actions = (options: { back?: boolean; next?: string; pause?: boolean } = {}) => `
    <div class="actions">
      ${options.back ? '<button class="secondary" data-event="BACK">Back</button>' : ""}
      ${options.pause ? '<button class="secondary" data-event="PAUSE">Pause</button>' : ""}
      ${options.next ? `<button class="primary" data-event="NEXT">${options.next}</button>` : ""}
    </div>`;

  switch (step) {
    case "paused":
      return `<p>Your responses are saved on this device.</p>
        <button class="primary" data-event="RESUME">Resume session</button>`;
    case "intro":
      return `<p>This solo prototype adapts questions, validates a hands-on repair, and evaluates written evidence against a transparent rubric. Your work remains on this device unless you export an anonymous result.</p>
        ${actions({ next: "Begin", pause: true })}`;
    case "baseline":
      return `<p>${prompts.baseline}</p>${field("baseline", "Your explanation", context.answers.baseline)}
        ${confidence("baseline", context.baselineConfidence)}${actions({ back: true, next: "Read lesson", pause: true })}`;
    case "teaching":
      return `<div class="card"><p>Model output is untrusted input. Parsing proves syntax, not shape, field validity, range, size, or safety.</p>
        <p>Recovery must be bounded. Each call adds cost and latency and can fail again. Set a maximum attempt count, retain sanitized failure categories, and return an explicit terminal error.</p>
        <p>A valid response cannot grant authority. Deterministic policy controls tools and permissions. Useful signals include attempt count, failure category, latency, and outcome, without raw sensitive content.</p></div>
        ${actions({ back: true, next: "Start grilling", pause: true })}`;
    case "grilling":
      return `<p>${prompts.grillOne}</p>${field("grillOne", "Answer one", context.answers.grillOne)}
        <p>${prompts.grillTwo}</p>${field("grillTwo", "Answer two", context.answers.grillTwo)}
        ${context.hintsUsed > 0 ? '<p class="hint">Consider parsing, schema validation, attempt limits, and explicit terminal failure.</p>' : ""}
        <div class="actions"><button class="secondary" data-event="USE_HINT">Use hint</button></div>
        ${actions({ back: true, next: "Open scenario", pause: true })}`;
    case "scenario":
      return `<p>A support assistant needs sub-two-second median latency, blocked unsafe output, and a strict request cost ceiling.</p>
        <div class="card"><p>A. Parse and render any fields; retry until parsing succeeds.</p><p>B. Parse, validate schema and safety, allow two total calls, then return a typed failure.</p><p>C. Ask the model whether its response is safe and trust its answer.</p></div>
        <p>${prompts.scenario}</p>${field("scenario", "Decision and defense", context.answers.scenario)}
        ${actions({ back: true, next: "Implementation", pause: true })}`;
    case "implementing":
      return `${labView(context)}
        <div class="actions">
          <button class="secondary" data-event="BACK">Back</button>
          <button class="secondary" data-event="PAUSE">Pause</button>
          <button class="primary" data-event="NEXT" ${context.lab.passed ? "" : "disabled"} aria-describedby="lab-continue-help">Review validation</button>
        </div>
        <p id="lab-continue-help" class="hint">${context.lab.passed
          ? "All checks pass. You can continue."
          : "Continue unlocks after all four requirements are configured and check passes."}</p>`;
    case "validating":
      return `<p>Confirm behavior for valid, malformed, invalid-schema, unsafe, model-failure, and exhausted-attempt cases. The validator must not expose raw output.</p>
        ${field("validation", "Checks passed, failures, and revisions", context.answers.validation)}
        ${actions({ back: true, next: "Reflect", pause: true })}`;
    case "reflecting":
      return `<p>${prompts.reflection}</p>${field("reflection", "Final explanation", context.answers.reflection)}
        ${confidence("final", context.finalConfidence)}${actions({ back: true, next: "Evaluate my evidence", pause: true })}`;
    case "review":
      return `${evaluationReview(context)}${actions({ back: true, next: "Complete session", pause: true })}`;
    case "complete":
      return `<p>Session complete. Export an anonymous record containing rubric scores, evaluator provenance, lab outcomes, timing, confidence, and feedback. Written responses and command text are excluded.</p>
        <div class="actions"><button class="primary" data-export>Export anonymized record</button>
        <button class="secondary" data-event="RESTART">Start another session</button></div>`;
  }
};
