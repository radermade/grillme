import { useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createContentReportMachine } from "@grillme/machines";
import type { ContentReportCategory } from "@grillme/domain";
import { useUiRuntime } from "./runtime";

const categories: ContentReportCategory[] = ["technical-error", "unclear", "accessibility", "stale", "unsafe"];
export function ContentReportForm() {
  const { contentReports, platform } = useUiRuntime();
  const machine = useMemo(() => createContentReportMachine("aws-aip-c01", "0.1.0", "readiness-dashboard", contentReports, platform.ids, platform.clock), [contentReports, platform.clock, platform.ids]);
  const [state, send] = useMachine(machine, {});
  if (state.matches("submitted")) return <section><h2>Report received</h2><p role="status">Report {state.context.receipt?.reportId} was recorded as {state.context.receipt?.severity} severity.</p><button onClick={() => send({ type: "RESET" })}>Report another issue</button></section>;
  return <section><h2>Report course content</h2><p>Do not include credentials, personal data, production code, or copied exam questions.</p><label>Category<select value={state.context.category} onChange={(event) => send({ type: "CATEGORY", category: event.target.value as ContentReportCategory })}>{categories.map((category) => <option key={category} value={category}>{category.replaceAll("-", " ")}</option>)}</select></label><label>Summary<textarea maxLength={500} value={state.context.summary} onChange={(event) => send({ type: "SUMMARY", summary: event.target.value })} /></label>{state.context.error && <p role="alert">{state.context.error}</p>}<button disabled={!state.context.summary.trim() || state.matches("submitting")} onClick={() => send({ type: state.matches("failed") ? "RETRY" : "SUBMIT" })}>{state.matches("submitting") ? "Submitting…" : state.matches("failed") ? "Retry" : "Submit report"}</button></section>;
}
