import { prompts, steps, titles, type Step } from "./content";
import type { AnswerKey, PrototypeContext } from "./machine";

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
const labView = (context: PrototypeContext): string => {
  const transcript = context.lab.transcript.map((entry) =>
    `<p class="${entry.kind}">${entry.kind === "command" ? "$ " : ""}${escapeHtml(entry.text)}</p>`,
  ).join("");
  const status = context.lab.passed
    ? "All deterministic checks pass."
    : context.lab.checksRun > 0
      ? "Checks failed. Inspect the output and revise the configuration."
      : "Environment ready. Inspect and repair the configuration.";

  return `<p>You are operating a simulated GenAI service. Configure bounded retries, strict validation, output safety, and sanitized telemetry. Commands are interpreted by the prototype and are never executed by a shell.</p>
    <div class="lab">
      <p class="lab-state" role="status">${status}</p>
      <div class="terminal" role="log" aria-live="polite" aria-label="Lab terminal output">${transcript}</div>
      <form class="command-line" data-lab-form>
        <span aria-hidden="true">$</span>
        <label class="sr-only" for="lab-command">Lab command</label>
        <input id="lab-command" data-lab-command autocomplete="off" maxlength="80" />
        <button class="primary" type="submit">Run</button>
      </form>
    </div>
    <p>Start with <code>help</code>. Run <code>check</code> when ready.</p>`;
};

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
      return `<p>This 25 to 35 minute prototype tests a study loop, not your ability. Responses remain on this device unless you export an anonymized record.</p>
        <label for="participant"><strong>Participant ID</strong></label>
        <input id="participant" data-participant maxlength="40" value="${escapeHtml(context.participantId)}" />
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
        ${context.lab.passed
          ? actions({ back: true, next: "Review validation", pause: true })
          : actions({ back: true, pause: true })}`;
    case "validating":
      return `<p>Confirm behavior for valid, malformed, invalid-schema, unsafe, model-failure, and exhausted-attempt cases. The validator must not expose raw output.</p>
        ${field("validation", "Checks passed, failures, and revisions", context.answers.validation)}
        ${actions({ back: true, next: "Reflect", pause: true })}`;
    case "reflecting":
      return `<p>${prompts.reflection}</p>${field("reflection", "Final explanation", context.answers.reflection)}
        ${confidence("final", context.finalConfidence)}${actions({ back: true, next: "Complete session", pause: true })}`;
    case "complete":
      return `<p>Thank you. Export a record containing timing, confidence, hint count, completion flags, and word counts. Response text is excluded.</p>
        <div class="actions"><button class="primary" data-export>Export anonymized record</button>
        <button class="secondary" data-event="RESTART">Start another session</button></div>`;
  }
};
