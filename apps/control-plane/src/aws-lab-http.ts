import { z } from "zod";
import type { AwsLabOperation } from "@grillme/domain";
import type { AccountRequest, AccountResponse } from "./account-http";
import { AwsLabServiceError } from "./aws-lab";

const id = z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_./-]+$/);
const operationSchema = z.object({ id, idempotencyKey: id, service: z.string().regex(/^[a-z0-9-]+$/), action: z.string().regex(/^[a-zA-Z0-9-]+:[a-zA-Z0-9]+$/), region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), resource: z.string().min(1).max(500), resourceTags: z.record(z.string().min(1).max(128), z.string().min(1).max(256)), estimatedCostUsd: z.number().finite().min(0).max(10_000) }).strict();
const body = async (request: AccountRequest) => {
  if (request.method !== "POST" || !(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try { return await request.json(); } catch { return null; }
};
const responseFor = (error: unknown): AccountResponse => {
  if (!(error instanceof AwsLabServiceError)) return { status: 503, body: { error: "AWS_LAB_UNAVAILABLE" } };
  const status = error.code === "UNAUTHORIZED" ? 401 : error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "EXPIRED" ? 410 : error.code === "SPEND_EXCEEDED" ? 429 : 400;
  return { status, body: { error: error.code } };
};
export const createAwsLabHttpHandlers = (service: {
  restore(authorization: string, labSessionId: string): Promise<unknown>;
  issue(authorization: string, labSessionId: string, policyId: string, policyVersion: string): Promise<unknown>;
  execute(authorization: string, leaseId: string, operation: AwsLabOperation): Promise<unknown>;
  revoke(authorization: string, leaseId: string): Promise<unknown>;
}) => {
  const auth = (request: AccountRequest) => request.headers.get("authorization") ?? "";
  return {
    restore: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ labSessionId: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.restore(auth(request), parsed.data.labSessionId) }; } catch (error) { return responseFor(error); } },
    issue: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ labSessionId: id, policyId: id, policyVersion: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.issue(auth(request), parsed.data.labSessionId, parsed.data.policyId, parsed.data.policyVersion) }; } catch (error) { return responseFor(error); } },
    execute: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ leaseId: id, operation: operationSchema }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.execute(auth(request), parsed.data.leaseId, parsed.data.operation) }; } catch (error) { return responseFor(error); } },
    revoke: async (request: AccountRequest): Promise<AccountResponse> => { const parsed = z.object({ leaseId: id }).strict().safeParse(await body(request)); if (!parsed.success) return { status: 400, body: { error: "INVALID_REQUEST" } }; try { return { status: 200, body: await service.revoke(auth(request), parsed.data.leaseId) }; } catch (error) { return responseFor(error); } },
  };
};
