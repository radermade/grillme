import { parsePrivacyRequest } from "@grillme/content";
import type { PrivacyRequest, PrivacyRequestReceipt } from "@grillme/domain";
import type { AuthService } from "./contracts";

export interface PrivacyRequestStore {
  get(userId: string, idempotencyKey: string): Promise<PrivacyRequestReceipt | null>;
  put(userId: string, idempotencyKey: string, receipt: PrivacyRequestReceipt): Promise<void>;
  completedServices(userId: string, requestId: string): Promise<string[]>;
  markServiceComplete(userId: string, requestId: string, serviceId: string): Promise<void>;
}
export interface UserDataService { readonly id: string; export(userId: string): Promise<void>; delete(userId: string): Promise<void> }
export const createPrivacyService = (auth: AuthService, requests: PrivacyRequestStore, dataServices: UserDataService[], clock: { now(): string }) => ({
  async request(authorization: string, input: unknown): Promise<PrivacyRequestReceipt> {
    const identity = await auth.authenticate(authorization);
    if (!identity) throw new Error("UNAUTHORIZED");
    const request = parsePrivacyRequest(input);
    if (!request) throw new Error("INVALID_REQUEST");
    const existing = await requests.get(identity.userId, request.idempotencyKey);
    if (existing) return existing;
    const receipt: PrivacyRequestReceipt = { requestId: request.id, type: request.type, status: request.type === "export" ? "ready" : "scheduled", availableUntil: request.type === "export" ? new Date(Date.parse(clock.now()) + 7 * 86_400_000).toISOString() : null };
    if (request.type === "export") for (const service of dataServices) await service.export(identity.userId);
    await requests.put(identity.userId, request.idempotencyKey, receipt);
    return receipt;
  },
  async executeDeletion(userId: string, requestId: string): Promise<PrivacyRequestReceipt> {
    const completed = new Set(await requests.completedServices(userId, requestId));
    for (const service of dataServices) {
      if (completed.has(service.id)) continue;
      await service.delete(userId);
      await requests.markServiceComplete(userId, requestId, service.id);
    }
    const receipt: PrivacyRequestReceipt = { requestId, type: "delete", status: "complete", availableUntil: null };
    await requests.put(userId, requestId, receipt);
    return receipt;
  },
});
export const createMemoryPrivacyRequestStore = (): PrivacyRequestStore => {
  const values = new Map<string, PrivacyRequestReceipt>();
  const completed = new Map<string, Set<string>>();
  return {
    async get(userId, key) { return values.get(`${userId}:${key}`) ?? null; },
    async put(userId, key, value) { values.set(`${userId}:${key}`, value); },
    async completedServices(userId, requestId) { return [...(completed.get(`${userId}:${requestId}`) ?? [])]; },
    async markServiceComplete(userId, requestId, serviceId) { const key = `${userId}:${requestId}`; completed.set(key, new Set([...(completed.get(key) ?? []), serviceId])); },
  };
};
