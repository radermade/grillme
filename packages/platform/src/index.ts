export interface StoragePort {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  append(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface SecureStoragePort { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void>; remove(key: string): Promise<void> }
export interface HttpPort { request(input: { url: string; method: "GET" | "POST"; body?: unknown }): Promise<unknown> }
export interface ConnectivityPort { current(): "online" | "offline"; subscribe(listener: (state: "online" | "offline") => void): () => void }
export interface TelemetryPort { record(event: { name: string; fields: Record<string, string | number | boolean> }): void }
export interface ClockPort { now(): string }
export interface IdPort { create(): string }
export interface LifecyclePort { onSuspend(listener: () => void): () => void }
export interface UpdatePort { check(): Promise<{ available: boolean; version?: string }> }
export interface NavigationPort { openExternal(url: string): Promise<void> }
export type PlatformPorts = {
  storage: StoragePort;
  telemetry: TelemetryPort;
  clock: ClockPort;
  ids: IdPort;
  navigation: NavigationPort;
};