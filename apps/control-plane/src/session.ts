import { parseAccountSession } from "@grillme/content";
import type { AccountSession } from "@grillme/domain";

export type SessionGrant = { session: AccountSession; accessToken: string; refreshToken: string };
export interface IdentityProvider {
  exchange(input: { code: string; verifier: string; redirectUri: string }): Promise<unknown>;
  refresh(refreshToken: string): Promise<unknown>;
  revoke(refreshToken: string): Promise<{ userId: string } | null>;
}
export interface AccountPrivilegeCleanup { revokeForUser(userId: string): Promise<void> }
const grant = (value: unknown): SessionGrant | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const session = parseAccountSession(candidate.session);
  return session && typeof candidate.accessToken === "string" && candidate.accessToken.length <= 4096
    && typeof candidate.refreshToken === "string" && candidate.refreshToken.length <= 4096
    ? { session, accessToken: candidate.accessToken, refreshToken: candidate.refreshToken } : null;
};
export const createSessionService = (provider: IdentityProvider, cleanup?: AccountPrivilegeCleanup) => ({
  async exchange(input: { code: string; verifier: string; redirectUri: string }): Promise<SessionGrant> {
    if (!input.code || input.code.length > 2048 || !input.verifier || input.verifier.length > 256 || !input.redirectUri.startsWith("https://")) throw new Error("INVALID_AUTHORIZATION");
    const result = grant(await provider.exchange(input));
    if (!result) throw new Error("INVALID_SESSION");
    return result;
  },
  async refresh(refreshToken: string): Promise<SessionGrant> {
    if (!refreshToken || refreshToken.length > 4096) throw new Error("INVALID_REFRESH");
    const result = grant(await provider.refresh(refreshToken));
    if (!result) throw new Error("INVALID_SESSION");
    return result;
  },
  async revoke(refreshToken: string): Promise<void> {
    if (!refreshToken || refreshToken.length > 4096) return;
    const revoked = await provider.revoke(refreshToken);
    if (revoked) await cleanup?.revokeForUser(revoked.userId);
  },
});
export const composePrivilegeCleanup = (...cleanups: AccountPrivilegeCleanup[]): AccountPrivilegeCleanup => ({
  async revokeForUser(userId) {
    const results = await Promise.allSettled(cleanups.map((cleanup) => cleanup.revokeForUser(userId)));
    if (results.some(({ status }) => status === "rejected")) throw new Error("PRIVILEGE_CLEANUP_FAILED");
  },
});
