import { createActor, type SnapshotFrom } from "xstate";
import "./styles.css";
import { titles, type Step } from "./content";
import { prototypeMachine, type AnswerKey } from "./machine";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "./persistence";
import { exportResearchRecord } from "./export";
import { activity, progress, stepFromValue } from "./view";

const restored = loadSnapshot();
const actor = createActor(
  prototypeMachine,
  restored ? { snapshot: restored as SnapshotFrom<typeof prototypeMachine> } : undefined,
);
const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Application root is unavailable.");

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

const bind = (step: Step | "paused"): void => {
  document.querySelector<HTMLInputElement>("[data-participant]")?.addEventListener("input", (event) => {
    actor.send({ type: "PARTICIPANT", value: (event.currentTarget as HTMLInputElement).value });
  });
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
        if (status) status.textContent = "Complete the required response before continuing.";
      }
    });
  });
  document.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", () =>
    exportResearchRecord(actor.getSnapshot().context));
  if (step === "complete") clearSnapshot();
};

let renderKey = "";
actor.subscribe((snapshot) => {
  if (snapshot.status === "active") saveSnapshot(actor.getPersistedSnapshot());
  const nextRenderKey = JSON.stringify([
    snapshot.value,
    snapshot.context.hintsUsed,
    snapshot.context.lab.revision,
  ]);
  if (nextRenderKey !== renderKey) {
    renderKey = nextRenderKey;
    render();
  }
});
actor.start();