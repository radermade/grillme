import { useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createReadinessMachine } from "@grillme/machines";
import { auditSkillCoverage, parseCourseReleaseManifest, parseCoverageActivities } from "@grillme/content";
import { useUiRuntime } from "./runtime";
import { ContentReportForm } from "./ContentReportForm";

import { Panel, ProgressMeter } from "./primitives";
export function ReadinessView({ onOpenMock, onDrill }: { onOpenMock(): void; onDrill(type: "assessment" | "explanation" | "scenario" | "lab"): void }) {
  const { fixtures, platform, readiness } = useUiRuntime();
  const { course, courseCoverage, courseRelease, readinessRules, skills } = fixtures;
  const skillIds = skills.map(({ id }) => id);
  const machine = useMemo(() => createReadinessMachine(course.id, course.version, skillIds, readinessRules, readiness, platform.clock), [course.id, course.version, platform.clock, readiness, readinessRules, skillIds.join("|")]);
  const [state, send] = useMachine(machine, {});
  const coverage = useMemo(() => auditSkillCoverage(skillIds, parseCoverageActivities(courseCoverage)), [courseCoverage, skillIds.join("|")]);
  const release = useMemo(() => parseCourseReleaseManifest(courseRelease), [courseRelease]);
  if (state.matches("loading")) return <main><h1>Calculating readiness evidence</h1><p role="status">Loading versioned evidence…</p></main>;
  if (state.matches("failed")) return <main><h1>Readiness unavailable</h1><p role="alert">{state.context.error}</p><button onClick={() => send({ type: "RETRY" })}>Retry</button></main>;
  const summary = state.context.summary;
  if (!summary) return <main><h1>Readiness unavailable</h1></main>;
  return <main><p className="eyebrow">{release.status} course · Draft evidence rule {summary.ruleVersion}</p><h1>Readiness evidence</h1><p className="prompt">{summary.score}% weighted evidence score · {summary.sufficiency} evidence sufficiency</p><div className="callout warning"><strong>Evidence boundary</strong><p>{summary.disclaimer} Course mappings, thresholds, and content remain pending expert and product approval.</p></div><div className="actions"><button className="primary" onClick={onOpenMock}>Open mock preview</button><button className="secondary" onClick={() => send({ type: "REFRESH" })}>Refresh evidence</button></div>
    <section><h2>Skill evidence</h2><div className="results">{summary.skills.map((skill) => { const definition = skills.find(({ id }) => id === skill.skillId)!; const mapped = coverage.find(({ skillId }) => skillId === skill.skillId)!; return <article className={`result ${skill.level === "demonstrating" ? "strong" : "weak"}`} key={skill.skillId}><h3>{definition.title}</h3><p>{skill.score}% · {skill.level} · {skill.sufficiency}</p><p>{skill.evidenceIds.length} evidence items across {skill.evidenceTypes.length} types.</p><ul>{skill.reasons.map((reason) => <li key={reason}>{reason}</li>)}{mapped.gaps.map((gap) => <li key={gap}>Content gap: {gap}</li>)}</ul>{skill.nextAction && <button className="secondary" onClick={() => onDrill(skill.nextAction!)}>Practice with {skill.nextAction}</button>}</article>; })}</div></section>
    <Panel title="Course release coverage"><ProgressMeter label="Skills passing draft coverage gate" value={coverage.filter(({ releaseReady }) => releaseReady).length} max={coverage.length} /><p>Approvals: {Object.entries(release.approvals).map(([role, decision]) => `${role} ${decision}`).join(" · ")}</p><ul>{release.knownLimitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></Panel>
    <ContentReportForm />
  </main>;
}
