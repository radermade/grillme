import type { WorkspaceLocation, WorkspaceNavigation } from "@grillme/ui";

const views = new Set<WorkspaceLocation["view"]>(["course", "assessment", "grill", "training", "lab", "readiness", "mock", "operations", "review"]);
export const parseWebLocation = (pathname: string): WorkspaceLocation => {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "learn") {
    const lessonId = segments[1]?.slice(0, 100);
    return lessonId ? { view: "course", lessonId } : { view: "course" };
  }
  const view = segments[0] as WorkspaceLocation["view"] | undefined;
  return view && views.has(view) ? { view } : { view: "course" };
};
const pathFor = (location: WorkspaceLocation) => location.view === "course"
  ? location.lessonId ? `/learn/${encodeURIComponent(location.lessonId)}` : "/learn"
  : `/${location.view}`;
export const webNavigation: WorkspaceNavigation = {
  current: () => parseWebLocation(location.pathname),
  navigate(destination) { history.pushState(null, "", pathFor(destination)); },
  subscribe(listener) { const pop = () => listener(parseWebLocation(location.pathname)); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); },
};
