# Phase 6 Design

Status: provider-neutral foundation and controlled fixture locally complete; deployed sandbox and content validation pending
Last reviewed: 2026-10-17

The client consumes public lab definitions and sends typed lifecycle events through `LabPort`. Connection tickets remain inside platform adapters and secure storage. Machine snapshots contain only public session metadata, checkpoint position, hint count, and validation outcomes.

The control plane authenticates before entitlement and quota checks. It owns private validator definitions, sandbox state, immutable image selection, audit metadata, TTL enforcement, and teardown. A controlled in-memory sandbox provider proves lifecycle semantics locally without executing learner input or granting AWS access. A deployed container runtime and browser terminal/editor transport remain provider adapters.

Operations are closed, typed identifiers rather than shell strings. The fixture validates resulting server workspace state. Production container protocols, durable stores, independent worker scheduling, and the six-to-ten reviewed lab library remain deployment/content work.
