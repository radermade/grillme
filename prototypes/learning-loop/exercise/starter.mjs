export class StructuredOutputError extends Error {
  code = "OUTPUT_REJECTED";

  constructor(categories) {
    super("The model did not return an acceptable response.");
    this.name = "StructuredOutputError";
    this.categories = categories;
  }
}

export async function getStructuredAnswer(callModel, maxAttempts) {
  const raw = await callModel();
  return JSON.parse(raw);
}