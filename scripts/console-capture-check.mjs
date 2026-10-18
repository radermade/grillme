import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const raw = JSON.parse(await readFile(new URL("../packages/content/fixtures/console-captures.json", import.meta.url), "utf8"));
const server = await createServer({ configFile: false, root: "apps/web", appType: "custom", optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false } });
try {
  const root = "/@fs/" + process.cwd();
  const content = await server.ssrLoadModule(root + "/packages/content/src/index.ts");
  const scenes = content.parseConsoleCaptureScenes(raw);
  const definition = content.parseSemanticConsole(content.learningFixtures.semanticConsole);
  const coverage = content.consoleCaptureCoverage(definition, scenes);
  for (const scene of scenes) {
    const relative = scene.imagePath.replace(/^\/console-captures\//, "");
    const asset = new URL(`../packages/content/captures/console-captures/${relative}`, import.meta.url);
    const bytes = await readFile(asset).catch(() => null);
    if (!bytes) throw new Error(`Capture asset is missing: ${scene.imagePath}`);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== scene.imageSha256) throw new Error(`Capture hash mismatch: ${scene.id}`);
  }
  console.log(`Console captures valid: ${scenes.length} reviewed scene(s). Exact walkthrough ${coverage.ready ? "ready" : `blocked (${coverage.reason})`}.`);
} finally { await server.close(); }
