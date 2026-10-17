import { assign, fromPromise, setup } from "xstate";
import { parseEvaluationResult, parseGrill, parseGrillProgress, parseReviewSchedule } from "@grillme/content";
import type {
  AppError,
  EvaluationRequest,
  EvaluationResult,
  Grill,
  GrillChallengeEvent,
  GrillEvidenceEvent,
  GrillProgress,
  GrillPrompt,
  GrillSummary,
  GrillTurn,
  ReviewItem,
  ReviewSchedule,
} from "@grillme/domain";
import type { EvaluationPort, PlatformPorts } from "@grillme/platform";
import { grillSyncEvent } from "./sync-event";
import { containsPotentialSecret, evaluateDeterministically } from "@grillme/evaluation";

const progressKey = (grill: Grill) => `grill-progress:${grill.id}:${grill.version}`;
const evidenceKey = (grill: Grill) => `grill-events:${grill.id}:${grill.version}`;
const challengeKey = (grill: Grill) => `grill-challenges:${grill.id}:${grill.version}`;
const scheduleKey = (grill: Grill) => `review-schedule:${grill.courseId}:${grill.courseVersion}`;

type Context = {
  grill: Grill | null;
  progress: GrillProgress | null;
  currentPrompt: GrillPrompt | null;
  question: string;
  reason: string;
  response: string;
  confidence: number;
  hintVisible: boolean;
  evaluationAttempt: number;
  currentEvaluation: EvaluationResult | null;
  pendingTurn: GrillTurn | null;
  summary: GrillSummary | null;
  error: AppError | null;
};
type Event =
  | { type: "START" }
  | { type: "RESPOND"; response: string }
  | { type: "CONFIDENCE"; value: number }
  | { type: "SUBMIT" }
  | { type: "SHOW_HINT" }
  | { type: "CLARIFY" }
  | { type: "CONTINUE" }
  | { type: "END_EARLY" }
  | { type: "RETRY" }
  | { type: "USE_FALLBACK" }
  | { type: "CONTINUE_OFFLINE" }
  | { type: "CHALLENGE_FEEDBACK" }
  | { type: "REPORT_CONTENT" };
