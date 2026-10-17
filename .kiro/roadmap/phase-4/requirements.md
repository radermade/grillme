# Phase 4 Requirements

Status: engine locally complete; content production and manual validation deferred  
Last reviewed: 2026-10-16

## R1: Reusable guided-scenario engine

The app must run versioned hands-on scenarios independently of course-specific UI.

Acceptance criteria:

1. One scenario definition supports walkthrough, practice, and challenge modes.
2. Walkthrough exposes step instructions and rationale; practice exposes progressive hints; challenge exposes objectives and validators only.
3. Validation checks observable workspace state, not prescribed clicks.
4. Learners can experiment, reset to the current checkpoint, revise failed work, and complete a debrief.
5. Guidance usage is retained in evidence and cannot establish mastery by itself.

## R2: Portable workspaces

The engine must support architecture and debugging scenarios without arbitrary local execution.

Acceptance criteria:

1. Architecture workspaces support components, connections, and settings with keyboard-operable controls.
2. Debugging workspaces expose immutable code/log/config/test fixtures, editable safe settings, and a diagnosis field.
3. Validators are deterministic and platform independent.
4. No learner input is evaluated as code or passed to a shell.
5. The same scenario model can use a different mobile presentation later.

## R3: State and evidence

Scenario progress must use an explicit machine and append-only evidence.

Acceptance criteria:

1. States include selection, mode selection, loading, briefing, demonstrating, working, hinting, validating, failed checkpoint, passed checkpoint, degraded, debriefing, complete, and failed.
2. Each validation attempt records mode, workspace outcome, failed check IDs, hints used, resets, step, timestamp, and idempotency key.
3. Progress resumes safely from runtime-validated persisted data.
4. Completion distinguishes guided completion from independent challenge evidence.