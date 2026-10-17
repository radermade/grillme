import { z } from "zod";
import type { AccountRequest, AccountResponse } from "./account-http";

const version = z.string().min(1).max(100);
const body = async (request: AccountRequest) => {
  if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try { return await request.json(); } catch { return null; }
};
const failure = (error: unknown, fallback: string): AccountResponse => ({ status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : error instanceof Error && error.message === "INVALID_REQUEST" ? 400 : 503, body: { error: error instanceof Error && ["UNAUTHORIZED", "INVALID_REQUEST"].includes(error.message) ? error.message : fallback } });
export const createOperationsHttpHandlers = (services: {
  analytics: { ingest(authorization: string, input: unknown): Promise<unknown>; erase(authorization: string): Promise<void>; deleteUser(userId: string): Promise<void> };
  privacy: { request(authorization: string, input: unknown): Promise<unknown> };
  entitlements: { load(authorization: string): Promise<unknown> };
  support: { submit(authorization: string, input: unknown): Promise<unknown>; export(authorization: string): Promise<unknown> };
  releases: { assignment(channel: "dev" | "beta" | "stable", authorization: string, currentVersion: string): Promise<unknown> };
}) => {
  const auth = (request: AccountRequest) => request.headers.get("authorization") ?? "";
  return {
    analytics: async (request: AccountRequest): Promise<AccountResponse> => { const value = await body(request); if (!value) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 202, body: await services.analytics.ingest(auth(request), value) }; } catch (error) { return failure(error, "ANALYTICS_UNAVAILABLE"); } },
    analyticsDelete: async (request: AccountRequest): Promise<AccountResponse> => { if (await body(request) === null) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { await services.analytics.erase(auth(request)); return { status: 204, body: null }; } catch (error) { return failure(error, "ANALYTICS_UNAVAILABLE"); } },
    privacy: async (request: AccountRequest): Promise<AccountResponse> => { const value = await body(request); if (!value) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 202, body: await services.privacy.request(auth(request), value) }; } catch (error) { return failure(error, "PRIVACY_UNAVAILABLE"); } },
    entitlement: async (request: AccountRequest): Promise<AccountResponse> => { if (await body(request) === null) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await services.entitlements.load(auth(request)) }; } catch (error) { return failure(error, "ENTITLEMENT_UNAVAILABLE"); } },
    supportSubmit: async (request: AccountRequest): Promise<AccountResponse> => { const value = await body(request); if (!value) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 202, body: await services.support.submit(auth(request), value) }; } catch (error) { return failure(error, "SUPPORT_UNAVAILABLE"); } },
    supportExport: async (request: AccountRequest): Promise<AccountResponse> => { if (await body(request) === null) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await services.support.export(auth(request)) }; } catch (error) { return failure(error, "SUPPORT_UNAVAILABLE"); } },
    release: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ channel: z.enum(["dev", "beta", "stable"]), currentVersion: version }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await services.releases.assignment(parsed.data.channel, auth(request), parsed.data.currentVersion) }; } catch (error) { return failure(error, "RELEASE_UNAVAILABLE"); } },
  };
};
