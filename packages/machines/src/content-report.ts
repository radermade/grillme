import { assign, fromPromise, setup } from "xstate";
import { parseContentReportReceipt } from "@grillme/content";
import type { ContentReport, ContentReportCategory, ContentReportReceipt } from "@grillme/domain";
import type { ClockPort, ContentReportPort, IdPort } from "@grillme/platform";

type Context = { courseId: string; courseVersion: string; contentId: string; category: ContentReportCategory; summary: string; pending: ContentReport | null; receipt: ContentReportReceipt | null; error: string | null };
type Event = { type: "CATEGORY"; category: ContentReportCategory } | { type: "SUMMARY"; summary: string } | { type: "SUBMIT" } | { type: "RETRY" } | { type: "RESET" };
type Done = { output: ContentReportReceipt };
export const createContentReportMachine = (courseId: string, courseVersion: string, contentId: string, remote: ContentReportPort, ids: IdPort, clock: ClockPort) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: { submit: fromPromise<ContentReportReceipt, { report: ContentReport }>(async ({ input }) => { const receipt = parseContentReportReceipt(await remote.submit(input.report)); if (!receipt) throw new Error("Invalid report receipt."); return receipt; }) },
  guards: { validSummary: ({ context }) => context.summary.trim().length > 0 && context.summary.length <= 500 },
  actions: {
    setCategory: assign(({ event }) => event.type === "CATEGORY" ? { category: event.category } : {}),
    setSummary: assign(({ event }) => event.type === "SUMMARY" ? { summary: event.summary } : {}),
    stage: assign(({ context }) => { const id = ids.create(); return { pending: { schemaVersion: 1 as const, id, idempotencyKey: id, courseId, courseVersion, contentId, category: context.category, summary: context.summary.trim(), occurredAt: clock.now() }, error: null }; }),
    submitted: assign(({ event }) => ({ receipt: (event as unknown as Done).output, pending: null, error: null })),
    failed: assign({ error: () => "The content report could not be submitted." }),
    reset: assign({ summary: "", pending: null, receipt: null, error: null }),
  },
}).createMachine({
  id: "contentReport",
  initial: "editing",
  context: { courseId, courseVersion, contentId, category: "unclear", summary: "", pending: null, receipt: null, error: null },
  states: {
    editing: { on: { CATEGORY: { actions: "setCategory" }, SUMMARY: { actions: "setSummary" }, SUBMIT: { target: "submitting", guard: "validSummary", actions: "stage" } } },
    submitting: { invoke: { src: "submit", input: ({ context }) => ({ report: context.pending! }), onDone: { target: "submitted", actions: "submitted" }, onError: { target: "failed", actions: "failed" } } },
    failed: { on: { RETRY: "submitting", RESET: { target: "editing", actions: "reset" } } },
    submitted: { on: { RESET: { target: "editing", actions: "reset" } } },
  },
});
