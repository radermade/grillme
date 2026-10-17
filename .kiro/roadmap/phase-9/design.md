# Phase 9 Design

Status: private-beta operations and commercial-control foundations locally complete; real beta and production release pending
Last reviewed: 2026-10-17

Private-beta analytics are opt-in and schema-closed. Clients queue only predefined numeric, boolean, enum, version, and channel fields. The authenticated control plane binds events to a learner internally, deduplicates them, applies retention, supports deletion, and derives aggregate metrics. No third-party analytics SDK is embedded.

Commercial access is represented by provider-neutral entitlements. Billing webhooks and payment collection remain deployment adapters. Shared machines consume public entitlement status and never grant authority; every privileged server service must still authorize independently.

Privacy and support workflows return request receipts and redacted metadata. Local code proves request lifecycle and deletion coordination but does not claim regulatory compliance.

Release assignment is server-derived from channel, staged rollout, minimum version, and rollback state. No installer URL or executable command is accepted from release data. Code signing, notarization, hosted updates, support staffing, retention approval, and real beta metrics remain external gates.
