# Phase 1 Design

Status: implementation in progress  
Last reviewed: 2026-10-16

## Structure

- `apps/desktop`: React/Vite desktop composition root and platform adapters.
- `packages/domain`: portable course and progress contracts.
- `packages/content`: runtime course schemas and parser.
- `packages/machines`: injected XState workflow factories.
- `packages/platform`: capability interfaces.
- `src-tauri`: minimal Rust host, configuration, and capabilities.

The Phase 0 prototype stays under `prototypes` and is not imported by the product.

## Dependency direction

`domain <- content` and `domain + platform <- machines`; the desktop app composes all packages and owns React, Tauri, DOM, and local-storage adapters. Shared packages expose source TypeScript during early development and remain platform-free.

## Course session

The course machine loads validated content and resumable progress, then enters `ready` and `reading`. Navigation updates a pending progress record and enters `saving`. A successful save returns to `reading`; failure enters `degraded`, where the learner can retry or continue with unsaved state. Load failure enters `failed` with retry.

States: `loading`, `ready`, `reading`, `saving`, `degraded`, `failed`.

Persisted progress contains schema version, course/version IDs, current lesson ID, completed lesson IDs, and update time. It contains no lesson content, answers, credentials, or machine snapshot.