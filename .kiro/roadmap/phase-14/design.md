# Phase 14 Design

`LabValidation` evolves from a boolean result to a discriminated outcome. `failed` means the learner workspace violates known checks. `inconclusive` means the validator cannot make a trustworthy judgment because of service health, permissions, region support, schema drift, stale compatibility, or unavailable evidence. Inconclusive attempts preserve work and consume no learner attempt quota.

A validator bundle is immutable and versioned. Provisioning pins lab definition, environment template, AWS semantic mapping, presentation mapping, validator bundle, region, and provider adapter versions. No component changes mid-session.

Canaries run known-good and known-bad fixtures through simulator, controlled sandbox, and eventually live managed AWS adapters. Reconciliation classifies healthy, degraded, drift-suspected, or disabled. Simulator/live divergence is inconclusive until reviewed.

Health records expire. Provisioning fails closed when health is stale or disabled. Alerts create operational incidents; they do not automatically patch validators or rewrite evidence.
