import { createActor, type SnapshotFrom } from "xstate";
import "./styles.css";
import { titles, type Step } from "./content";
import {
  prototypeMachine,
  type AnswerKey,
  type LearnerFeedbackKey,
} from "./machine";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "./persistence";
import { exportResearchRecord } from "./export";
import {
  activity,
  labRequirementsHtml,
  labStatusText,
  labTranscriptHtml,
  nextRequirementText,
  progress,
  stepFromValue,
} from "./view";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Application root is unavailable.");

const showStartupError = (): void => {
  clearSnapshot();
  root.innerHTML = `<main class="main" id="activity">
    <p class="eyebrow">Phase 0 learning-loop research</p>
    <h1>Prototype state could not be restored</h1>
    <p>Saved prototype data was incompatible with this version and has been cleared.</p>
    <button class="primary" data-reload>Start a new session</button>
  </main>`;
  document.querySelector<HTMLButtonElement>("[data-reload]")?.addEventListener("click", () => location.reload());
};

let actor: ReturnType<typeof createActor<typeof prototypeMachine>>;
try {
  const restored = loadSnapshot();
  actor = createActor(
    prototypeMachine,
    restored ? { snapshot: restored as SnapshotFrom<typeof prototypeMachine> } : undefined,
  );
} catch {
  showStartupError();
  throw new Error("Prototype state restoration failed.");
}

const render = (): void => {
  const snapshot = actor.getSnapshot();
  const step = stepFromValue(snapshot.value);
  root.innerHTML = `<div class="shell">
    <aside class="sidebar" aria-label="Session progress">
      <p class="brand">Grill Me prototype</p><ol class="progress">${progress(step)}</ol>
    </aside>
    <main class="main" id="activity" tabindex="-1">
      <p class="eyebrow">Phase 0 learning-loop research</p>
      <h1>${step === "paused" ? "Session paused" : titles[step]}</h1>
      ${activity(step, snapshot.context)}
      <p class="status" role="status" aria-live="polite"></p>
    </main>
  </div>`;
  bind(step);
  const focusTarget = step === "implementing"
    ? document.querySelector<HTMLElement>("[data-lab-command]")
    : document.querySelector<HTMLElement>("#activity");
  focusTarget?.focus();
};
const updateLab = (): void => {
  const { context } = actor.getSnapshot();
  const status = document.querySelector<HTMLElement>("[data-lab-status]");
  const transcript = document.querySelector<HTMLElement>("[data-lab-transcript]");
  const requirements = document.querySelector<HTMLElement>("[data-lab-requirements]");
  const continueButton = document.querySelector<HTMLButtonElement>('[data-event="NEXT"]');
  const continueHelp = document.querySelector<HTMLElement>("#lab-continue-help");

  if (status) status.textContent = labStatusText(context);
  if (transcript) {
    transcript.innerHTML = labTranscriptHtml(context);
    transcript.scrollTop = transcript.scrollHeight;
  }
  if (requirements) requirements.innerHTML = labRequirementsHtml(context);
  if (continueButton) continueButton.disabled = !context.lab.passed;
  if (continueHelp) continueHelp.textContent = context.lab.passed
    ? "All checks pass. You can continue."
    : "Continue unlocks after all four requirements are configured and check passes.";
};
const focusMissing = (step: Step | "paused"): void => {
  const selectorByStep: Partial<Record<Step, string>> = {
    intro: "[data-participant]",
    baseline: '[data-answer="baseline"]',
    grilling: '[data-answer="grillOne"]:placeholder-shown, [data-answer="grillTwo"]:placeholder-shown',
    scenario: '[data-answer="scenario"]',
    implementing: "[data-lab-command]",
    validating: '[data-answer="validation"]',
    reflecting: '[data-answer="reflection"]',
    review: "[data-learner-feedback]",
  };
  if (step === "review") {
    const missingFeedback = [...document.querySelectorAll<HTMLInputElement>("[data-learner-feedback]")]
      .find((radio) => !document.querySelector<HTMLInputElement>(
        `[data-learner-feedback="${radio.dataset.learnerFeedback}"]:checked`,
      ));
    missingFeedback?.focus();
    return;
  }
  const selector = step === "grilling"
    ? !actor.getSnapshot().context.answers.grillOne.trim()
      ? '[data-answer="grillOne"]'
      : '[data-answer="grillTwo"]'
    : selectorByStep[step as Step];
  if (selector) document.querySelector<HTMLElement>(selector)?.focus();
};

const bind = (step: Step | "paused"): void => {
  document.querySelectorAll<HTMLTextAreaElement>("[data-answer]").forEach((element) => {
    element.addEventListener("input", () => actor.send({
      type: "ANSWER", key: element.dataset.answer as AnswerKey, value: element.value,
    }));
  });
  document.querySelectorAll<HTMLSelectElement>("[data-confidence]").forEach((element) => {
    element.addEventListener("change", () => actor.send({
      type: "CONFIDENCE", phase: element.dataset.confidence as "baseline" | "final",
      value: Number(element.value),
    }));
  });
  document.querySelectorAll<HTMLInputElement>("[data-learner-feedback]").forEach((element) => {
    element.addEventListener("change", () => actor.send({
      type: "LEARNER_FEEDBACK",
      key: element.dataset.learnerFeedback as LearnerFeedbackKey,
      value: element.value === "true",
    }));
  });
  document.querySelector<HTMLFormElement>("[data-lab-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>("[data-lab-command]");
    const command = input?.value.trim() ?? "";
    if (!command) return;
    actor.send({ type: "LAB_COMMAND", command });
    if (input) {
      input.value = "";
      input.focus();
    }
  });
  document.querySelectorAll<HTMLButtonElement>("[data-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const eventType = button.dataset.event;
      if (!eventType || !["NEXT", "BACK", "PAUSE", "RESUME", "USE_HINT", "RESTART"].includes(eventType)) return;
      const before = actor.getSnapshot().value;
      actor.send({ type: eventType } as
        | { type: "NEXT" } | { type: "BACK" } | { type: "PAUSE" }
        | { type: "RESUME" } | { type: "USE_HINT" } | { type: "RESTART" });
      if (eventType === "NEXT" && actor.getSnapshot().value === before) {
        const status = document.querySelector<HTMLElement>(".status");
        if (status) status.textContent = nextRequirementText(step, actor.getSnapshot().context);
        focusMissing(step);
      }
    });
  });
  document.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", () =>
    exportResearchRecord(actor.getSnapshot().context));
  if (step === "complete") clearSnapshot();
};

let renderedStep: Step | "paused" | null = null;
let renderedHintCount = -1;
let renderedLabRevision = -1;
actor.subscribe({
  next: (snapshot) => {
    if (snapshot.status === "active") saveSnapshot(actor.getPersistedSnapshot());
    const step = stepFromValue(snapshot.value);
    const stepChanged = step !== renderedStep || snapshot.context.hintsUsed !== renderedHintCount;

    if (stepChanged) {
      renderedStep = step;
      renderedHintCount = snapshot.context.hintsUsed;
      renderedLabRevision = snapshot.context.lab.revision;
      render();
    } else if (step === "implementing" && snapshot.context.lab.revision !== renderedLabRevision) {
      renderedLabRevision = snapshot.context.lab.revision;
      updateLab();
    }
  },
  error: showStartupError,
});
try {
  actor.start();
} catch {
  showStartupError();
}