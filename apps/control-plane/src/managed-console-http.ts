import { z } from "zod";
import type { AccountRequest, AccountResponse } from "./account-http";
import { ManagedConsoleError } from "./managed-console";

const id = z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_./-]+$/);
const body = async (request: AccountRequest) => { if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null; try { return await request.json(); } catch { return null; } };
const responseFor = (error: unknown): AccountResponse => {
  if (!(error instanceof ManagedConsoleError)) return { status: 503, body: { error: "MANAGED_CONSOLE_UNAVAILABLE" } };
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "EXPIRED" ? 410 : error.code === "RATE_LIMITED" || error.code === "BUDGET_EXCEEDED" ? 429 : error.code === "UNAVAILABLE" ? 503 : 400;
  return { status, body: { error: error.code } };
};
export const createManagedConsoleHttpHandlers = (service: {
  launch(authorization: string, labSessionId: string, policyId: string, policyVersion: string): Promise<unknown>;
  restore(authorization: string, labSessionId: string): Promise<unknown>;
  status(authorization: string, sessionId: string): Promise<unknown>;
  budget(authorization: string, sessionId: string): Promise<unknown>;
  validate(authorization: string, sessionId: string, checkpointId: string): Promise<unknown>;
  revoke(authorization: string, sessionId: string): Promise<unknown>;
  revokeForLab(authorization: string, labSessionId: string): Promise<unknown>;
}) => {
  const auth = (request: AccountRequest) => request.headers.get("authorization") ?? "";
  const execute = async (request: AccountRequest, schema: z.ZodType, handler: (value: Record<string, string>) => Promise<unknown>): Promise<AccountResponse> => { const parsed = schema.safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await handler(parsed.data as Record<string, string>) }; } catch (error) { return responseFor(error); } };
  return {
    launch: (request: AccountRequest) => execute(request, z.object({ labSessionId: id, policyId: id, policyVersion: id }).strict(), (value) => service.launch(auth(request), value.labSessionId!, value.policyId!, value.policyVersion!)),
    restore: (request: AccountRequest) => execute(request, z.object({ labSessionId: id }).strict(), (value) => service.restore(auth(request), value.labSessionId!)),
    status: (request: AccountRequest) => execute(request, z.object({ sessionId: id }).strict(), (value) => service.status(auth(request), value.sessionId!)),
    budget: (request: AccountRequest) => execute(request, z.object({ sessionId: id }).strict(), (value) => service.budget(auth(request), value.sessionId!)),
    validate: (request: AccountRequest) => execute(request, z.object({ sessionId: id, checkpointId: id }).strict(), (value) => service.validate(auth(request), value.sessionId!, value.checkpointId!)),
    revoke: (request: AccountRequest) => execute(request, z.object({ sessionId: id }).strict(), (value) => service.revoke(auth(request), value.sessionId!)),
    revokeForLab: (request: AccountRequest) => execute(request, z.object({ labSessionId: id }).strict(), (value) => service.revokeForLab(auth(request), value.labSessionId!)),
  };
};