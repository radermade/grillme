import type { PrototypeContext } from "./machine";

export const exportResearchRecord = (context: PrototypeContext): void => {
  if (!context.evaluation) return;
  const record = {
    schemaVersion: 3,
    participantId: context.participantId,
    valid: true,
    completedWithoutHelp: true,
    durationMinutes: context.completedAt
      ? Math.max(0, Math.round((Date.parse(context.completedAt) - Date.parse(context.startedAt)) / 60000))
      : null,
    baselineConfidence: context.baselineConfidence,
    finalConfidence: context.finalConfidence,
    hintsUsed: context.hintsUsed,
    baseline: context.evaluation.baseline,
    final: context.evaluation.final,
    identifiedMalformedOutput: context.evaluation.identifiedMalformedOutput,
    identifiedUnboundedRetry: context.evaluation.identifiedUnboundedRetry,
    explainedDeterministicValidation: context.evaluation.explainedDeterministicValidation,
    severeUnresolvedIssue: context.feedback.severeUnresolvedIssue,
    miniLabImprovedUnderstanding: context.feedback.miniLabImprovedUnderstanding,
    wouldChooseDeeperLab: context.feedback.wouldChooseDeeperLab,
    evaluation: {
      method: "transparent-local-rubric-v1",
      provisional: true,
    },
    lab: {
      passed: context.lab.passed,
      checksRun: context.lab.checksRun,
      commandsEntered: context.lab.transcript.filter(({ kind }) => kind === "command").length,
    },
  };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${context.participantId}-prototype-record.json`;
  link.click();
  URL.revokeObjectURL(url);
};