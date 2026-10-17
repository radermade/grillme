export type StructuredAnswer = {
  answer: string;
  confidence: number;
};

export type FailureCategory = "parse" | "schema" | "safety" | "model";

export class StructuredOutputError extends Error {
  readonly code = "OUTPUT_REJECTED";

  constructor(readonly categories: FailureCategory[]) {
    super("The model did not return an acceptable response.");
    this.name = "StructuredOutputError";
  }
}

export async function getStructuredAnswer(
  callModel: () => Promise<string>,
  maxAttempts: number,
): Promise<StructuredAnswer> {
  const raw = await callModel();
  return JSON.parse(raw) as StructuredAnswer;
}