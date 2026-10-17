import type { SyncEvent } from "@grillme/domain";
import type { EventStore } from "./sync";

export const createMemoryEventStore = (): EventStore => {
  const values = new Map<string, SyncEvent[]>();
  const key = (userId: string, courseId: string) => `${userId}:${courseId}`;
  return {
    async list(userId, courseId) { return [...(values.get(key(userId, courseId)) ?? [])]; },
    async append(userId, event) {
      const storageKey = key(userId, event.courseId);
      const current = values.get(storageKey) ?? [];
      if (current.some(({ idempotencyKey }) => idempotencyKey === event.idempotencyKey)) return "duplicate";
      if (event.scored && current.some((candidate) => candidate.scored && candidate.type === event.type && candidate.entityId === event.entityId && candidate.attempt === event.attempt)) return "scored-conflict";
      values.set(storageKey, [...current, event]);
      return "accepted";
    },
  };
};
