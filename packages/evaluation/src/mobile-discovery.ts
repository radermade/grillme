import type { MobileDecision, MobileDiscoveryRecord, MobileWorkflow } from "@grillme/domain";

export const decideMobileDirection = (record: MobileDiscoveryRecord): MobileDecision => {
  const mobileShare = record.mobileSizedSessions / record.totalSessions;
  const shortShare = record.shortSessions / record.totalSessions;
  const reasons = [`Observed ${record.cohortSize} learners for ${record.observationDays} days.`, `${Math.round(mobileShare * 100)}% of sessions used mobile-sized screens; ${Math.round(shortShare * 100)}% were short sessions.`];
  if (record.cohortSize < 10 || record.observationDays < 28 || mobileShare < .2 || shortShare < .3) return { decision: "defer", prioritizedWorkflows: [], reasons: [...reasons, "Evidence does not meet the draft mobile-investment gate."] };
  const workflows = (Object.entries(record.workflowDemand) as Array<[MobileWorkflow, number]>).filter(([workflow]) => workflow !== "lab").sort((a, b) => b[1] - a[1]).slice(0, 3).map(([workflow]) => workflow);
  const ranked = record.candidates.map((candidate) => ({ id: candidate.id, score: candidate.capability + candidate.accessibility + candidate.distribution - candidate.teamCost })).sort((a, b) => b.score - a.score);
  const winner = ranked[0];
  return winner && workflows.length ? { decision: winner.id, prioritizedWorkflows: workflows, reasons: [...reasons, `Selected ${winner.id} from the recorded capability, accessibility, distribution, and team-cost scores.`, "Terminal-heavy labs remain outside the mobile scope."] } : { decision: "defer", prioritizedWorkflows: [], reasons: [...reasons, "No supported mobile workflow set was demonstrated."] };
};
