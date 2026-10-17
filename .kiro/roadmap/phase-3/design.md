# Phase 3 Design

Status: provider-neutral local implementation complete; server provider pending  
Last reviewed: 2026-10-16

## Evaluator boundary

`EvaluationPort` accepts a versioned request and returns unknown data. The grill machine runtime-validates that data against the evaluation schema. Phase 3 ships a deterministic reference evaluator behind this port for offline development. A production server adapter can replace it without changing domain events or UI.

## Rubric model

Each concept has an ID, label, accepted evidence terms, remediation, and optional probe. Misconceptions have detection terms and corrective feedback. Evaluation returns covered/missing concepts, detected misconceptions, response evidence excerpts, score, feedback, follow-up recommendation, and evaluator provenance.

## Session machine

States include `loading`, `introduction`, `prompting`, `composing`, `evaluating`, `retrying`, `feedback`, `clarifying`, `saving`, `degraded`, `summarizing`, `complete`, `budgetExhausted`, and `failed`.

The machine caps sessions at four turns, evaluation attempts at two per turn, and a fixed cost-unit budget. It never persists raw provider output. Validated responses and evaluations are appended using one idempotency key per turn.

## Adaptation and summary

Missing concepts choose probes first; detected misconceptions choose corrective questions; otherwise the machine advances to a new skill. Follow-up reasons are stored with prompts and shown to learners. The final summary is deterministically projected from validated turn evaluations and creates review items for concepts not demonstrated.

## Control-plane evaluation core

The repository includes a framework-neutral control-plane service core under `apps/control-plane`. Its HTTP adapter reconstructs authorization from the request header; bearer credentials are not accepted in the JSON body. The service validates the request, authenticates before quota/provider work, looks up the authoritative rubric, reserves the maximum allowed cost, calls an injected provider with hard timeout and bounded attempts, validates provider provenance and complete concept partitioning, then commits actual cost or releases quota on failure.

Malformed, timed-out, or provenance-invalid provider output falls back to the shared deterministic evaluator. Audit events contain IDs, outcome, attempts, cost units, and duration only; they exclude authorization, learner response, prompts, and raw provider output. The core does not start a network listener or select hosting, identity, quota storage, audit storage, or model vendor.