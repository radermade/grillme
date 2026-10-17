import { parseCommercialEntitlement } from "@grillme/content";
import type { CommercialEntitlement } from "@grillme/domain";
import type { AuthService } from "./contracts";

export interface CommercialEntitlementStore { get(userId: string): Promise<unknown | null>; put(value: CommercialEntitlement): Promise<void>; remove(userId: string): Promise<void> }
export const entitlementAllows = (value: CommercialEntitlement, courseId: string, feature: string, now: string) => {
  const unexpired = !value.expiresAt || Date.parse(value.expiresAt) > Date.parse(now);
  const grace = value.status === "past-due" && !!value.graceExpiresAt && Date.parse(value.graceExpiresAt) > Date.parse(now);
  return (value.status === "active" && unexpired || grace) && value.courseIds.includes(courseId) && value.features.includes(feature);
};
export const createCommercialEntitlementService = (auth: AuthService, store: CommercialEntitlementStore, now: () => string) => ({
  async load(authorization: string): Promise<CommercialEntitlement> { const identity = await auth.authenticate(authorization); if (!identity) throw new Error("UNAUTHORIZED"); const value = parseCommercialEntitlement(await store.get(identity.userId)); if (!value) throw new Error("NOT_FOUND"); return value; },
  async authorize(authorization: string, courseId: string, feature: string): Promise<boolean> { const identity = await auth.authenticate(authorization); if (!identity) return false; const value = parseCommercialEntitlement(await store.get(identity.userId)); return !!value && entitlementAllows(value, courseId, feature, now()); },
});
export const createMemoryCommercialEntitlementStore = (): CommercialEntitlementStore => { const values = new Map<string, CommercialEntitlement>(); return { async get(userId) { return values.get(userId) ?? null; }, async put(value) { values.set(value.userId, value); }, async remove(userId) { values.delete(userId); } }; };
