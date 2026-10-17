import type { ReadinessEvidence, ReadinessRuleSet, ReadinessSummary, SkillReadiness } from "@grillme/domain";

const daysBetween = (later: string, earlier: string) => Math.max(0, (Date.parse(later) - Date.parse(earlier)) / 86_400_000);
const unique = <T>(values: T[]) => [...new Set(values)];
export const deriveReadiness = (
  courseId: string,
  courseVersion: string,
  skillIds: string[],
  evidence: ReadinessEvidence[],
  rules: ReadinessRuleSet,
  now: string,
): ReadinessSummary => {
  const valid = [...new Map(evidence.filter((item) => item.courseId === courseId && item.courseVersion === courseVersion && item.skillIds.some((id) => skillIds.includes(id)) && daysBetween(now, item.occurredAt) <= rules.maxAgeDays).map((item) => [item.id, item])).values()];
  const skills: SkillReadiness[] = skillIds.map((skillId) => {
    const items = valid.filter(({ skillIds: mapped }) => mapped.includes(skillId));
    const weighted = items.map((item) => ({ item, weight: rules.weights[item.type] * Math.max(0, 1 - daysBetween(now, item.occurredAt) / rules.maxAgeDays) }));
    const totalWeight = weighted.reduce((sum, { weight }) => sum + weight, 0);
    const rawScore = totalWeight ? weighted.reduce((sum, { item, weight }) => sum + item.score * weight, 0) / totalWeight : 0;
    const types = unique(items.map(({ type }) => type));
    const requiredTypes = rules.highImpactSkillIds.includes(skillId) ? Math.max(2, rules.minimumTypes) : rules.minimumTypes;
    const sufficientCount = items.length >= rules.minimumEvidence;
    const sufficientTypes = types.length >= requiredTypes;
    const hasIndependentApplication = items.some(({ type, guided }) => !guided && ["scenario", "debugging", "lab"].includes(type));
    const sufficiency = sufficientCount && sufficientTypes && hasIndependentApplication ? "sufficient" : items.length ? "limited" : "insufficient";
    const score = Math.round(rawScore * 100);
    const level = sufficiency === "sufficient" && rawScore >= rules.demonstratingScore ? "demonstrating" : items.length ? "developing" : "insufficient";
    const reasons = [
      `${items.length} recent evidence item${items.length === 1 ? "" : "s"} across ${types.length} activity type${types.length === 1 ? "" : "s"}.`,
      sufficientTypes ? "Activity-type coverage meets the draft rule." : `Needs evidence across ${requiredTypes} activity types.`,
      hasIndependentApplication ? "Includes independent application evidence." : "Needs independent scenario, debugging, or lab evidence.",
    ];
    const nextAction = !items.length ? "assessment" : !hasIndependentApplication ? "scenario" : !types.includes("explanation") ? "explanation" : !sufficientTypes ? "assessment" : level !== "demonstrating" ? "explanation" : null;
    return { skillId, score, level, sufficiency, evidenceIds: items.map(({ id }) => id), evidenceTypes: types, latestAt: items.map(({ occurredAt }) => occurredAt).sort().at(-1) ?? null, nextAction, reasons };
  });
  const score = skills.length ? Math.round(skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length) : 0;
  const sufficientSkills = skills.filter(({ sufficiency }) => sufficiency === "sufficient").length;
  const sufficiency = sufficientSkills === skills.length && skills.length > 0 ? "sufficient" : sufficientSkills > 0 ? "limited" : "insufficient";
  return { ruleId: rules.id, ruleVersion: rules.version, courseId, courseVersion, score, sufficiency, skills, computedAt: now, disclaimer: "This evidence summary is not an exam-pass prediction or certification guarantee." };
};

export const assessmentReadinessEvidence = (event: import("@grillme/domain").AssessmentResponse, courseId: string, courseVersion: string): ReadinessEvidence => ({ id: event.id, courseId, courseVersion, skillIds: event.skillIds, type: "assessment", score: event.correct ? 1 : 0, guided: false, activityId: event.activityId, activityVersion: event.assessmentVersion, occurredAt: event.occurredAt });
export const grillReadinessEvidence = (event: import("@grillme/domain").GrillEvidenceEvent): ReadinessEvidence => ({ id: event.id, courseId: event.courseId, courseVersion: event.courseVersion, skillIds: [event.turn.skillId], type: "explanation", score: event.turn.evaluation.score, guided: false, activityId: event.grillId, activityVersion: event.grillVersion, occurredAt: event.turn.occurredAt });
export const scenarioReadinessEvidence = (event: import("@grillme/domain").ScenarioEvidenceEvent, skillIds: string[], kind: import("@grillme/domain").ScenarioKind): ReadinessEvidence => ({ id: event.id, courseId: event.courseId, courseVersion: event.courseVersion, skillIds, type: kind === "debugging" ? "debugging" : "scenario", score: event.passed ? 1 : 0, guided: event.mode !== "challenge" || event.hintsUsed > 0, activityId: event.scenarioId, activityVersion: event.scenarioVersion, occurredAt: event.occurredAt });
export const labReadinessEvidence = (event: import("@grillme/domain").LabEvidenceEvent, skillIds: string[]): ReadinessEvidence => ({ id: event.id, courseId: event.courseId, courseVersion: event.courseVersion, skillIds, type: "lab", score: event.passed ? 1 : 0, guided: event.hintsUsed > 0, activityId: event.labId, activityVersion: event.labVersion, occurredAt: event.occurredAt });
export const mockReadinessEvidence = (event: import("@grillme/domain").MockEvidenceEvent): ReadinessEvidence[] => Object.entries(event.skillScores).map(([skillId, score]) => ({ id: `${event.id}:${skillId}`, courseId: event.courseId, courseVersion: event.courseVersion, skillIds: [skillId], type: "mock", score, guided: false, activityId: event.mockId, activityVersion: event.mockVersion, occurredAt: event.occurredAt }));
