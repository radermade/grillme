import { parseSupportSnapshot } from "@grillme/content";
import type { SupportSnapshot } from "@grillme/domain";
import type { AuthService } from "./contracts";

export interface SupportSnapshotStore { put(userId: string, snapshot: SupportSnapshot): Promise<void>; list(userId: string): Promise<SupportSnapshot[]>; deleteUser(userId: string): Promise<void> }
export const createSupportService = (auth: AuthService, store: SupportSnapshotStore) => ({
  async submit(authorization: string, input: unknown): Promise<{ accepted: true }> { const identity = await auth.authenticate(authorization); if (!identity) throw new Error("UNAUTHORIZED"); const snapshot = parseSupportSnapshot(input); if (!snapshot) throw new Error("INVALID_REQUEST"); await store.put(identity.userId, snapshot); return { accepted: true }; },
  async export(authorization: string): Promise<SupportSnapshot[]> { const identity = await auth.authenticate(authorization); if (!identity) throw new Error("UNAUTHORIZED"); return store.list(identity.userId); },
});
export const createMemorySupportSnapshotStore = (): SupportSnapshotStore => { const values = new Map<string, SupportSnapshot[]>(); return { async put(userId, snapshot) { values.set(userId, [...(values.get(userId) ?? []), snapshot].slice(-20)); }, async list(userId) { return [...(values.get(userId) ?? [])]; }, async deleteUser(userId) { values.delete(userId); } }; };