type Loaded = { grill: Grill; progress: GrillProgress; prompt: GrillPrompt };
type Evaluated = { result: EvaluationResult; attempt: number };
type Saved = { progress: GrillProgress; turn: GrillTurn };
type Finalized = { summary: GrillSummary };
type DoneEvent<T> = { output: T };
const outputOf = <T>(event: unknown): T => (event as DoneEvent<T>).output;
export const createGrillSessionMachine = (
  source: unknown,
  ports: PlatformPorts,
  evaluator: EvaluationPort,
  timeoutMs = 8_000,
) => {
  const load = async (): Promise<Loaded> => {
    const grill = parseGrill(source);
    const stored = parseGrillProgress(await ports.storage.get(progressKey(grill)));
    const fallbackPrompt = grill.prompts[0];
    if (!fallbackPrompt) throw new Error("Grill has no prompts.");
    const validStored = stored?.grillId === grill.id && stored.grillVersion === grill.version ? stored : null;
    const prompt = grill.prompts.find(({ id }) => id === validStored?.currentPromptId) ?? fallbackPrompt;
    const progress: GrillProgress = validStored ?? {
      schemaVersion: 1,
      grillId: grill.id,
      grillVersion: grill.version,
      sessionId: ports.ids.create(),
      turns: [],
      budgetUsed: 0,
      currentPromptId: prompt.id,
      pendingQuestion: null,
      pendingReason: null,
      updatedAt: ports.clock.now(),
    };
    return { grill, progress, prompt };
  };

  const evaluate = async (input: { context: Context }): Promise<Evaluated> => {
    const { grill, progress, currentPrompt, response, confidence } = input.context;
    if (!grill || !progress || !currentPrompt) throw new Error("Evaluation context unavailable.");
    const request: EvaluationRequest = {
      schemaVersion: 1,
      sessionId: progress.sessionId,
      turnId: ports.ids.create(),
      promptId: currentPrompt.id,
      rubricId: currentPrompt.rubric.id,
      rubricVersion: currentPrompt.rubric.version,
      response,
      confidence,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const raw = await Promise.race([
        evaluator.evaluate(request, controller.signal),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(new Error("Evaluation timed out.")),
            { once: true },
          );
        }),
      ]);
      const result = parseEvaluationResult(raw);
      const allowedConcepts = currentPrompt.rubric.concepts.map(({ id }) => id);
      const allowedMisconceptions = currentPrompt.rubric.misconceptions.map(({ id }) => id);
      if (!result
        || result.rubricId !== currentPrompt.rubric.id
        || result.rubricVersion !== currentPrompt.rubric.version
        || result.coveredConceptIds.some((id) => !allowedConcepts.includes(id))
        || result.missingConceptIds.some((id) => !allowedConcepts.includes(id))
        || result.misconceptionIds.some((id) => !allowedMisconceptions.includes(id))) {
        throw new Error("Evaluation output is invalid.");
      }
      return { result, attempt: input.context.evaluationAttempt };
    } finally {
      clearTimeout(timer);
    }
  };

  const persistTurn = async (input: { context: Context }): Promise<Saved> => {
    const { grill, progress, pendingTurn } = input.context;
    if (!grill || !progress || !pendingTurn) throw new Error("Turn unavailable.");
    const followUp = pendingTurn.evaluation.followUp;
    const nextPrompt = grill.prompts.find(({ id }) =>
      !progress.turns.some((turn) => turn.promptId === id) && id !== pendingTurn.promptId);
    const updated: GrillProgress = {
      ...progress,
      turns: [...progress.turns, pendingTurn],
      budgetUsed: progress.budgetUsed + pendingTurn.evaluation.costUnits,
      currentPromptId: followUp ? pendingTurn.promptId : nextPrompt?.id ?? pendingTurn.promptId,
      pendingQuestion: followUp?.question ?? null,
      pendingReason: followUp?.reason ?? null,
      updatedAt: ports.clock.now(),
    };
    const event: GrillEvidenceEvent = {
      schemaVersion: 1,
      id: pendingTurn.id,
      idempotencyKey: pendingTurn.id,
      type: "grill.turn-evaluated",
      courseId: grill.courseId,
      courseVersion: grill.courseVersion,
      grillId: grill.id,
      grillVersion: grill.version,
      sessionId: progress.sessionId,
      turn: pendingTurn,
    };
    await ports.storage.set(progressKey(grill), updated);
    await ports.storage.append(evidenceKey(grill), event);
    await ports.syncQueue?.enqueue(grillSyncEvent(event));
    return { progress: updated, turn: pendingTurn };
  };
  const persistChallenge = async (input: { context: Context; type: GrillChallengeEvent["type"] }) => {
    const { grill, progress, pendingTurn } = input.context;
    const turn = pendingTurn ?? progress?.turns.at(-1);
    if (!grill || !progress || !turn) throw new Error("Feedback unavailable.");
    const id = ports.ids.create();
    const event: GrillChallengeEvent = {
      schemaVersion: 1,
      id,
      idempotencyKey: id,
      type: input.type,
      courseId: grill.courseId,
      courseVersion: grill.courseVersion,
      grillId: grill.id,
      sessionId: progress.sessionId,
      turnId: turn.id,
      occurredAt: ports.clock.now(),
    };
    await ports.storage.append(challengeKey(grill), event);
  };

  const finalize = async (input: { context: Context }): Promise<Finalized> => {
    const { grill, progress } = input.context;
    if (!grill || !progress) throw new Error("Session unavailable.");
    const conceptIds = [...new Set(grill.prompts.flatMap(({ rubric }) => rubric.concepts.map(({ id }) => id)))];
    const demonstratedConceptIds = [...new Set(progress.turns.flatMap(({ evaluation }) => evaluation.coveredConceptIds))];
    const missingConceptIds = conceptIds.filter((id) => !demonstratedConceptIds.includes(id));
    const misconceptionIds = [...new Set(progress.turns.flatMap(({ evaluation }) => evaluation.misconceptionIds))];
    const reviewSkillIds = [...new Set(grill.prompts
      .filter(({ rubric }) => rubric.concepts.some(({ id }) => missingConceptIds.includes(id)))
      .map(({ skillId }) => skillId))];
    const summary: GrillSummary = {
      sessionId: progress.sessionId,
      turnsCompleted: progress.turns.length,
      budgetUsed: progress.budgetUsed,
      demonstratedConceptIds,
      missingConceptIds,
      misconceptionIds,
      reviewSkillIds,
    };

    const existing = parseReviewSchedule(await ports.storage.get(scheduleKey(grill))) ?? {
      schemaVersion: 1 as const,
      courseId: grill.courseId,
      courseVersion: grill.courseVersion,
      items: [],
      updatedAt: ports.clock.now(),
    };
    const additions: ReviewItem[] = reviewSkillIds.map((skillId) => {
      const prompt = grill.prompts.find((item) => item.skillId === skillId)!;
      const missing = prompt.rubric.concepts.filter(({ id }) => missingConceptIds.includes(id));
      return {
        skillId,
        title: `Grill review: ${skillId.replaceAll("-", " ")}`,
        prompt: prompt.question,
        answer: missing.map(({ label, remediation }) => `${label}: ${remediation}`).join(" "),
        reason: `The grill did not demonstrate: ${missing.map(({ label }) => label).join(", ")}.`,
        removalCriteria: "Rate recall 4 or 5 on two review sessions.",
        dueAt: ports.clock.now(),
        intervalDays: 0,
        successfulReviews: 0,
        sourceAssessmentId: grill.id,
      };
    });
    const items = existing.items
      .filter(({ sourceAssessmentId }) => sourceAssessmentId !== grill.id)
      .concat(additions);
    await ports.storage.set(scheduleKey(grill), { ...existing, items, updatedAt: ports.clock.now() });
    return { summary };
  };
  const makeTurn = (context: Context, result: EvaluationResult, attemptNumber: number): GrillTurn | null => {
    if (!context.progress || !context.currentPrompt) return null;
    return {
      id: ports.ids.create(),
      promptId: context.currentPrompt.id,
      skillId: context.currentPrompt.skillId,
      question: context.question,
      reason: context.reason,
      response: context.response,
      confidence: context.confidence,
      evaluation: result,
      attemptNumber,
      occurredAt: ports.clock.now(),
    };
  };

  return setup({
    types: { context: {} as Context, events: {} as Event },
    actors: {
      load: fromPromise<Loaded>(load),
      evaluate: fromPromise<Evaluated, { context: Context }>(({ input }) => evaluate(input)),
      persistTurn: fromPromise<Saved, { context: Context }>(({ input }) => persistTurn(input)),
      challenge: fromPromise<void, { context: Context; type: GrillChallengeEvent["type"] }>(({ input }) => persistChallenge(input)),
      finalize: fromPromise<Finalized, { context: Context }>(({ input }) => finalize(input)),
    },
    guards: {
      hasResponse: ({ context }) => context.response.trim().length > 0
        && context.response.length <= 5_000
        && !containsPotentialSecret(context.response),
      validConfidence: ({ event }) => event.type === "CONFIDENCE"
        && Number.isInteger(event.value) && event.value >= 1 && event.value <= 5,
      canRetry: ({ context }) => !!context.grill && context.evaluationAttempt < context.grill.maxEvaluationAttempts,
      budgetExhausted: ({ context }) => !!context.grill && !!context.progress
        && context.progress.budgetUsed >= context.grill.evaluationBudget,
      turnLimitReached: ({ context }) => !!context.grill && !!context.progress
        && context.progress.turns.length >= context.grill.maxTurns,
    },
    actions: {
      loaded: assign(({ event }) => {
        const output = outputOf<Loaded>(event);
        return {
          grill: output.grill,
          progress: output.progress,
          currentPrompt: output.prompt,
          question: output.progress.pendingQuestion ?? output.prompt.question,
          reason: output.progress.pendingReason ?? output.prompt.reason,
          error: null,
        };
      }),
      loadFailed: assign({ error: () => ({ code: "CONTENT_INVALID" as const, message: "This grill could not be opened safely." }) }),
      setResponse: assign(({ event }) => event.type === "RESPOND" ? { response: event.response } : {}),
      setConfidence: assign(({ event }) => event.type === "CONFIDENCE" ? { confidence: event.value } : {}),
      showHint: assign({ hintVisible: true }),
      resetAttempts: assign({ evaluationAttempt: 0, error: null }),
      incrementAttempt: assign({ evaluationAttempt: ({ context }) => context.evaluationAttempt + 1 }),
      acceptEvaluation: assign(({ context, event }) => {
        const output = outputOf<Evaluated>(event);
        return {
          currentEvaluation: output.result,
          pendingTurn: makeTurn(context, output.result, output.attempt),
          error: null,
        };
      }),
      evaluationFailed: assign({ error: () => ({ code: "UNKNOWN" as const, message: "Assisted evaluation did not return a valid result." }) }),
      useFallback: assign(({ context }) => {
        if (!context.currentPrompt) return {};
        const result = evaluateDeterministically(context.currentPrompt.rubric, context.response, "deterministic-fallback");
        return { currentEvaluation: result, pendingTurn: makeTurn(context, result, context.evaluationAttempt), error: null };
      }),
      turnSaved: assign(({ event }) => {
        const output = outputOf<Saved>(event);
        return { progress: output.progress, pendingTurn: null, currentEvaluation: output.turn.evaluation, error: null };
      }),
      saveFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "This evaluated turn is not saved on this device yet." }) }),
      acceptUnsaved: assign(({ context }) => {
        if (!context.progress || !context.pendingTurn) return {};
        const followUp = context.pendingTurn.evaluation.followUp;
        return {
          progress: {
            ...context.progress,
            turns: [...context.progress.turns, context.pendingTurn],
            budgetUsed: context.progress.budgetUsed + context.pendingTurn.evaluation.costUnits,
            pendingQuestion: followUp?.question ?? null,
            pendingReason: followUp?.reason ?? null,
            updatedAt: ports.clock.now(),
          },
          pendingTurn: null,
          currentEvaluation: context.pendingTurn.evaluation,
        };
      }),
      prepareNext: assign(({ context }) => {
        if (!context.grill || !context.progress) return {};
        const followUp = context.progress.pendingQuestion;
        const nextPrompt = context.grill.prompts.find(({ id }) =>
          !context.progress?.turns.some((turn) => turn.promptId === id));
        const prompt = followUp ? context.currentPrompt : nextPrompt ?? context.currentPrompt;
        return {
          currentPrompt: prompt,
          question: followUp ?? prompt?.question ?? "",
          reason: context.progress.pendingReason ?? prompt?.reason ?? "",
          response: "",
          confidence: 3,
          hintVisible: false,
          evaluationAttempt: 0,
          currentEvaluation: null,
        };
      }),
      clarify: assign(({ context }) => ({
        question: `Clarification: explain your reasoning for this question in concrete implementation terms. ${context.question}`,
        reason: "You requested clarification before continuing.",
        response: "",
        hintVisible: false,
      })),
      finalized: assign(({ event }) => ({ summary: outputOf<Finalized>(event).summary, error: null })),
      finalizeFailed: assign({ error: () => ({ code: "STORAGE_FAILED" as const, message: "Your grill summary could not be prepared yet." }) }),
    },
  }).createMachine({
    id: "grillSession",
    initial: "loading",
    context: {
      grill: null,
      progress: null,
      currentPrompt: null,
      question: "",
      reason: "",
      response: "",
      confidence: 3,
      hintVisible: false,
      evaluationAttempt: 0,
      currentEvaluation: null,
      pendingTurn: null,
      summary: null,
      error: null,
    },
    states: {
      loading: { invoke: { src: "load", onDone: { target: "introduction", actions: "loaded" }, onError: { target: "failed", actions: "loadFailed" } } },
      introduction: { on: { START: "prompting" } },
      prompting: { always: "composing" },
      composing: {
        on: {
          RESPOND: { actions: "setResponse" },
          CONFIDENCE: { guard: "validConfidence", actions: "setConfidence" },
          SHOW_HINT: { actions: "showHint" },
          SUBMIT: { target: "evaluating", guard: "hasResponse", actions: "resetAttempts" },
          END_EARLY: "summarizing",
        },
      },
      evaluating: {
        entry: "incrementAttempt",
        invoke: {
          src: "evaluate",
          input: ({ context }) => ({ context }),
          onDone: { target: "saving", actions: "acceptEvaluation" },
          onError: [
            { target: "retrying", guard: "canRetry", actions: "evaluationFailed" },
            { target: "fallback", actions: "evaluationFailed" },
          ],
        },
      },
      retrying: { always: "evaluating" },
      fallback: { on: { USE_FALLBACK: { target: "saving", actions: "useFallback" }, RETRY: "evaluating" } },
      saving: {
        invoke: {
          src: "persistTurn",
          input: ({ context }) => ({ context }),
          onDone: { target: "feedback", actions: "turnSaved" },
          onError: { target: "degraded", actions: "saveFailed" },
        },
      },
      degraded: { on: { RETRY: "saving", CONTINUE_OFFLINE: { target: "feedback", actions: "acceptUnsaved" } } },
      feedback: {
        on: {
          CLARIFY: { target: "clarifying", actions: "clarify" },
          CHALLENGE_FEEDBACK: { target: "challenging" },
          REPORT_CONTENT: { target: "reporting" },
          CONTINUE: [
            { target: "budgetExhausted", guard: "budgetExhausted" },
            { target: "summarizing", guard: "turnLimitReached" },
            { target: "prompting", actions: "prepareNext" },
          ],
          END_EARLY: "summarizing",
        },
      },
      clarifying: { always: "composing" },
      challenging: { invoke: { src: "challenge", input: ({ context }) => ({ context, type: "grill.feedback-challenged" }), onDone: "feedback", onError: "feedback" } },
      reporting: { invoke: { src: "challenge", input: ({ context }) => ({ context, type: "grill.content-reported" }), onDone: "feedback", onError: "feedback" } },
      budgetExhausted: { on: { CONTINUE: "summarizing" } },
      summarizing: { invoke: { src: "finalize", input: ({ context }) => ({ context }), onDone: { target: "complete", actions: "finalized" }, onError: { target: "failed", actions: "finalizeFailed" } } },
      complete: {},
      failed: { on: { RETRY: "loading" } },
    },
  });
};