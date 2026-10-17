import type { PrototypeContext } from "./machine";

export const exportResearchRecord = (context: PrototypeContext): void => {
  const completed = Object.fromEntries(
    Object.entries(context.answers).map(([key, value]) => [key, value.trim().length > 0]),
  );
  const wordCounts = Object.fromEntries(
    Object.entries(context.answers).map(([key, value]) => [
      key,
      value.trim() ? value.trim().split(/\s+/).length : 0,
    ]),
  );
  const record = {
    schemaVersion: 1,
    participantId: context.participantId,
    startedAt: context.startedAt,
    completedAt: context.completedAt,
    durationMinutes: context.completedAt
      ? Math.round((Date.parse(context.completedAt) - Date.parse(context.startedAt)) / 60000)
      : null,
    baselineConfidence: context.baselineConfidence,
    finalConfidence: context.finalConfidence,
    hintsUsed: context.hintsUsed,
    lab: {
      passed: context.lab.passed,
      checksRun: context.lab.checksRun,
      commandsEntered: context.lab.transcript.filter(({ kind }) => kind === "command").length,
    },
    responseCompleted: completed,
    responseWordCounts: wordCounts,
  };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${context.participantId || "participant"}-prototype-record.json`;
  link.click();
  URL.revokeObjectURL(url);
};