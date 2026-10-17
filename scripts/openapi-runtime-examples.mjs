import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const spec = JSON.parse(await readFile(new URL("../openapi.json", import.meta.url), "utf8"));
const schema = (name) => spec.components.schemas[name];
const example = (name) => schema(name)?.example;
const server = await createServer({ configFile: false, root: "apps/web", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
try {
  const root = "/@fs/" + process.cwd();
  const content = await server.ssrLoadModule(root + "/packages/content/src/index.ts");
  const checks = [
    ["AccountSession", content.parseAccountSession],
    ["SyncPushResponse", content.parseSyncPushResult],
    ["ProgressSummaryResponse", content.parseSummary],
    ["LabSessionResponse", content.parseLabSession],
    ["LabValidationResponse", content.parseLabValidation],
    ["AwsCredentialLeaseResponse", content.parseAwsCredentialLease],
    ["AwsOperationReceiptResponse", content.parseAwsOperationReceipt],
    ["ContentReportResponse", content.parseContentReportReceipt],
    ["PrivacyResponse", content.parsePrivacyRequestReceipt],
    ["EntitlementResponse", content.parseCommercialEntitlement],
    ["SupportSnapshotRequest", content.parseSupportSnapshot],
    ["ReleaseResponse", content.parseReleaseAssignment],
  ];
  for (const [name, parse] of checks) {
    const value = example(name);
    if (value === undefined || !parse(value)) throw new Error(`OpenAPI example fails runtime schema: ${name}`);
  }
  if (!content.parseProductAnalyticsEvents(example("AnalyticsRequest"))) throw new Error("AnalyticsRequest example fails runtime schema.");
  const evaluation = example("EvaluationResponse");
  if (!evaluation || !content.parseEvaluationResult(evaluation.result)) throw new Error("EvaluationResponse example fails runtime schema.");
  console.log(`OpenAPI runtime examples valid: ${checks.length + 2} checks.`);
} finally {
  await server.close();
}
process.exit(0);
