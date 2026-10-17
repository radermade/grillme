# Phase 4 Design

Status: engine locally complete; production content deferred  
Last reviewed: 2026-10-16

## Engine-first scope

Phase 4 builds the scenario engine and proves it with one architecture fixture and one debugging fixture. Production scenario authoring and the minimum content-library count move to Phase 8. These fixtures validate capabilities, not curriculum completeness.

## Scenario model

A scenario defines kind, skills, briefing, workspace resources/settings/evidence panels, ordered checkpoints, deterministic checks, hints, debrief, root cause, and prevention. Check types cover selected/forbidden components, connections, setting values, and diagnosis concepts.

## Modes

- Walkthrough: instruction and rationale are shown before work.
- Practice: objectives are shown and hints unlock progressively.
- Challenge: objectives and validation are shown without instructions or hints.

All modes use identical workspace state and validators. Mode affects guidance, not correctness.

## Machine

A catalog-aware XState machine owns scenario selection, mode selection, restoration, checkpoint state, workspace edits, hints, resets, validation, evidence persistence, revision, and debrief. Failed saves enter degraded state with retry or unsaved continuation.

Workspace operations are typed events. No generic command execution, script evaluation, or shell access exists.