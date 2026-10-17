import { z } from "zod";
import { SyncServiceError } from "./sync";
import type { SessionGrant } from "./session";

export type AccountRequest = {
  method: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};
export type AccountResponse = { status: number; body: unknown };
const exchangeSchema = z.object({ code: z.string().min(1).max(2048), verifier: z.string().min(1).max(256), redirectUri: z.url().startsWith("https://") }).strict();
const refreshSchema = z.object({ refreshToken: z.string().min(1).max(4096) }).strict();
const pullSchema = z.object({ courseId: z.string().min(1).max(200), courseVersion: z.string().min(1).max(200) }).strict();
const bodyOf = async (request: AccountRequest): Promise<unknown | null> => {
  if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try { return await request.json(); } catch { return null; }
};
const unavailable = (): AccountResponse => ({ status: 503, body: { error: "SERVICE_UNAVAILABLE" } });

export const createSessionHttpHandlers = (service: {
  exchange(input: { code: string; verifier: string; redirectUri: string }): Promise<SessionGrant>;
  refresh(refreshToken: string): Promise<SessionGrant>;
  revoke(refreshToken: string): Promise<void>;
}) => ({
  exchange: async (request: AccountRequest): Promise<AccountResponse> => {
    const parsed = exchangeSchema.safeParse(await bodyOf(request));
    if (!parsed.success) return { status: 400, body: { error: "INVALID_AUTHORIZATION" } };
    try { return { status: 200, body: await service.exchange(parsed.data) }; } catch { return unavailable(); }
  },
  refresh: async (request: AccountRequest): Promise<AccountResponse> => {
    const parsed = refreshSchema.safeParse(await bodyOf(request));
    if (!parsed.success) return { status: 400, body: { error: "INVALID_REFRESH" } };
    try { return { status: 200, body: await service.refresh(parsed.data.refreshToken) }; } catch { return { status: 401, body: { error: "SESSION_EXPIRED" } }; }
  },
  revoke: async (request: AccountRequest): Promise<AccountResponse> => {
    const parsed = refreshSchema.safeParse(await bodyOf(request));
    if (!parsed.success) return { status: 400, body: { error: "INVALID_REFRESH" } };
    try { await service.revoke(parsed.data.refreshToken); return { status: 204, body: null }; } catch { return unavailable(); }
  },
});

export const createSyncHttpHandlers = (service: {
  push(authorization: string, input: unknown): Promise<unknown>;
  pull(authorization: string, courseId: string, courseVersion: string): Promise<unknown>;
}) => {
  const handleError = (error: unknown): AccountResponse => error instanceof SyncServiceError
    ? { status: error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : 400, body: { error: error.code } }
    : unavailable();
  return {
    push: async (request: AccountRequest): Promise<AccountResponse> => {
      const body = await bodyOf(request);
      if (!body) return { status: 400, body: { error: "INVALID_REQUEST" } };
      try { return { status: 200, body: await service.push(request.headers.get("authorization") ?? "", body) }; }
      catch (error) { return handleError(error); }
    },
    pull: async (request: AccountRequest): Promise<AccountResponse> => {
      const parsed = pullSchema.safeParse(await bodyOf(request));
      if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } };
      try { return { status: 200, body: await service.pull(request.headers.get("authorization") ?? "", parsed.data.courseId, parsed.data.courseVersion) }; }
      catch (error) { return handleError(error); }
    },
  };
};
