import { z } from "zod";

export type CoverageActivity = { id: string; type: "instruction" | "assessment" | "explanation" | "scenario" | "debugging" | "lab"; skillIds: string[]; remediation: boolean; reviewStatus: "draft" | "approved" };
export type SkillCoverage = { skillId: string; instruction: boolean; retrieval: boolean; application: boolean; remediation: boolean; evidenceTypes: string[]; releaseReady: boolean; gaps: string[] };
export const auditSkillCoverage = (skillIds: string[], activities: CoverageActivity[]): SkillCoverage[] => skillIds.map((skillId) => {
  const mapped = activities.filter(({ skillIds: ids }) => ids.includes(skillId));
  const instruction = mapped.some(({ type }) => type === "instruction");
  const retrieval = mapped.some(({ type }) => type === "assessment" || type === "explanation");
  const application = mapped.some(({ type }) => ["scenario", "debugging", "lab"].includes(type));
  const remediation = mapped.some((item) => item.remediation);
  const evidenceTypes = [...new Set(mapped.filter(({ type }) => type !== "instruction").map(({ type }) => type))];
  const reviewed = mapped.length > 0 && mapped.every(({ reviewStatus }) => reviewStatus === "approved");
  const gaps = [!instruction && "instruction", !retrieval && "retrieval practice", !application && "application evidence", !remediation && "remediation", evidenceTypes.length < 2 && "multiple evidence types", !reviewed && "required reviews"].filter((value): value is string => !!value);
  return { skillId, instruction, retrieval, application, remediation, evidenceTypes, releaseReady: gaps.length === 0, gaps };
});
const coverageActivitySchema = z.object({ id: z.string().min(1).max(200), type: z.enum(["instruction", "assessment", "explanation", "scenario", "debugging", "lab"]), skillIds: z.array(z.string().min(1).max(200)).min(1).max(100), remediation: z.boolean(), reviewStatus: z.enum(["draft", "approved"]) }).strict();
export const parseCoverageActivities = (value: unknown): CoverageActivity[] => z.array(coverageActivitySchema).max(10_000).parse(value) as CoverageActivity[];
