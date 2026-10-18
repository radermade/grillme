import type { AuthService } from "./contracts";
import type { LearnerMitigationStore } from "./drift-operations-contracts";

export const createLearnerDriftMitigationService = (auth: AuthService, store: LearnerMitigationStore) => ({
  async load(authorization: string, affectedId: string) {
    if (!await auth.authenticate(authorization)) throw new Error("UNAUTHORIZED");
    if (!/^[a-z0-9-]{1,100}$/.test(affectedId)) throw new Error("INVALID_REQUEST");
    return (await store.listByAffected(affectedId)).map(({ status, notice, appliedAt }) => ({ status, notice, appliedAt }));
  },
});