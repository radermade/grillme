# Phase 12 Requirements

Status: implementation complete; manual accessibility and product review pending

## R1: Semantic console model

1. Console content defines services, resources, relationships, views, forms, operations, and observable state with stable semantic IDs.
2. Guidance targets semantic elements, never screen coordinates or brittle DOM selectors.
3. The model is independent of React, browser APIs, Tauri, and AWS SDKs.
4. Learner input is data and cannot execute scripts or arbitrary commands.

## R2: Guidance modes

1. One scenario runs as walkthrough, practice, and challenge over the same state and validators.
2. Walkthroughs show intent, current console mapping, rationale, and expected observable outcome.
3. Practice progressively reduces guidance; challenge exposes objectives and validation only.
4. Guidance records console-mapping version and last verification date.

## Exit criteria

One Bedrock-centered scenario supports create/configure/inspect/troubleshoot operations in all three modes, is fully keyboard operable, validates resulting semantic state, and can later swap the simulator provider for a sandbox provider without changing scenario intent.
