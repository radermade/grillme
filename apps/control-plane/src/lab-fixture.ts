import type { PrivateLabDefinition } from "./lab-contracts";

export const bedrockReliabilityLab: PrivateLabDefinition = {
  schemaVersion: 1, id: "bedrock-reliable-request", version: "1", courseId: "aws-aip-c01", courseVersion: "0.1.0",
  title: "Build a reliable Bedrock request", description: "Controlled Bedrock SDK reliability fixture.",
  imageDigest: `sha256:${"a".repeat(64)}`, maxDurationMinutes: 30, maxAttempts: 3, estimatedCostUnits: 1,
  starterFiles: [{ path: "/workspace/request.ts", content: "export const requestPolicy = { retries: 0, schema: false, blockUnsafe: false, telemetry: 'raw' };" }],
  checkpoints: [{ id: "reliability", title: "Harden the request path", objective: "Configure a reliable request policy.", instructions: "Use controlled operations.", hints: ["Bound retries.", "Validate output.", "Sanitize telemetry."] }],
  debrief: { explanation: "Reliable requests use bounded retries and validated output.", prevention: "Centralize and deterministically test safety controls." },
  validators: { reliability: [
    { id: "retry-limit", operation: "set-retry-limit", expected: true, message: "Set the retry limit." },
    { id: "strict-schema", operation: "enable-strict-schema", expected: true, message: "Enable strict output schema validation." },
    { id: "output-blocking", operation: "enable-output-blocking", expected: true, message: "Block unsafe output." },
    { id: "sanitized-telemetry", operation: "sanitize-telemetry", expected: true, message: "Exclude raw model output from telemetry." }
  ] }
};
