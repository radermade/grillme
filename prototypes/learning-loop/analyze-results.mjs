import { readFile } from "node:fs/promises";

const paths = process.argv.slice(2);
if (paths.length < 5) {
  throw new Error("Provide at least five anonymized JSON session records.");
}

const sessions = await Promise.all(
  paths.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);

const valid = sessions.filter((session) => session.valid === true);
if (valid.length < 5) {
  throw new Error("At least five valid session records are required.");
}

const improved = (session) =>
  Object.keys(session.baseline).some(
    (key) => session.final[key] >= session.baseline[key] + 1,
  );

const durations = valid.map(({ durationMinutes }) => durationMinutes).sort((a, b) => a - b);
const middle = Math.floor(durations.length / 2);
const median = durations.length % 2
  ? durations[middle]
  : (durations[middle - 1] + durations[middle]) / 2;

const count = (predicate) => valid.filter(predicate).length;
const results = {
  validSessions: valid.length,
  completedWithoutHelp: count((session) => session.completedWithoutHelp),
  improvedOneRubricLevel: count(improved),
  identifiedRequiredRisks: count(
    (session) => session.identifiedMalformedOutput && session.identifiedUnboundedRetry,
  ),
  explainedDeterministicValidation: count(
    (session) => session.explainedDeterministicValidation,
  ),
  medianDurationMinutes: median,
  severeUnresolvedIssues: count((session) => session.severeUnresolvedIssue),
};

results.decision =
  results.completedWithoutHelp >= 4 &&
  results.improvedOneRubricLevel >= 4 &&
  results.identifiedRequiredRisks >= 4 &&
  results.explainedDeterministicValidation >= 4 &&
  results.medianDurationMinutes <= 35 &&
  results.severeUnresolvedIssues === 0
    ? "proceed"
    : "revise";

console.log(JSON.stringify(results, null, 2));