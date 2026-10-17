import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { learningFixtures } from "@grillme/content";
import { ErrorBoundary, UiRuntimeProvider, Workspace, type UiRuntime } from "@grillme/ui";
import {
  analytics, auth, connectivity, contentReports, entitlements, labs, loadMetadata,
  platform, privacy, readinessEvidence, releases, restrictedAws, semanticConsole, support,
  syncQueue, syncRemote, updates, workspaceNavigation,
} from "./adapters";
import "@grillme/ui/styles.css";

const runtime: UiRuntime = {
  platform: { ...platform, syncQueue }, auth, connectivity, sync: syncRemote,
  labs, console: semanticConsole, aws: restrictedAws, readiness: readinessEvidence, contentReports,
  analytics, privacy, entitlements, releases, support, loadMetadata, updates,
  fixtures: learningFixtures, applicationPlatform: "desktop", workspaceNavigation,
};

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Application root is unavailable.");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary><UiRuntimeProvider value={runtime}><Workspace /></UiRuntimeProvider></ErrorBoundary>
  </StrictMode>,
);
