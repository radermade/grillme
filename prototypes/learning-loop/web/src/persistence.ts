import type { Snapshot } from "xstate";

const key = "grillme.prototype.learning-loop.v5";

type Stored = { version: 5; snapshot: unknown };

const isCurrentSnapshot = (snapshot: unknown): boolean => {
  if (!snapshot || typeof snapshot !== "object" || !("context" in snapshot)) return false;
  const context = (snapshot as { context?: unknown }).context;
  if (!context || typeof context !== "object") return false;
  const candidate = context as Record<string, unknown>;
  return typeof candidate.participantId === "string"
    && !!candidate.answers && typeof candidate.answers === "object"
    && !!candidate.lab && typeof candidate.lab === "object"
    && "evaluation" in candidate
    && !!candidate.feedback && typeof candidate.feedback === "object";
};

export const loadSnapshot = (): unknown | undefined => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!parsed || typeof parsed !== "object") return undefined;
    const stored = parsed as Partial<Stored>;
    return stored.version === 5 && isCurrentSnapshot(stored.snapshot)
      ? stored.snapshot
      : undefined;
  } catch {
    return undefined;
  }
};

export const saveSnapshot = (snapshot: Snapshot<unknown>): void => {
  const stored: Stored = { version: 5, snapshot };
  localStorage.setItem(key, JSON.stringify(stored));
};

export const clearSnapshot = (): void => localStorage.removeItem(key);