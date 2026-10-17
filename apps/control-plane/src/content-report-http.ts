import type { AccountRequest, AccountResponse } from "./account-http";

export const createContentReportHttpHandler = (service: { submit(authorization: string, input: unknown): Promise<unknown> }) => async (request: AccountRequest): Promise<AccountResponse> => {
  if (request.method !== "POST") return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { status: 415, body: { error: "UNSUPPORTED_MEDIA_TYPE" } };
  let body: unknown;
  try { body = await request.json(); } catch { return { status: 400, body: { error: "INVALID_JSON" } }; }
  try { return { status: 202, body: await service.submit(request.headers.get("authorization") ?? "", body) }; }
  catch (error) { return { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : error instanceof Error && error.message === "INVALID_REQUEST" ? 400 : 503, body: { error: error instanceof Error && error.message === "UNAUTHORIZED" ? "UNAUTHORIZED" : error instanceof Error && error.message === "INVALID_REQUEST" ? "INVALID_REQUEST" : "REPORT_UNAVAILABLE" } }; }
};
