export type ReadinessEvidenceType = "assessment" | "explanation" | "scenario" | "debugging" | "lab" | "mock";

export type ReadinessEvidence = {
  id: string;
  courseId: string;
  courseVersion: string;
  skillIds: string[];
  type: ReadinessEvidenceType;
  score: number;
  guided: boolean;
  activityId: string;
  activityVersion: string;
  occurredAt: string;
};

export type ReadinessRuleSet = {
  schemaVersion: 1;
  id: string;
  version: string;
  maxAgeDays: number;
  weights: Record<ReadinessEvidenceType, number>;
  highImpactSkillIds: string[];
  minimumEvidence: number;
  minimumTypes: number;
  demonstratingScore: number;
};

export type SkillReadiness = {
  skillId: string;
  score: number;
  level: "insufficient" | "developing" | "demonstrating";
  sufficiency: "insufficient" | "limited" | "sufficient";
  evidenceIds: string[];
  evidenceTypes: ReadinessEvidenceType[];
  latestAt: string | null;
  nextAction: "assessment" | "explanation" | "scenario" | "lab" | null;
  reasons: string[];
};

export type ReadinessSummary = {
  ruleId: string;
  ruleVersion: string;
  courseId: string;
  courseVersion: string;
  score: number;
  sufficiency: "insufficient" | "limited" | "sufficient";
  skills: SkillReadiness[];
  computedAt: string;
  disclaimer: string;
};
