export type LabConfig = {
  maxAttempts: number;
  schema: "none" | "strict";
  safety: "none" | "block";
  telemetry: "raw" | "sanitized";
};

export type TranscriptEntry = {
  kind: "command" | "output" | "error" | "success";
  text: string;
};

export type LabWorkspace = {
  config: LabConfig;
  transcript: TranscriptEntry[];
  checksRun: number;
  passed: boolean;
  revision: number;
};

const defaults = (): LabConfig => ({
  maxAttempts: 0,
  schema: "none",
  safety: "none",
  telemetry: "raw",
});

export const createLabWorkspace = (): LabWorkspace => ({
  config: defaults(),
  transcript: [{ kind: "output", text: "Type help to inspect available commands." }],
  checksRun: 0,
  passed: false,
  revision: 0,
});

const checks = (config: LabConfig) => [
  [config.maxAttempts === 2, "Retry policy allows exactly two total calls."],
  [config.schema === "strict", "Strict output schema is enabled."],
  [config.safety === "block", "Unsafe output is blocked."],
  [config.telemetry === "sanitized", "Telemetry excludes raw model output."],
] as const;

const supported = new Set([
  "help", "show config", "set max-attempts 2", "set schema strict",
  "set safety block", "set telemetry sanitized", "check", "reset",
]);

export const isCheckCommand = (raw: string): boolean => raw.trim().toLowerCase() === "check";

export const executeLabCommand = (workspace: LabWorkspace, raw: string): LabWorkspace => {
  const command = raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  const append = (...entries: TranscriptEntry[]): TranscriptEntry[] =>
    [...workspace.transcript, ...entries].slice(-20);

  if (!supported.has(command)) {
    return {
      ...workspace,
      transcript: append({ kind: "error", text: "Unsupported command. Type help." }),
      revision: workspace.revision + 1,
    };
  }

  let config = { ...workspace.config };
  let output: TranscriptEntry;
  if (command === "help") {
    output = { kind: "output", text: "show config | set max-attempts 2 | set schema strict | set safety block | set telemetry sanitized | check | reset" };
  } else if (command === "show config") {
    output = { kind: "output", text: JSON.stringify(config, null, 2) };
  } else if (command === "reset") {
    config = defaults();
    output = { kind: "output", text: "Configuration reset." };
  } else if (command === "check") {
    const results = checks(config);
    const passed = results.every(([ok]) => ok);
    const detail = results.map(([ok, label]) => `${ok ? "PASS" : "FAIL"} ${label}`).join("\n");
    return {
      config,
      transcript: append(
        { kind: "command", text: command },
        { kind: passed ? "success" : "error", text: detail },
      ),
      checksRun: workspace.checksRun + 1,
      passed,
      revision: workspace.revision + 1,
    };
  } else {
    if (command === "set max-attempts 2") config.maxAttempts = 2;
    if (command === "set schema strict") config.schema = "strict";
    if (command === "set safety block") config.safety = "block";
    if (command === "set telemetry sanitized") config.telemetry = "sanitized";
    output = { kind: "output", text: "Configuration updated." };
  }

  return {
    ...workspace,
    config,
    transcript: append({ kind: "command", text: command }, output),
    passed: false,
    revision: workspace.revision + 1,
  };
};