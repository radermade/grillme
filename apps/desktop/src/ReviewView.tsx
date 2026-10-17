import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createReviewSessionMachine } from "@grillme/machines";
import { platform } from "./adapters";

type Props = { courseId: string; courseVersion: string; onOpenAssessment(): void };

export function ReviewView({ courseId, courseVersion, onOpenAssessment }: Props) {
  const machine = useMemo(() => createReviewSessionMachine(courseId, courseVersion, platform), [courseId, courseVersion]);
  const [state, send] = useMachine(machine, {});
  useEffect(() => { document.querySelector<HTMLElement>("#review")?.focus(); }, [state.value]);

  if (state.matches("loading")) return <main id="review" tabIndex={-1}><h1>Loading review queue</h1><p role="status">Restoring scheduled skills…</p></main>;
  if (state.matches("failed")) return <main id="review" tabIndex={-1}><h1>Review unavailable</h1><p role="alert">{state.context.error?.message}</p><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button></main>;
  if (state.matches("complete")) return <main id="review" tabIndex={-1}><p className="eyebrow">Review queue</p><h1>Nothing is due</h1><p>Complete the baseline or return when a skill is scheduled.</p><button className="primary" onClick={onOpenAssessment}>Open baseline</button></main>;

  const schedule = state.context.pendingSchedule ?? state.context.schedule;
  const selected = state.context.selected;
  const dueItems = schedule?.items.filter((item) => Date.parse(item.dueAt) <= Date.now()) ?? [];
  const futureItems = (schedule?.items.length ?? 0) - dueItems.length;
  if (state.matches("selection")) return <main id="review" tabIndex={-1}><p className="eyebrow">Review queue</p><h1>{dueItems.length ? "Skills to revisit" : "Nothing due today"}</h1>{futureItems > 0 && <p>{futureItems} skill{futureItems === 1 ? " is" : "s are"} scheduled for a future date.</p>}<ul className="review-list">{dueItems.map((item) => <li key={item.skillId}><h2>{item.title}</h2><p>{item.reason}</p><p>Due {new Date(item.dueAt).toLocaleDateString()}</p><p>{item.removalCriteria}</p><button className="primary" onClick={() => send({ type: "SELECT", skillId: item.skillId })}>Review skill</button></li>)}</ul></main>;
  if (!selected) return <main id="review" tabIndex={-1}><h1>Review unavailable</h1></main>;
  if (state.matches("prompting")) return <main id="review" tabIndex={-1}><p className="eyebrow">Recall before revealing</p><h1>{selected.title}</h1><p className="prompt">{selected.prompt}</p><button className="primary" onClick={() => send({ type: "REVEAL" })}>Reveal answer</button></main>;
  if (state.matches("revealing")) return <main id="review" tabIndex={-1}><h1>{selected.title}</h1><div className="callout info"><strong>Expected evidence</strong><p>{selected.answer}</p></div><button className="primary" onClick={() => send({ type: "ASSESS" })}>Rate my recall</button></main>;
  if (state.matches("degraded")) return <main id="review" tabIndex={-1}><h1>Review not saved</h1><p role="alert">{state.context.error?.message}</p><div className="actions"><button className="primary" onClick={() => send({ type: "RETRY" })}>Retry</button><button className="secondary" onClick={() => send({ type: "CONTINUE_OFFLINE" })}>Continue unsaved</button></div></main>;
  if (state.matches("rescheduling")) return <main id="review" tabIndex={-1}><h1>Scheduling next review</h1><p role="status">Saving your recall evidence…</p></main>;
  return <main id="review" tabIndex={-1}><h1>How well did you recall it?</h1><div className="confidence" role="group" aria-label="Recall confidence">{[1, 2, 3, 4, 5].map((value) => <button key={value} className="secondary" onClick={() => send({ type: "RATE", confidence: value })}>{value}</button>)}</div><p>1-2: tomorrow · 3: three days · 4-5: seven days. Two strong recalls remove the item.</p></main>;
}