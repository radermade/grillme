import type {
  Assessment,
  AssessmentActivity,
  AssessmentAnswer,
  AssessmentResponse,
  ReviewSchedule,
  SkillGap,
} from "@grillme/domain";

const equalSet = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

export const gradeAnswer = (activity: AssessmentActivity, answer: AssessmentAnswer): boolean => {
  if (activity.type === "single-choice") return typeof answer === "string" && answer === activity.correctOptionId;
  if (activity.type === "multiple-choice") return Array.isArray(answer) && equalSet(answer, activity.correctOptionIds);
  if (activity.type === "ordering") return Array.isArray(answer)
    && answer.length === activity.correctOrder.length
    && answer.every((value, index) => value === activity.correctOrder[index]);
  if (typeof answer !== "string") return false;
  const normalized = answer.toLowerCase();
  return activity.requiredConcepts.every(({ terms }) =>
    terms.some((term) => normalized.includes(term.toLowerCase())),
  );
};
export const isAnswerComplete = (
  activity: AssessmentActivity,
  answer: AssessmentAnswer,
): boolean => {
  if (activity.type === "single-choice") {
    return typeof answer === "string" && activity.choices.some(({ id }) => id === answer);
  }
  if (activity.type === "multiple-choice") {
    return Array.isArray(answer) && answer.length > 0
      && new Set(answer).size === answer.length
      && answer.every((id) => activity.choices.some((choice) => choice.id === id));
  }
  if (activity.type === "ordering") {
    return Array.isArray(answer) && answer.length === activity.items.length
      && new Set(answer).size === answer.length
      && answer.every((id) => activity.items.some((item) => item.id === id));
  }
  return typeof answer === "string" && answer.trim().length > 0 && answer.length <= 1_000;
};

export const deriveSkillGaps = (assessment: Assessment, responses: AssessmentResponse[]): SkillGap[] =>
  assessment.skills.map((skill) => {
    const evidence = responses.filter(({ skillIds }) => skillIds.includes(skill.id));
    const correct = evidence.filter((response) => response.correct).length;
    const total = evidence.length;
    const accuracy = total ? correct / total : 0;
    const averageConfidence = total
      ? evidence.reduce((sum, response) => sum + response.confidence, 0) / total
      : 0;
    return {
      skillId: skill.id, title: skill.title, correct, total, accuracy,
      averageConfidence, weak: accuracy < 0.7, remediation: skill.remediation,
    };
  });