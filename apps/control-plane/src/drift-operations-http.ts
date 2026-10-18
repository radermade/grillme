import { z } from "zod";
import type { AccountRequest, AccountResponse } from "./account-http";
import { DriftOperationsError } from "./drift-operations";

const id = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/); const timestamp = z.iso.datetime({ offset: true });
const body = async (request: AccountRequest) => { if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null; try { return await request.json(); } catch { return null; } };
const responseFor = (error: unknown): AccountResponse => { if (!(error instanceof DriftOperationsError)) return { status: 503, body: { error: "DRIFT_OPERATIONS_UNAVAILABLE" } }; const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "INVALID_REQUEST" || error.code === "INVALID_STATE" ? 400 : 409; return { status, body: { error: error.code } }; };
export const createDriftOperationsHttpHandlers = (service: {
  get(authorization: string, caseId: string): Promise<unknown>;
  triage(authorization: string, caseId: string, input: { severity: "critical" | "high" | "medium" | "low"; ownerId: string; dueAt: string }): Promise<unknown>;
  investigate(authorization: string, caseId: string): Promise<unknown>;
  mitigate(authorization: string, caseId: string, actions: import("@grillme/domain").DriftMitigationAction[], notice: string): Promise<unknown>;
  beginCorrection(authorization: string, caseId: string): Promise<unknown>;
  review(authorization: string, caseId: string, decision: "approved" | "changes-required"): Promise<unknown>;
  runCanaries(authorization: string, caseId: string): Promise<unknown>;
  release(authorization: string, caseId: string, policy: "pin-active-sessions" | "force-migrate-new-sessions"): Promise<unknown>;
  rollback(authorization: string, caseId: string, reason: string): Promise<unknown>;
  close(authorization: string, caseId: string): Promise<unknown>;
}) => {
  const auth = (request: AccountRequest) => request.headers.get("authorization") ?? "";
  const execute = async (request: AccountRequest, schema: z.ZodType, run: (value: Record<string, unknown>) => Promise<unknown>): Promise<AccountResponse> => { const parsed = schema.safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await run(parsed.data as Record<string, unknown>) }; } catch (error) { return responseFor(error); } };
  const caseId = z.object({ caseId: id }).strict();
  return {
    get: (request: AccountRequest) => execute(request, caseId, (value) => service.get(auth(request), value.caseId as string)),
    triage: (request: AccountRequest) => execute(request, z.object({ caseId: id, severity: z.enum(["critical", "high", "medium", "low"]), ownerId: id, dueAt: timestamp }).strict(), (value) => service.triage(auth(request), value.caseId as string, value as { severity: "critical" | "high" | "medium" | "low"; ownerId: string; dueAt: string })),
    investigate: (request: AccountRequest) => execute(request, caseId, (value) => service.investigate(auth(request), value.caseId as string)),
    mitigate: (request: AccountRequest) => execute(request, z.object({ caseId: id, actions: z.array(z.enum(["mark-guidance-stale", "disable-provisioning", "disable-validator", "allow-active-session-continuation"])).min(1).max(4), notice: z.string().min(1).max(500) }).strict(), (value) => service.mitigate(auth(request), value.caseId as string, value.actions as import("@grillme/domain").DriftMitigationAction[], value.notice as string)),
    beginCorrection: (request: AccountRequest) => execute(request, caseId, (value) => service.beginCorrection(auth(request), value.caseId as string)),
    review: (request: AccountRequest) => execute(request, z.object({ caseId: id, decision: z.enum(["approved", "changes-required"]) }).strict(), (value) => service.review(auth(request), value.caseId as string, value.decision as "approved" | "changes-required")),
    canaries: (request: AccountRequest) => execute(request, caseId, (value) => service.runCanaries(auth(request), value.caseId as string)),
    release: (request: AccountRequest) => execute(request, z.object({ caseId: id, grandfatheringPolicy: z.enum(["pin-active-sessions", "force-migrate-new-sessions"]) }).strict(), (value) => service.release(auth(request), value.caseId as string, value.grandfatheringPolicy as "pin-active-sessions" | "force-migrate-new-sessions")),
    rollback: (request: AccountRequest) => execute(request, z.object({ caseId: id, reason: z.string().min(1).max(1_000) }).strict(), (value) => service.rollback(auth(request), value.caseId as string, value.reason as string)),
    close: (request: AccountRequest) => execute(request, caseId, (value) => service.close(auth(request), value.caseId as string)),
  };
};