import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Workspace } from "./Workspace";
import { ErrorBoundary } from "./ErrorBoundary";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#root");
if (!root) throw new Error("Application root is unavailable.");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary><Workspace /></ErrorBoundary>
  </StrictMode>,
);