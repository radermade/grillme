import { spawnSync } from "node:child_process";

for (const file of ["tests/phase-1.test.mjs", "tests/phase-2.test.mjs"]) {
  const result = spawnSync(process.execPath, ["--test", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}