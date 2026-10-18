import { assign, fromPromise, setup } from "xstate";
import type { DriftAuthoringProposal, DriftCase, DriftMitigationAction, DriftRelease } from "@grillme/domain";
import type { DriftOperationsDependencies } from "./drift-operations-contracts";
import { createDriftOperationsService } from "./drift-operations";

type Context = { authorization: string; caseId: string; value: DriftCase | null; error: string | null };
type Event = { type: "LOAD" } | { type: "TRIAGE"; input: { severity: DriftCase["severity"]; ownerId: string; dueAt: string } } | { type: "INVESTIGATE" } | { type: "MITIGATE"; actions: DriftMitigationAction[]; notice: string } | { type: "BEGIN_CORRECTION" } | { type: "PROPOSE"; input: Omit<DriftAuthoringProposal, "schemaVersion" | "id" | "caseId" | "status" | "authorId" | "technicalReviewerId" | "contentReviewerId" | "technicalDecision" | "contentDecision" | "canaryEvidenceId" | "createdAt" | "updatedAt"> } | { type: "REVIEW"; authorization: string; decision: "approved" | "changes-required" } | { type: "RUN_CANARIES" } | { type: "RELEASE"; authorization: string; grandfatheringPolicy: DriftRelease["grandfatheringPolicy"] } | { type: "ROLLBACK"; authorization: string; reason: string } | { type: "CLOSE" } | { type: "RETRY" };
type Done = { output: DriftCase }; const output = (event: unknown) => (event as Done).output;
export const createDriftOperationsMachine = (caseId: string, authorization: string, deps: DriftOperationsDependencies) => {
  const service = createDriftOperationsService(deps);
  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise(() => service.get(authorization, caseId)),
      triage: fromPromise<DriftCase, Event>(({ input }) => input.type === "TRIAGE" ? service.triage(authorization, caseId, input.input) : Promise.reject(new Error("Invalid event."))),
      investigate: fromPromise(() => service.investigate(authorization, caseId)),
      mitigate: fromPromise<DriftCase, Event>(({ input }) => input.type === "MITIGATE" ? service.mitigate(authorization, caseId, input.actions, input.notice) : Promise.reject(new Error("Invalid event."))),
      beginCorrection: fromPromise(() => service.beginCorrection(authorization, caseId)),
      propose: fromPromise<DriftCase, Event>(({ input }) => input.type === "PROPOSE" ? service.propose(authorization, caseId, input.input) : Promise.reject(new Error("Invalid event."))),
      review: fromPromise<DriftCase, Event>(({ input }) => input.type === "REVIEW" ? service.review(input.authorization, caseId, input.decision) : Promise.reject(new Error("Invalid event."))),
      canaries: fromPromise(() => service.runCanaries(authorization, caseId)),
      release: fromPromise<DriftCase, Event>(({ input }) => input.type === "RELEASE" ? service.release(input.authorization, caseId, input.grandfatheringPolicy) : Promise.reject(new Error("Invalid event."))),
      rollback: fromPromise<DriftCase, Event>(({ input }) => input.type === "ROLLBACK" ? service.rollback(input.authorization, caseId, input.reason) : Promise.reject(new Error("Invalid event."))),
      close: fromPromise(() => service.close(authorization, caseId)),
    },
    actions: { accepted: assign(({ event }) => ({ value: output(event), error: null })), failed: assign({ error: () => "The drift operation was rejected safely." }) },
  }).createMachine({
    id: "driftOperations", initial: "idle", context: { authorization, caseId, value: null, error: null },
    states: {
      idle: { on: { LOAD: "loading" } }, loading: { invoke: { src: "load", onDone: { target: "reported", actions: "accepted" }, onError: { target: "failed", actions: "failed" } } },
      reported: { on: { TRIAGE: "triaging" } }, triaging: { invoke: { src: "triage", input: ({ event }) => event, onDone: { target: "triaged", actions: "accepted" }, onError: { target: "reported", actions: "failed" } } },
      triaged: { on: { INVESTIGATE: "investigating" } }, investigating: { invoke: { src: "investigate", onDone: { target: "investigation", actions: "accepted" }, onError: { target: "triaged", actions: "failed" } } },
      investigation: { on: { MITIGATE: "mitigating", BEGIN_CORRECTION: "beginningCorrection" } }, mitigating: { invoke: { src: "mitigate", input: ({ event }) => event, onDone: { target: "mitigation", actions: "accepted" }, onError: { target: "investigation", actions: "failed" } } },
      mitigation: { on: { BEGIN_CORRECTION: "beginningCorrection" } }, beginningCorrection: { invoke: { src: "beginCorrection", onDone: { target: "correcting", actions: "accepted" }, onError: { target: "mitigation", actions: "failed" } } },
      correcting: { on: { PROPOSE: "proposing" } }, proposing: { invoke: { src: "propose", input: ({ event }) => event, onDone: { target: "reviewing", actions: "accepted" }, onError: { target: "correcting", actions: "failed" } } },
      reviewing: { on: { REVIEW: "submittingReview" } }, submittingReview: { invoke: { src: "review", input: ({ event }) => event, onDone: [{ target: "canaryValidation", guard: ({ event }) => output(event).status === "canary-validation", actions: "accepted" }, { target: "correcting", guard: ({ event }) => output(event).status === "correcting", actions: "accepted" }, { target: "reviewing", actions: "accepted" }], onError: { target: "reviewing", actions: "failed" } } },
      canaryValidation: { on: { RUN_CANARIES: "runningCanaries" } }, runningCanaries: { invoke: { src: "canaries", onDone: [{ target: "staged", guard: ({ event }) => output(event).status === "staged", actions: "accepted" }, { target: "blocked", actions: "accepted" }], onError: { target: "canaryValidation", actions: "failed" } } },
      blocked: { on: { BEGIN_CORRECTION: "beginningCorrection" } }, staged: { on: { RELEASE: "releasing" } }, releasing: { invoke: { src: "release", input: ({ event }) => event, onDone: { target: "released", actions: "accepted" }, onError: { target: "staged", actions: "failed" } } },
      released: { on: { ROLLBACK: "rollingBack", CLOSE: "closing" } }, rollingBack: { invoke: { src: "rollback", input: ({ event }) => event, onDone: { target: "rolledBack", actions: "accepted" }, onError: { target: "released", actions: "failed" } } },
      rolledBack: { on: { CLOSE: "closing" } }, closing: { invoke: { src: "close", onDone: { target: "closed", actions: "accepted" }, onError: { target: "failed", actions: "failed" } } },
      failed: { on: { RETRY: "loading" } }, closed: { type: "final" },
    },
  });
};