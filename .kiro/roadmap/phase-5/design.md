# Phase 5 Design

Status: provider-neutral engineering core locally complete; deployment and external validation pending
Last reviewed: 2026-10-17

Authentication machines hold only a runtime-validated public session summary. Access tokens remain in adapter memory and refresh tokens remain behind `SecureStoragePort`. Authorization starts in the system browser with PKCE state stored securely; callbacks contain only authorization code and state.

Synchronization uses normalized evidence metadata rather than raw answers, prompts, diagnoses, or provider output. A local idempotent queue survives restart. The remote control plane authenticates every request, checks entitlement and current course release, deduplicates by idempotency key, rejects conflicting scored attempts, and derives summaries from accepted events.

Identity provider, durable event store, and deployment choices remain adapter decisions. The capability implementation is provider-neutral and does not grant authority to clients.
