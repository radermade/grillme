# Engineering Practices

## State management

Model application and learning workflows as explicit state machines. Use XState for TypeScript clients unless an accepted architecture decision replaces it.

Create machines for workflows with meaningful states, events, guards, retries, cancellation, timers, or concurrent activity. Likely examples include authentication, content synchronization, study sessions, lab lifecycle, assessments, downloads, and updates.

- Represent status with named states, not combinations of booleans.
- Change state only by sending typed domain events.
- Put transition rules, guards, and workflow effects in machines or invoked actors.
- Keep React components focused on rendering state and sending events.
- Keep durable domain data separate from ephemeral view state.
- Derive display values with selectors rather than duplicating state.
- Model loading, empty, success, degraded, retrying, cancelled, expired, and failure states when applicable.
- Make retry policy, timeout behavior, and cancellation explicit.
- Persist only the minimum safe machine snapshot and domain data.
- Version persisted state and define migrations before changing its shape.
- Never persist secrets, temporary AWS credentials, or sensitive prompts in machine snapshots.

Local component state is acceptable for isolated presentation details such as focus, animation, and an uncommitted input. Shared workflow state must not grow into ad hoc stores alongside machines.

## TypeScript and UI

- Enable strict TypeScript settings and avoid `any` at boundaries.
- Validate network, storage, content, and IPC data at runtime with shared schemas.
- Prefer small capability-focused modules and composition over inheritance.
- Keep business rules independent of rendering frameworks.
- Design keyboard access, focus order, labels, reduced motion, contrast, and error announcements with each feature.
- Do not claim accessibility compliance based only on automated checks.

## Tauri and Rust

- Expose the smallest practical Tauri command surface.
- Apply least-privilege Tauri capabilities and allowlists.
- Validate every IPC argument in Rust even when TypeScript validated it first.
- Keep secrets in OS-provided secure storage when device storage is unavoidable.
- Move privileged operations and final authorization to backend services.
- Avoid shell execution; when unavoidable, use fixed commands and validated arguments.
- Return structured, sanitized errors without filesystem paths, tokens, or internal details.

## Data and synchronization

- Define a clear source of truth for each entity.
- Use stable IDs, schema versions, and idempotency keys.
- Design progress updates for retries and intermittent connectivity.
- Prefer appendable learning events plus server-derived summaries for auditable progress.
- Resolve conflicts deliberately; do not silently use last-write-wins for scored work.
- Make offline capability explicit per feature rather than promising full offline behavior.