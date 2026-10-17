import { setup } from "xstate";

export const createWorkspaceMachine = () => setup({
  types: {
    events: {} as
      | { type: "OPEN_COURSE" }
      | { type: "OPEN_ASSESSMENT" }
      | { type: "OPEN_REVIEW" },
  },
}).createMachine({
  id: "workspace",
  initial: "course",
  states: {
    course: { on: { OPEN_ASSESSMENT: "assessment", OPEN_REVIEW: "review" } },
    assessment: { on: { OPEN_COURSE: "course", OPEN_REVIEW: "review" } },
    review: { on: { OPEN_COURSE: "course", OPEN_ASSESSMENT: "assessment" } },
  },
});