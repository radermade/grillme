import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { learningFixtures } from "@grillme/content";
import { ErrorBoundary, UiRuntimeProvider, Workspace, type UiRuntime } from "@grillme/ui";
import {
  analytics, auth, connectivity, contentReports, entitlements, labs, loadMetadata,
  platform, privacy, queue, readinessEvidence, releases, remote, restrictedAws,
  support, updates,
} from "./adapters";
import { webNavigation } from "./routes";
import "@grillme/ui/styles.css";

const runtime: UiRuntime = {
  platform: { ...platform, syncQueue: queue }, auth, connectivity, sync: remote,
  labs, aws: restrictedAws, readiness: readinessEvidence, contentReports,
  analytics, privacy, entitlements, releases, support, loadMetadata, updates,
  fixtures: learningFixtures, applicationPlatform: "web", workspaceNavigation: webNavigation,
};

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Application root is unavailable.");
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary><UiRuntimeProvider value={runtime}><Workspace /></UiRuntimeProvider></ErrorBoundary>
  </StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register("/sw.js"));
}
