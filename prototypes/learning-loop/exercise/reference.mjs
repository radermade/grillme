const unsafePattern = /<script|javascript:/i;

export class StructuredOutputError extends Error {
  code = "OUTPUT_REJECTED";

  constructor(categories) {
    super("The model did not return an acceptable response.");
    this.name = "StructuredOutputError";
    this.categories = categories;
  }
}

function validate(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "schema";
  }

  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "answer" || keys[1] !== "confidence") {
    return "schema";
  }

  if (typeof value.answer !== "string" || value.answer.trim().length === 0 || value.answer.length > 200) {
    return "schema";
  }

  if (unsafePattern.test(value.answer)) {
    return "safety";
  }

  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    return "schema";
  }

  return null;
}

export async function getStructuredAnswer(callModel, maxAttempts) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
    throw new RangeError("maxAttempts must be an integer from 1 through 3.");
  }

  const categories = [];
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const raw = await callModel();
      let value;
      try {
        value = JSON.parse(raw);
      } catch {
        categories.push("parse");
        continue;
      }

      const category = validate(value);
      if (category) {
        categories.push(category);
        continue;
      }

      return value;
    } catch (error) {
      if (error instanceof StructuredOutputError || error instanceof RangeError) throw error;
      categories.push("model");
    }
  }

  throw new StructuredOutputError(categories);
}