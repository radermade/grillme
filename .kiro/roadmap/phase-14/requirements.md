# Phase 14 Requirements

Status: local compatibility and simulator-canary foundation complete; scheduled live infrastructure and operator review pending

## R1: Versioned validation outcomes

1. Validation returns `passed`, `failed`, or `inconclusive`; infrastructure or drift failures never count as learner failures.
2. Every result identifies validator, validator version, mapping version, environment/template version, region, observed time, and evidence.
3. Active sessions pin validator and compatibility versions for their duration.
4. Withdrawn validator versions preserve historical events but are excluded or reinterpreted only through a new readiness projection.

## R2: Compatibility and canaries

1. A compatibility registry links lab, scenario, mapping, template, SDK/API, region, and validator versions.
2. Critical validators have known-good fixtures that must pass and known-bad fixtures that must fail for expected reasons.
3. Capability probes verify service/model/region availability, inspector permissions, template deployability, and cost policy before provisioning.
4. New sessions require fresh healthy compatibility unless an explicitly reviewed degraded policy applies.

## Exit criteria

Bedrock, IAM, sandbox lifecycle, and cleanup validators have versioned outcomes and simulator canaries. Deployed completion additionally requires scheduled live canaries, stale-health blocking, alerting, and operator response exercises.
