import { readFile } from "node:fs/promises";

const dimensions = ["outputHandling", "safety", "operations", "tradeoffs"];
const isBoolean = (value) => typeof value === "boolean";
const isScore = (value) => Number.isInteger(value) && value >= 0 && value <= 3;

const validate = (session, path) => {
  const fail = (field) => { throw new Error(`${path}: invalid or missing ${field}`); };
  if (!session || typeof session !== "object") fail("record");
  if (![1, 2, 3].includes(session.schemaVersion)) fail("schemaVersion");
  if (typeof session.participantId !== "string" || !session.participantId.trim()) fail("participantId");
  if (!Number.isFinite(session.durationMinutes) || session.durationMinutes < 0) fail("durationMinutes");
  for (const field of [
    "valid", "completedWithoutHelp", "identifiedMalformedOutput", "identifiedUnboundedRetry",
    "explainedDeterministicValidation", "severeUnresolvedIssue",
  ]) if (!isBoolean(session[field])) fail(field);
  for (const phase of ["baseline", "final"]) {
    if (!session[phase] || typeof session[phase] !== "object") fail(phase);
    for (const dimension of dimensions) if (!isScore(session[phase][dimension])) fail(`${phase}.${dimension}`);
  }
  if (session.schemaVersion >= 2) {
    if (!isBoolean(session.miniLabImprovedUnderstanding)) fail("miniLabImprovedUnderstanding");
    if (!isBoolean(session.wouldChooseDeeperLab)) fail("wouldChooseDeeperLab");
    if (!session.lab || !isBoolean(session.lab.passed)) fail("lab.passed");
    if (!Number.isInteger(session.lab.checksRun) || session.lab.checksRun < 0) fail("lab.checksRun");
  }
  return session;
};

const paths = process.argv.slice(2);
if (paths.length < 5) throw new Error("Provide at least five anonymized JSON session records.");
const sessions = await Promise.all(paths.map(async (path) =>
  validate(JSON.parse(await readFile(path, "utf8")), path)));
const valid = sessions.filter(({ valid: accepted }) => accepted);
if (valid.length < 5) throw new Error("At least five valid session records are required.");

const improved = (session) => dimensions.some((key) => session.final[key] >= session.baseline[key] + 1);
const durations = valid.map(({ durationMinutes }) => durationMinutes).sort((a, b) => a - b);
const middle = Math.floor(durations.length / 2);
const median = durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2;
const count = (predicate) => valid.filter(predicate).length;
const labSessions = valid.filter(({ schemaVersion }) => schemaVersion >= 2);
const results = {
  validSessions: valid.length,
  completedWithoutHelp: count((session) => session.completedWithoutHelp),
  improvedOneRubricLevel: count(improved),
  identifiedRequiredRisks: count((session) => session.identifiedMalformedOutput && session.identifiedUnboundedRetry),
  explainedDeterministicValidation: count((session) => session.explainedDeterministicValidation),
  medianDurationMinutes: median,
  severeUnresolvedIssues: count((session) => session.severeUnresolvedIssue),
  handsOn: {
    measuredSessions: labSessions.length,
    passedLab: labSessions.filter(({ lab }) => lab.passed).length,
    improvedUnderstanding: labSessions.filter(({ miniLabImprovedUnderstanding }) => miniLabImprovedUnderstanding).length,
    wouldChooseDeeperLab: labSessions.filter(({ wouldChooseDeeperLab }) => wouldChooseDeeperLab).length,
  },
};

results.decision =
  results.completedWithoutHelp >= 4 && results.improvedOneRubricLevel >= 4
  && results.identifiedRequiredRisks >= 4 && results.explainedDeterministicValidation >= 4
  && results.medianDurationMinutes <= 35 && results.severeUnresolvedIssues === 0
    ? "proceed" : "revise";

console.log(JSON.stringify(results, null, 2));