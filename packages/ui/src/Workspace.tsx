import { useEffect, useMemo, useState } from "react";
import { useMachine } from "@xstate/react";
import { createWorkspaceMachine } from "@grillme/machines";
import { AccountStatus } from "./AccountStatus";
import { App } from "./App";
import { AssessmentView } from "./AssessmentView";
import { ConsoleView } from "./ConsoleView";
import { GrillView } from "./GrillView";
import { LabView } from "./LabView";
import { MockView } from "./MockView";
import { OperationsView } from "./OperationsView";
import { ReadinessView } from "./ReadinessView";
import { ReviewView } from "./ReviewView";
import { TrainingView } from "./TrainingView";
import { useUiRuntime, type WorkspaceLocation, type WorkspaceView } from "./runtime";
import { ApplicationRail } from "./primitives";
import { ThemeProvider, useTheme } from "./theme";

const events = { course: "OPEN_COURSE", assessment: "OPEN_ASSESSMENT", grill: "OPEN_GRILL", training: "OPEN_TRAINING", console: "OPEN_CONSOLE", lab: "OPEN_LAB", readiness: "OPEN_READINESS", mock: "OPEN_MOCK", operations: "OPEN_OPERATIONS", review: "OPEN_REVIEW" } as const;
const labels = { course: "Learn", assessment: "Baseline", grill: "Grill", training: "Training", console: "Console", lab: "Lab", readiness: "Readiness", mock: "Mock", operations: "Settings", review: "Review" } as const;
const views = Object.keys(events) as WorkspaceView[];

export function Workspace() {
  return <ThemeProvider><WorkspaceContent /></ThemeProvider>;
}

function WorkspaceContent() {
  const { preference, select } = useTheme();
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
    <ApplicationRail><div className="rail-brand" aria-label="Grill Me home"><span aria-hidden="true">&gt;_</span><strong>GRILL ME</strong></div><AccountStatus /><div className="rail-links">{views.map((view) => <button key={view} aria-current={state.matches(view) ? "page" : undefined} onClick={() => navigate({ view })}><span className="rail-glyph" aria-hidden="true">{labels[view].slice(0, 1)}</span><span>{labels[view]}</span></button>)}</div><label className="theme-control"><span>Theme</span><select aria-label="Color theme" value={preference} onChange={(event) => select(event.target.value as "dark" | "light" | "system")}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label></ApplicationRail>
    <div id="main-content" tabIndex={-1}>
    {state.matches("course") && (location.view === "course" && location.lessonId
      ? <App key={location.lessonId} initialLessonId={location.lessonId} onLessonChange={(lessonId) => { const destination = { view: "course" as const, lessonId }; setLocation(destination); workspaceNavigation.navigate(destination); }} />
      : <App key="course" onLessonChange={(lessonId) => { const destination = { view: "course" as const, lessonId }; setLocation(destination); workspaceNavigation.navigate(destination); }} />)}
    {state.matches("assessment") && <AssessmentView onOpenReview={() => navigate({ view: "review" })} />}
    {state.matches("grill") && <GrillView onOpenReview={() => navigate({ view: "review" })} />}
    {state.matches("training") && <TrainingView />}
    {state.matches("console") && <ConsoleView />}
    {state.matches("lab") && <LabView />}
    {state.matches("readiness") && <ReadinessView onOpenMock={() => navigate({ view: "mock" })} onDrill={(type) => navigate({ view: type === "assessment" ? "assessment" : type === "explanation" ? "grill" : type === "lab" ? "lab" : "training" })} />}
    {state.matches("mock") && <MockView onOpenReadiness={() => navigate({ view: "readiness" })} />}
    {state.matches("operations") && <OperationsView />}
    {state.matches("review") && <ReviewView courseId="aws-aip-c01" courseVersion="0.1.0" onOpenAssessment={() => navigate({ view: "assessment" })} />}
    </div>
  </>;
}
