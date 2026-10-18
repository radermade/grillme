# Phase 12 Requirements

Status: semantic engine complete; exact walkthrough UX incomplete pending reviewed capture coverage

## R1: Semantic console model

1. Console content defines services, resources, relationships, views, forms, operations, and observable state with stable semantic IDs.
2. Guidance targets semantic elements, never screen coordinates or brittle DOM selectors.
3. The model is independent of React, browser APIs, Tauri, and AWS SDKs.
4. Learner input is data and cannot execute scripts or arbitrary commands.

## R2: Guidance modes

1. Walkthrough mode is pixel-accurate to reviewed, hash-pinned AWS Console captures at a declared viewport; it does not use an AWS-like reconstruction.
2. Our accessible fields, operations, resources, and navigation hotspots overlay versioned normalized anchor rectangles on those captures.
3. Every capture records source origin, region, viewport, capture date, reviewer, screenshot hash, semantic version, AWS version, and presentation version.
4. Missing, stale, unapproved, hash-mismatched, or incompletely anchored capture coverage blocks walkthrough mode.
5. Practice may use a clearly labeled semantic reconstruction; challenge exposes objectives and validation only.
6. Drift creates review work and invalidates affected captures; it never auto-adjusts anchors or publishes replacement scenes.

## Exit criteria

One Bedrock-centered scenario supports create/configure/inspect/troubleshoot operations in all three modes, is fully keyboard operable, validates resulting semantic state, and can later swap the simulator provider for a sandbox provider without changing scenario intent.
