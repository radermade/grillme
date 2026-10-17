import { parseProductAnalyticsEvents } from "@grillme/content";
import type { BetaMetrics, ProductAnalyticsEvent } from "@grillme/domain";
import type { AuthService } from "./contracts";

export interface AnalyticsStore {
  append(userId: string, event: ProductAnalyticsEvent, deleteAfter: string): Promise<"accepted" | "duplicate">;
  list(): Promise<{ userId: string; event: ProductAnalyticsEvent; deleteAfter: string }[]>;
  deleteUser(userId: string): Promise<void>;
  purge(before: string): Promise<number>;
}
const addDays = (value: string, days: number) => new Date(Date.parse(value) + days * 86_400_000).toISOString();
export const createAnalyticsService = (auth: AuthService, store: AnalyticsStore, retentionDays = 90) => ({
  async ingest(authorization: string, input: unknown): Promise<{ accepted: number }> {
    const identity = await auth.authenticate(authorization);
    if (!identity) throw new Error("UNAUTHORIZED");
    const events = parseProductAnalyticsEvents(input);
    if (!events.length) throw new Error("INVALID_REQUEST");
    let accepted = 0;
    for (const event of events) if (await store.append(identity.userId, event, addDays(event.occurredAt, retentionDays)) === "accepted") accepted += 1;
    return { accepted };
  },
  async erase(authorization: string): Promise<void> {
    const identity = await auth.authenticate(authorization);
    if (!identity) throw new Error("UNAUTHORIZED");
    await store.deleteUser(identity.userId);
  },
  deleteUser: async (userId: string) => store.deleteUser(userId),
  purge: async (now: string) => store.purge(now),
  async metrics(): Promise<BetaMetrics> {
    const records = await store.list();
    const learners = new Set(records.map(({ userId }) => userId));
    const openedBy = new Map<string, number>();
    for (const { userId, event } of records) if (event.name === "app.opened") openedBy.set(userId, (openedBy.get(userId) ?? 0) + 1);
    const learning = records.filter((item) => item.event.name === "learning.finished");
    const completions = learning.filter((item) => item.event.name === "learning.finished" && item.event.fields.outcome === "completed");
    const rate = (type: "grill" | "lab" | "review") => { const relevant = learning.filter((item) => item.event.name === "learning.finished" && item.event.fields.activityType === type); return relevant.length ? relevant.filter((item) => item.event.name === "learning.finished" && item.event.fields.outcome === "completed").length / relevant.length : 0; };
    const readiness = new Map<string, number[]>();
    for (const { userId, event } of records) if (event.name === "readiness.sampled") readiness.set(userId, [...(readiness.get(userId) ?? []), event.fields.score]);
    const costs = records.reduce((sum, { event }) => sum + (event.name === "usage.costed" ? event.fields.costUnits : 0), 0);
    const supportRequests = records.filter(({ event }) => event.name === "support.requested").length;
    const returningLearners = [...openedBy.values()].filter((count) => count > 1).length;
    return {
      activeLearners: learners.size,
      returningLearners,
      returnRate: learners.size ? returningLearners / learners.size : 0,
      learningCompletions: completions.length,
      learningFailures: learning.filter((item) => item.event.name === "learning.finished" && item.event.fields.outcome === "failed").length,
      grillCompletionRate: rate("grill"),
      labSuccessRate: rate("lab"),
      reviewCompletionRate: rate("review"),
      learnersWithReadinessIncrease: [...readiness.values()].filter((scores) => scores.length > 1 && scores.at(-1)! > scores[0]!).length,
      supportRequests,
      supportRequestsPerActiveLearner: learners.size ? supportRequests / learners.size : 0,
      syncConflicts: records.filter(({ event }) => event.name === "sync.finished" && event.fields.outcome === "conflict").length,
      totalCostUnits: costs,
      costPerActiveLearner: learners.size ? costs / learners.size : 0,
    };
  },
});
export const createMemoryAnalyticsStore = (): AnalyticsStore => {
  let records: { userId: string; event: ProductAnalyticsEvent; deleteAfter: string }[] = [];
  return { async append(userId, event, deleteAfter) { if (records.some((item) => item.userId === userId && item.event.idempotencyKey === event.idempotencyKey)) return "duplicate"; records.push({ userId, event, deleteAfter }); return "accepted"; }, async list() { return [...records]; }, async deleteUser(userId) { records = records.filter((item) => item.userId !== userId); }, async purge(before) { const initial = records.length; records = records.filter(({ deleteAfter }) => Date.parse(deleteAfter) > Date.parse(before)); return initial - records.length; } };
};
