import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../packages/ui/src/VisualStateCatalog.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../packages/ui/src/styles.css", import.meta.url), "utf8");
const required = ["loading", "empty", "success", "degraded", "conflict", "expired", "failure"];
for (const state of required) {
  if (!source.includes(`id: "${state}"`)) throw new Error(`Visual state fixture is missing: ${state}`);
  if (!styles.includes(`.visual-state.${state}`) && state !== "conflict") throw new Error(`Visual state styling is missing: ${state}`);
}
if (!source.includes("data-visual-state")) throw new Error("Visual state fixtures need stable selectors.");
if (!source.includes("role={state.id === \"failure\" ? \"alert\" : \"status\"}")) throw new Error("Visual state announcements are missing.");
for (const path of ["../apps/web/src/main.tsx", "../apps/desktop/src/main.tsx"]) {
  const root = await readFile(new URL(path, import.meta.url), "utf8");
  if (!root.includes("import.meta.env.DEV") || !root.includes("catalog") || !root.includes("VisualStateCatalog")) throw new Error(`Development catalog gate is missing: ${path}`);
}
console.log(`Visual state catalog valid: ${required.length} deterministic fixtures.`);