import type { Assessment, ReviewItem, ReviewSchedule, SkillGap } from "@grillme/domain";

export const addDays = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

export const scheduleFromGaps = (
  assessment: Assessment,
  gaps: SkillGap[],
  now: string,
): ReviewSchedule => ({
  schemaVersion: 1,
  courseId: assessment.courseId,
  courseVersion: assessment.courseVersion,
  updatedAt: now,
  items: gaps.filter(({ weak }) => weak).map((gap) => {
    const skill = assessment.skills.find(({ id }) => id === gap.skillId)!;
    return {
      skillId: skill.id,
      title: skill.title,
      prompt: skill.reviewPrompt,
      answer: skill.reviewAnswer,
      reason: `${gap.correct} of ${gap.total} assessment responses were correct.`,
      removalCriteria: "Rate recall 4 or 5 on two review sessions.",
      dueAt: now,
      intervalDays: 0,
      successfulReviews: 0,
      sourceAssessmentId: assessment.id,
    };
  }),
});

export const rescheduleItem = (item: ReviewItem, confidence: number, now: string): ReviewItem | null => {
  const success = confidence >= 4;
  const successfulReviews = item.successfulReviews + (success ? 1 : 0);
  if (successfulReviews >= 2) return null;
  const intervalDays = confidence <= 2 ? 1 : confidence === 3 ? 3 : 7;
  return { ...item, successfulReviews, intervalDays, dueAt: addDays(now, intervalDays) };
};