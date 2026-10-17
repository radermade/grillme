import { createContext, useContext, type ReactNode } from "react";
import type { LearningFixtures } from "@grillme/content";
import type {
  AuthPort, AwsLabPort, ConnectivityPort, ContentReportPort, EntitlementPort,
  LabPort, PlatformPorts, PrivacyPort, ProductAnalyticsPort, ReadinessEvidencePort,
  ReleasePort, SupportPort, SyncPort, SyncQueuePort, UpdatePort,
} from "@grillme/platform";

export type LoadMetadata = () => Promise<{ version: string }>;
export type WorkspaceView = "course" | "assessment" | "grill" | "training" | "lab" | "readiness" | "mock" | "operations" | "review";
export type WorkspaceLocation = { view: WorkspaceView; lessonId?: string };
export interface WorkspaceNavigation {
  current(): WorkspaceLocation;
  navigate(location: WorkspaceLocation): void;
  subscribe(listener: (location: WorkspaceLocation) => void): () => void;
}

export type UiRuntime = {
  platform: PlatformPorts & { syncQueue: SyncQueuePort };
  auth: AuthPort;
  connectivity: ConnectivityPort;
  sync: SyncPort;
  labs: LabPort;
  aws: AwsLabPort;
  readiness: ReadinessEvidencePort;
  contentReports: ContentReportPort;
  analytics: ProductAnalyticsPort;
  privacy: PrivacyPort;
  entitlements: EntitlementPort;
  releases: ReleasePort;
  support: SupportPort;
  loadMetadata: LoadMetadata;
  updates: UpdatePort;
  fixtures: LearningFixtures;
  applicationPlatform: "desktop" | "web";
  workspaceNavigation: WorkspaceNavigation;
};

const RuntimeContext = createContext<UiRuntime | null>(null);

export function UiRuntimeProvider({ value, children }: { value: UiRuntime; children: ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useUiRuntime(): UiRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("UiRuntimeProvider is required.");
  return runtime;
}
