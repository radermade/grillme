import { setup } from "xstate";

export type WorkspaceEvent =
  | { type: "OPEN_COURSE" }
  | { type: "OPEN_ASSESSMENT" }
  | { type: "OPEN_GRILL" }
  | { type: "OPEN_TRAINING" }
  | { type: "OPEN_LAB" }
  | { type: "OPEN_READINESS" }
  | { type: "OPEN_MOCK" }
  | { type: "OPEN_OPERATIONS" }
  | { type: "OPEN_REVIEW" };

const navigation = {
  OPEN_COURSE: ".course",
  OPEN_ASSESSMENT: ".assessment",
  OPEN_GRILL: ".grill",
  OPEN_TRAINING: ".training",
  OPEN_LAB: ".lab",
  OPEN_READINESS: ".readiness",
  OPEN_MOCK: ".mock",
  OPEN_OPERATIONS: ".operations",
  OPEN_REVIEW: ".review",
} as const;

export const createWorkspaceMachine = () => setup({
  types: { events: {} as WorkspaceEvent },
}).createMachine({
  id: "workspace",
  initial: "course",
  on: navigation,
  states: {
    course: {},
    assessment: {},
    grill: {},
    training: {},
    lab: {},
    readiness: {},
    mock: {},
    operations: {},
    review: {},
  },
});
