import { useEffect, useMemo, useState } from "react";
import { useMachine } from "@xstate/react";
import { createWorkspaceMachine } from "@grillme/machines";
import { AccountStatus } from "./AccountStatus";
import { App } from "./App";
import { AssessmentView } from "./AssessmentView";
import { GrillView } from "./GrillView";
import { LabView } from "./LabView";
import { MockView } from "./MockView";
import { OperationsView } from "./OperationsView";
import { ReadinessView } from "./ReadinessView";
import { ReviewView } from "./ReviewView";
import { TrainingView } from "./TrainingView";
import { useUiRuntime, type WorkspaceLocation, type WorkspaceView } from "./runtime";

const events = { course: "OPEN_COURSE", assessment: "OPEN_ASSESSMENT", grill: "OPEN_GRILL", training: "OPEN_TRAINING", lab: "OPEN_LAB", readiness: "OPEN_READINESS", mock: "OPEN_MOCK", operations: "OPEN_OPERATIONS", review: "OPEN_REVIEW" } as const;
const labels = { course: "Learn", assessment: "Baseline", grill: "Grill", training: "Training", lab: "Lab", readiness: "Readiness", mock: "Mock", operations: "Settings", review: "Review" } as const;
const views = Object.keys(events) as WorkspaceView[];

export function Workspace() {
  const { workspaceNavigation } = useUiRuntime();
  const initialLocation = useMemo(() => workspaceNavigation.current(), [workspaceNavigation]);
  const [location, setLocation] = useState(initialLocation);
  const [state, send] = useMachine(useMemo(createWorkspaceMachine, []), {});
  const navigate = (destination: WorkspaceLocation) => {
    setLocation(destination);
    send({ type: events[destination.view] });
    workspaceNavigation.navigate(destination);
    queueMicrotask(() => document.querySelector<HTMLElement>("#main-content")?.focus());
  };
  useEffect(() => {
    send({ type: events[initialLocation.view] });
    return workspaceNavigation.subscribe((destination) => { setLocation(destination); send({ type: events[destination.view] }); });
  }, [initialLocation.view, send, workspaceNavigation]);
  return <><a className="skip-link" href="#main-content">Skip to content</a>
    <nav className="workspace-nav" aria-label="Learning workspace"><AccountStatus />{views.map((view) => <button key={view} aria-current={state.matches(view) ? "page" : undefined} onClick={() => navigate({ view })}>{labels[view]}</button>)}</nav>
    <div id="main-content" tabIndex={-1}>
    {state.matches("course") && (location.view === "course" && location.lessonId
      ? <App key={location.lessonId} initialLessonId={location.lessonId} onLessonChange={(lessonId) => { const destination = { view: "course" as const, lessonId }; setLocation(destination); workspaceNavigation.navigate(destination); }} />
      : <App key="course" onLessonChange={(lessonId) => { const destination = { view: "course" as const, lessonId }; setLocation(destination); workspaceNavigation.navigate(destination); }} />)}
    {state.matches("assessment") && <AssessmentView onOpenReview={() => navigate({ view: "review" })} />}
    {state.matches("grill") && <GrillView onOpenReview={() => navigate({ view: "review" })} />}
    {state.matches("training") && <TrainingView />}
    {state.matches("lab") && <LabView />}
    {state.matches("readiness") && <ReadinessView onOpenMock={() => navigate({ view: "mock" })} onDrill={(type) => navigate({ view: type === "assessment" ? "assessment" : type === "explanation" ? "grill" : type === "lab" ? "lab" : "training" })} />}
    {state.matches("mock") && <MockView onOpenReadiness={() => navigate({ view: "readiness" })} />}
    {state.matches("operations") && <OperationsView />}
    {state.matches("review") && <ReviewView courseId="aws-aip-c01" courseVersion="0.1.0" onOpenAssessment={() => navigate({ view: "assessment" })} />}
    </div>
  </>;
}
