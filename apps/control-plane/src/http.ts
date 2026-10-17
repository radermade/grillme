import { EvaluationServiceError } from "./contracts";

type RequestLike = {
  method: string;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
};
type ResponseBody = { requestId?: string; result?: unknown; fallbackUsed?: boolean; error?: string };

const statusFor = (error: EvaluationServiceError): number => {
  if (error.code === "UNAUTHORIZED") return 401;
  if (error.code === "QUOTA_EXCEEDED") return 429;
  if (error.code === "RUBRIC_NOT_FOUND") return 404;
  return 400;
};

export const createEvaluationHttpHandler = (service: { evaluate(input: unknown): Promise<unknown> }) =>
  async (request: RequestLike): Promise<{ status: number; body: ResponseBody }> => {
    if (request.method !== "POST") return { status: 405, body: { error: "METHOD_NOT_ALLOWED" } };
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return { status: 415, body: { error: "UNSUPPORTED_MEDIA_TYPE" } };
    }
    const authorization = request.headers.get("authorization") ?? "";
    let body: unknown;
    try { body = await request.json(); }
    catch { return { status: 400, body: { error: "INVALID_JSON" } }; }
    if (!body || typeof body !== "object") return { status: 400, body: { error: "INVALID_REQUEST" } };
    try {
      const result = await service.evaluate({ ...body, authorization });
      return { status: 200, body: result as ResponseBody };
    } catch (error) {
      if (error instanceof EvaluationServiceError) {
        return { status: statusFor(error), body: { error: error.code } };
      }
      return { status: 503, body: { error: "EVALUATION_UNAVAILABLE" } };
    }
  };