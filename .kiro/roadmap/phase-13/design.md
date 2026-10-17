# Phase 13 Design

This is a console canary crawler, not an unrestricted scraper. A journey manifest lists allowed origins, services, regions, start routes, semantic landmarks, maximum pages, maximum duration, capture fields, and retention. Navigation outside the manifest fails closed.

The process uses a dedicated canary account and CI/workload federation. It stores normalized accessibility landmarks and visible labels plus optionally encrypted, retention-limited screenshots. It must redact account identifiers, request IDs, resource names, notifications, and other incidental data before persistence.

A state machine owns `scheduled -> authorizing -> navigating -> observing -> diffing -> suspectedDrift -> awaitingReview -> accepted|rejected -> closed`, with failure, retry, timeout, and account-cleanup paths.

Diffing combines semantic landmark changes, label changes, route changes, and screenshot/perceptual changes. Thresholds create review candidates; they never rewrite mappings or validators. A reviewer-approved change creates a new presentation-mapping version and triggers Phase 12 regression tests.
