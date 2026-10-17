import { useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createWorkspaceMachine } from "@grillme/machines";
import { App } from "./App";
import { AssessmentView } from "./AssessmentView";
import { ReviewView } from "./ReviewView";

export function Workspace() {
  const machine = useMemo(createWorkspaceMachine, []);
  const [state, send] = useMachine(machine, {});
  return <>
    <nav className="workspace-nav" aria-label="Learning workspace">
      <button aria-current={state.matches("course") ? "page" : undefined} onClick={() => send({ type: "OPEN_COURSE" })}>Learn</button>
      <button aria-current={state.matches("assessment") ? "page" : undefined} onClick={() => send({ type: "OPEN_ASSESSMENT" })}>Baseline</button>
      <button aria-current={state.matches("review") ? "page" : undefined} onClick={() => send({ type: "OPEN_REVIEW" })}>Review</button>
    </nav>
    {state.matches("course") && <App />}
    {state.matches("assessment") && <AssessmentView onOpenReview={() => send({ type: "OPEN_REVIEW" })} />}
    {state.matches("review") && <ReviewView courseId="aws-aip-c01" courseVersion="0.1.0" onOpenAssessment={() => send({ type: "OPEN_ASSESSMENT" })} />}
  </>;
}