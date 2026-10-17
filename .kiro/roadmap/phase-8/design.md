# Phase 8 Design

Status: readiness, mock, coverage-audit, and correction foundations locally complete; production course and approvals pending
Last reviewed: 2026-10-17

Readiness is a pure derivation over runtime-validated append-only evidence and a versioned rule set. No readiness summary is persisted as authoritative state. Rule changes recompute the view without mutating historical events. Sufficiency is separate from score and requires independent application evidence plus multiple recent activity types.

The mock workflow is a reusable XState machine over original versioned content. It preserves its deadline across pause and restart, records no hints, and appends one idempotent completion event. The included five-item session proves mechanics only and is clearly labeled as a preview.

Course coverage mappings and release decisions are data, not React rules. The release schema blocks release until every required approval and correction owner exists. Current mappings remain draft and intentionally expose gaps. Content reports are bounded, authenticated, idempotent, screened for credential patterns, and contain no attachments or account PII.

Production course authoring, deployed labs, readiness-rule approval, official-scope verification, manual accessibility review, operational ownership, and learner validation remain external gates.
