import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { PlatformPorts, StoragePort, UpdatePort } from "@grillme/platform";

const storage: StoragePort = {
  async get(key) {
    try { return JSON.parse(localStorage.getItem(key) ?? "null") as unknown; }
    catch { return null; }
  },
  async set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  async append(key, value) {
    const current = await this.get(key);
    const values = Array.isArray(current) ? current : [];
    const idempotencyKey = value && typeof value === "object" && "idempotencyKey" in value
      ? String(value.idempotencyKey)
      : null;
    if (idempotencyKey && values.some((entry) =>
      entry && typeof entry === "object" && "idempotencyKey" in entry
      && String(entry.idempotencyKey) === idempotencyKey)) return;
    localStorage.setItem(key, JSON.stringify([...values, value]));
  },
  async remove(key) { localStorage.removeItem(key); },
};

export const platform: PlatformPorts = {
  storage,
  telemetry: { record: () => undefined },
  clock: { now: () => new Date().toISOString() },
  ids: { create: () => crypto.randomUUID() },
  navigation: {
    async openExternal(value) {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("Only secure external links are allowed.");
      if (!("__TAURI_INTERNALS__" in window)) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      await openUrl(url.toString());
    },
  },
};

export const updates: UpdatePort = { async check() { return { available: false }; } };

export const loadMetadata = async (): Promise<{ version: string }> => {
  if (!("__TAURI_INTERNALS__" in window)) return { version: "web-preview" };
  try { return await invoke<{ version: string }>("app_metadata"); }
  catch { throw new Error("Application metadata is unavailable."); }
};