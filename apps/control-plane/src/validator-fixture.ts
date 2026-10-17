import type { CompatibilityEntry, ValidatorBundle } from "@grillme/domain";

export const bedrockValidatorBundle: ValidatorBundle = {
  schemaVersion: 1, id: "bedrock-reliability-bundle", version: "1.0.0", validatorId: "bedrock-reliability", validatorVersion: "1.0.0", labId: "bedrock-reliable-request", labVersion: "1", status: "active",
  checks: { reliability: [
    { id: "retry-limit", operation: "set-retry-limit", expected: true, message: "Set the retry limit." },
    { id: "strict-schema", operation: "enable-strict-schema", expected: true, message: "Enable strict output schema validation." },
    { id: "output-blocking", operation: "enable-output-blocking", expected: true, message: "Block unsafe output." },
    { id: "sanitized-telemetry", operation: "sanitize-telemetry", expected: true, message: "Exclude raw model output from telemetry." },
  ] },
  fixtures: [
    { id: "bedrock-good", capability: "bedrock", kind: "known-good", checkpointId: "reliability", observedState: { "model-available": true, "guardrail-active": true }, expectedState: { "model-available": true, "guardrail-active": true }, expectedStatus: "passed", expectedFailedCheckIds: [] },
    { id: "bedrock-bad", capability: "bedrock", kind: "known-bad", checkpointId: "reliability", observedState: { "model-available": true, "guardrail-active": false }, expectedState: { "model-available": true, "guardrail-active": true }, expectedStatus: "failed", expectedFailedCheckIds: ["guardrail-active"] },
    { id: "bedrock-unsupported", capability: "bedrock", kind: "unsupported", checkpointId: "unknown-checkpoint", observedState: {}, expectedState: {}, expectedStatus: "inconclusive", expectedFailedCheckIds: [] },
    { id: "iam-good", capability: "iam", kind: "known-good", checkpointId: "iam-policy", observedState: { "least-privilege": true }, expectedState: { "least-privilege": true }, expectedStatus: "passed", expectedFailedCheckIds: [] },
    { id: "iam-bad", capability: "iam", kind: "known-bad", checkpointId: "iam-policy", observedState: { "least-privilege": false }, expectedState: { "least-privilege": true }, expectedStatus: "failed", expectedFailedCheckIds: ["least-privilege"] },
    { id: "iam-unsupported", capability: "iam", kind: "unsupported", checkpointId: "iam-unknown", observedState: {}, expectedState: {}, expectedStatus: "inconclusive", expectedFailedCheckIds: [] },
    { id: "lifecycle-good", capability: "sandbox-lifecycle", kind: "known-good", checkpointId: "sandbox-ready", observedState: { "isolated": true, "ttl-active": true }, expectedState: { "isolated": true, "ttl-active": true }, expectedStatus: "passed", expectedFailedCheckIds: [] },
    { id: "lifecycle-bad", capability: "sandbox-lifecycle", kind: "known-bad", checkpointId: "sandbox-ready", observedState: { "isolated": false, "ttl-active": true }, expectedState: { "isolated": true, "ttl-active": true }, expectedStatus: "failed", expectedFailedCheckIds: ["isolated"] },
    { id: "lifecycle-unsupported", capability: "sandbox-lifecycle", kind: "unsupported", checkpointId: "sandbox-unknown", observedState: {}, expectedState: {}, expectedStatus: "inconclusive", expectedFailedCheckIds: [] },
    { id: "cleanup-good", capability: "cleanup", kind: "known-good", checkpointId: "cleanup", observedState: { "resources-removed": true, "identity-revoked": true }, expectedState: { "resources-removed": true, "identity-revoked": true }, expectedStatus: "passed", expectedFailedCheckIds: [] },
    { id: "cleanup-bad", capability: "cleanup", kind: "known-bad", checkpointId: "cleanup", observedState: { "resources-removed": false, "identity-revoked": true }, expectedState: { "resources-removed": true, "identity-revoked": true }, expectedStatus: "failed", expectedFailedCheckIds: ["resources-removed"] },
    { id: "cleanup-unsupported", capability: "cleanup", kind: "unsupported", checkpointId: "cleanup-unknown", observedState: {}, expectedState: {}, expectedStatus: "inconclusive", expectedFailedCheckIds: [] },
  ],
};
export const bedrockControlledCompatibility: CompatibilityEntry = {
  schemaVersion: 1, id: "bedrock-controlled-us-east-1", version: "1.0.0", labId: "bedrock-reliable-request", labVersion: "1", scenarioId: "bedrock-guardrail-console", scenarioVersion: "1.0.0", semanticMappingVersion: "1.0.0", presentationMappingVersion: "1.0.0", templateId: "bedrock-request-template", templateVersion: "1.0.0", sdkApiVersion: "controlled-1", validatorBundleId: bedrockValidatorBundle.id, validatorBundleVersion: bedrockValidatorBundle.version, region: "us-east-1", provider: "controlled-sandbox", providerAdapterVersion: "1.0.0", status: "active", knownLimitations: ["Controlled provider performs no AWS calls."],
};
export const healthyBedrockControlledValidator = {
  schemaVersion: 1 as const, compatibilityId: bedrockControlledCompatibility.id, compatibilityVersion: bedrockControlledCompatibility.version, status: "healthy" as const,
  fixtureResults: bedrockValidatorBundle.fixtures.map((fixture) => ({ fixtureId: fixture.id, expectedStatus: fixture.expectedStatus, actualStatus: fixture.expectedStatus, matched: true })),
  probes: ["service", "model", "region", "inspector-permission", "template", "cost-policy"].map((type, index) => ({ id: `health-probe-${index + 1}`, type: type as import("@grillme/domain").CapabilityProbe["type"], status: "passed" as const, observedAt: "2026-10-17T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z", reason: null })),
  checkedAt: "2026-10-17T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z", reviewedDegradedPolicyId: null,
};
export const bedrockSimulatorCompatibility: CompatibilityEntry = {
  ...bedrockControlledCompatibility,
  id: "bedrock-simulator-us-east-1",
  provider: "simulator",
  providerAdapterVersion: "1.0.0",
  knownLimitations: ["Deterministic simulator performs no AWS calls."],
};
export const healthyBedrockSimulatorValidator = {
  ...healthyBedrockControlledValidator,
  compatibilityId: bedrockSimulatorCompatibility.id,
  compatibilityVersion: bedrockSimulatorCompatibility.version,
};