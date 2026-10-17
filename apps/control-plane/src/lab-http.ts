import { z } from "zod";
import { LabServiceError } from "./lab";
import type { LabOperation } from "@grillme/domain";
import type { AccountRequest, AccountResponse } from "./account-http";

const id = z.string().min(1).max(300).regex(/^[a-zA-Z0-9:_-]+$/);
const operations = z.enum(["set-retry-limit", "enable-strict-schema", "enable-output-blocking", "sanitize-telemetry", "reset-workspace"]);
const body = async (request: AccountRequest) => {
  if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try { return await request.json(); } catch { return null; }
};
const errorResponse = (error: unknown): AccountResponse => {
  if (!(error instanceof LabServiceError)) return { status: 503, body: { error: "LAB_UNAVAILABLE" } };
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "QUOTA_EXCEEDED" ? 429 : error.code === "NOT_FOUND" ? 404 : error.code === "EXPIRED" ? 410 : error.code === "UNAVAILABLE" ? 503 : 400;
  return { status, body: { error: error.code === "UNAVAILABLE" ? "LAB_UNAVAILABLE" : error.code } };
};
export const createLabHttpHandlers = (service: {
  provision(authorization: string, labId: string, labVersion: string): Promise<unknown>;
  status(authorization: string, sessionId: string): Promise<unknown>;
  operate(authorization: string, sessionId: string, operation: LabOperation): Promise<void>;
  validate(authorization: string, sessionId: string, checkpointId: string, attemptId: string): Promise<unknown>;
  stop(authorization: string, sessionId: string): Promise<unknown>;
}) => {
  const authorization = (request: AccountRequest) => request.headers.get("authorization") ?? "";
  return {
    provision: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ labId: id, labVersion: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.provision(authorization(request), parsed.data.labId, parsed.data.labVersion) }; } catch (error) { return errorResponse(error); } },
    status: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ sessionId: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.status(authorization(request), parsed.data.sessionId) }; } catch (error) { return errorResponse(error); } },
    operate: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ sessionId: id, operation: operations }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { await service.operate(authorization(request), parsed.data.sessionId, parsed.data.operation); return { status: 204, body: null }; } catch (error) { return errorResponse(error); } },
    validate: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ sessionId: id, checkpointId: id, attemptId: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.validate(authorization(request), parsed.data.sessionId, parsed.data.checkpointId, parsed.data.attemptId) }; } catch (error) { return errorResponse(error); } },
    stop: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ sessionId: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.stop(authorization(request), parsed.data.sessionId) }; } catch (error) { return errorResponse(error); } },
  };
};
