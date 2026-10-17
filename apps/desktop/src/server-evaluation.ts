import type { EvaluationRequest } from "@grillme/domain";
import type { EvaluationPort } from "@grillme/platform";

export const createServerEvaluationPort = (options: {
  endpoint: string;
  getAuthorization(): Promise<string>;
  createRequestId(): string;
}): EvaluationPort => ({
  async evaluate(request: EvaluationRequest, signal: AbortSignal): Promise<unknown> {
    const endpoint = new URL(options.endpoint);
    if (endpoint.protocol !== "https:") throw new Error("Evaluation endpoint must use HTTPS.");
    const authorization = await options.getAuthorization();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "authorization": authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requestId: options.createRequestId(),
        request,
      }),
      signal,
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("Evaluation service rejected the request.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("result" in body)) {
      throw new Error("Evaluation service returned an invalid envelope.");
    }
    return body.result;
  },
});