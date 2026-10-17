# Product and Architecture Direction

## Product

This repository builds a study workspace centered on adaptive grilling, free-response reasoning, implementation exercises, debugging, and disposable cloud labs. Multiple-choice practice is supporting functionality, not the primary experience.

The initial course is expected to target AWS Certified Generative AI Developer - Professional (AIP-C01). Treat this as pending until product confirms the exact certification.

## Target platforms

Plan for desktop, web, and mobile from the beginning without forcing every platform through identical UI or infrastructure.

- Desktop: Tauri 2 application.
- Web: browser client using shared TypeScript packages.
- Mobile: platform client selected after validating mobile learning workflows; Tauri 2 mobile is an option, not a locked decision.
- Backend: remote control plane for identity, entitlements, progress, content, labs, evaluation, and analytics.

## Architectural boundaries

Use a monorepo organized around capabilities rather than platform copies:

- `apps/desktop`: Tauri desktop shell and desktop integrations.
- `apps/web`: web composition root.
- `apps/mobile`: add only when mobile implementation begins.
- `packages/domain`: framework-independent domain types and rules.
- `packages/machines`: reusable state machine logic.
- `packages/content`: schemas and course rendering contracts.
- `packages/ui`: portable UI primitives where portability is real.
- `packages/platform`: interfaces for storage, auth, networking, telemetry, and device features.
- `src-tauri`: Rust commands, capabilities, and native desktop integration.

These paths are guidance for scaffolding, not a requirement to create empty packages.

## Repository placement

Keep `.kiro` limited to roadmap, specification, steering, and Kiro configuration artifacts. Place all runnable application code, prototypes, tests, package manifests, build configuration, and developer tooling at the repository root under the appropriate `apps/`, `packages/`, `prototypes/`, or root configuration paths. Never scaffold an application inside `.kiro`.

## Dependency direction

Domain and machine packages must not import Tauri, browser globals, React Native APIs, or platform SDKs. Applications inject platform adapters at their composition roots. UI consumes machine state and sends events; it must not contain hidden workflow rules.

Prefer web standards and portable TypeScript for shared behavior. Keep native capabilities behind narrow interfaces. Share domain behavior and design tokens aggressively, but share presentation only when platform interaction patterns remain appropriate.

## Remote lab boundary

Clients never receive permanent AWS credentials, provisioning authority, answer keys, or privileged validators. A backend issues short-lived sessions and provisions isolated environments with strict IAM, quotas, budgets, regions, tags, TTLs, audit logs, and automatic teardown.

Treat clients as untrusted. Entitlement checks, final grading, course release rules, and progress integrity controls must be enforced server-side.