import { assign, setup } from "xstate";
import { createLabWorkspace, executeLabCommand, isCheckCommand, type LabWorkspace } from "./lab";

export type AnswerKey = "baseline" | "grillOne" | "grillTwo" | "scenario" | "validation" | "reflection";

export type PrototypeContext = {
  participantId: string;
  answers: Record<AnswerKey, string>;
  baselineConfidence: number;
  finalConfidence: number;
  hintsUsed: number;
  lab: LabWorkspace;
  startedAt: string;
  completedAt: string | null;
};

export type PrototypeEvent =
  | { type: "PARTICIPANT"; value: string }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "ANSWER"; key: AnswerKey; value: string }
  | { type: "CONFIDENCE"; phase: "baseline" | "final"; value: number }
  | { type: "USE_HINT" }
  | { type: "LAB_COMMAND"; command: string }
  | { type: "RESTART" };

export const emptyAnswers = (): Record<AnswerKey, string> => ({
  baseline: "", grillOne: "", grillTwo: "", scenario: "", validation: "", reflection: "",
});

const hasParticipant = ({ context }: { context: PrototypeContext }) => context.participantId.trim().length > 0;
const hasAnswer = (key: AnswerKey) => ({ context }: { context: PrototypeContext }) => context.answers[key].trim().length > 0;
const hasGrillAnswers = ({ context }: { context: PrototypeContext }) =>
  context.answers.grillOne.trim().length > 0 && context.answers.grillTwo.trim().length > 0;
export const prototypeMachine = setup({
  types: { context: {} as PrototypeContext, events: {} as PrototypeEvent },
  guards: {
    hasParticipant,
    hasBaseline: hasAnswer("baseline"),
    hasGrillAnswers,
    hasScenario: hasAnswer("scenario"),
    hasValidation: hasAnswer("validation"),
    hasReflection: hasAnswer("reflection"),
    isCheck: ({ event }) => event.type === "LAB_COMMAND" && isCheckCommand(event.command),
    labPassed: ({ context }) => context.lab.passed,
  },
  actions: {
    participant: assign(({ event }) => event.type === "PARTICIPANT" ? { participantId: event.value } : {}),
    answer: assign(({ context, event }) => event.type === "ANSWER"
      ? { answers: { ...context.answers, [event.key]: event.value } } : {}),
    confidence: assign(({ event }) => event.type === "CONFIDENCE"
      ? event.phase === "baseline" ? { baselineConfidence: event.value } : { finalConfidence: event.value } : {}),
    useHint: assign({ hintsUsed: ({ context }) => Math.min(context.hintsUsed + 1, 3) }),
    runLabCommand: assign(({ context, event }) => event.type === "LAB_COMMAND"
      ? { lab: executeLabCommand(context.lab, event.command) } : {}),
    markComplete: assign({ completedAt: () => new Date().toISOString() }),
    restart: assign({
      participantId: "", answers: emptyAnswers(), baselineConfidence: 3, finalConfidence: 3,
      hintsUsed: 0, lab: createLabWorkspace(), startedAt: () => new Date().toISOString(), completedAt: null,
    }),
  },
}).createMachine({
  id: "prototype",
  initial: "active",
  context: {
    participantId: "", answers: emptyAnswers(), baselineConfidence: 3, finalConfidence: 3,
    hintsUsed: 0, lab: createLabWorkspace(), startedAt: new Date().toISOString(), completedAt: null,
  },
  on: {
    PARTICIPANT: { actions: "participant" },
    ANSWER: { actions: "answer" },
    CONFIDENCE: { actions: "confidence" },
    USE_HINT: { actions: "useHint" },
  },
  states: {
    active: {
      initial: "intro",
      states: {
        hist: { type: "history", history: "deep" },
        intro: { on: { NEXT: { target: "baseline", guard: "hasParticipant" }, PAUSE: "#prototype.paused" } },
        baseline: { on: { BACK: "intro", NEXT: { target: "teaching", guard: "hasBaseline" }, PAUSE: "#prototype.paused" } },
        teaching: { on: { BACK: "baseline", NEXT: "grilling", PAUSE: "#prototype.paused" } },
        grilling: { on: { BACK: "teaching", NEXT: { target: "scenario", guard: "hasGrillAnswers" }, PAUSE: "#prototype.paused" } },
        scenario: { on: { BACK: "grilling", NEXT: { target: "implementing", guard: "hasScenario" }, PAUSE: "#prototype.paused" } },
        implementing: {
          initial: "editing",
          states: {
            editing: {
              on: {
                LAB_COMMAND: [
                  { guard: "isCheck", target: "checking", actions: "runLabCommand" },
                  { actions: "runLabCommand" },
                ],
              },
            },
            checking: {
              always: [
                { guard: "labPassed", target: "success" },
                { target: "failure" },
              ],
            },
            failure: {
              on: {
                LAB_COMMAND: [
                  { guard: "isCheck", target: "checking", actions: "runLabCommand" },
                  { target: "editing", actions: "runLabCommand" },
                ],
              },
            },
            success: {
              on: {
                LAB_COMMAND: { target: "editing", actions: "runLabCommand" },
                NEXT: "#prototype.active.validating",
              },
            },
          },
          on: { BACK: "scenario", PAUSE: "#prototype.paused" },
        },
        validating: { on: { BACK: "implementing", NEXT: { target: "reflecting", guard: "hasValidation" }, PAUSE: "#prototype.paused" } },
        reflecting: { on: { BACK: "validating", NEXT: { target: "complete", guard: "hasReflection" }, PAUSE: "#prototype.paused" } },
        complete: { entry: "markComplete", on: { RESTART: { target: "intro", actions: "restart" } } },
      },
    },
    paused: { on: { RESUME: "active.hist" } },
  },
});