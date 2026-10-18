import assessment from "../fixtures/assessment.json";
import awsLabPolicy from "../fixtures/aws-lab-policy.json";
import courseCoverage from "../fixtures/course-coverage.json";
import courseRelease from "../fixtures/course-release.json";
import course from "../fixtures/course.json";
import consoleCaptures from "../fixtures/console-captures.json";
import grill from "../fixtures/grill.json";
import lab from "../fixtures/lab.json";
import mock from "../fixtures/mock.json";
import readinessRules from "../fixtures/readiness-rules.json";
import release from "../fixtures/release.json";
import requirements from "../fixtures/requirements.json";
import scenarios from "../fixtures/scenarios.json";
import semanticConsole from "../fixtures/semantic-console.json";
import skills from "../fixtures/skills.json";

export const learningFixtures = {
  assessment, awsLabPolicy, consoleCaptures, courseCoverage, courseRelease, course, grill, lab,
  mock, readinessRules, release, requirements, scenarios, semanticConsole, skills,
};
export type LearningFixtures = typeof learningFixtures;
