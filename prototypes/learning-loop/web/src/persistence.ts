import type { Snapshot } from "xstate";

const key = "grillme.prototype.learning-loop.v2";

type Stored = { version: 2; snapshot: unknown };

export const loadSnapshot = (): unknown | undefined => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!parsed || typeof parsed !== "object") return undefined;
    const stored = parsed as Partial<Stored>;
    return stored.version === 2 && stored.snapshot ? stored.snapshot : undefined;
  } catch {
    return undefined;
  }
};

export const saveSnapshot = (snapshot: Snapshot<unknown>): void => {
  const stored: Stored = { version: 2, snapshot };
  localStorage.setItem(key, JSON.stringify(stored));
};

export const clearSnapshot = (): void => localStorage.removeItem(key);