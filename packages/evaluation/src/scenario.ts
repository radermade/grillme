import type { ScenarioCheck, ScenarioValidation, ScenarioWorkspace } from "@grillme/domain";

const connectionExists = (workspace: ScenarioWorkspace, from: string, to: string) =>
  workspace.connections.some((connection) => connection.from === from && connection.to === to);

export const validateScenarioWorkspace = (
  checks: ScenarioCheck[],
  workspace: ScenarioWorkspace,
): ScenarioValidation => {
  const passedCheckIds: string[] = [];
  const failedCheckIds: string[] = [];
  const feedback: string[] = [];
  for (const check of checks) {
    let passed = false;
    if (check.type === "component-selected") passed = workspace.selectedComponents.includes(check.componentId);
    if (check.type === "component-absent") passed = !workspace.selectedComponents.includes(check.componentId);
    if (check.type === "connection") passed = connectionExists(workspace, check.from, check.to);
    if (check.type === "setting") passed = workspace.settings[check.settingId] === check.value;
    if (check.type === "diagnosis-concepts") {
      const diagnosis = workspace.diagnosis.toLowerCase();
      passed = check.concepts.every((alternatives) =>
        alternatives.some((term) => diagnosis.includes(term.toLowerCase())));
    }
    (passed ? passedCheckIds : failedCheckIds).push(check.id);
    if (!passed) feedback.push(check.message);
  }
  return { passed: failedCheckIds.length === 0, passedCheckIds, failedCheckIds, feedback };
};