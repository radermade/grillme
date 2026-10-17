# Phase 13 Requirements

Status: local controlled foundation complete; legal, security, privacy, and AWS-usage approval required before real automation

## R1: Separate drift process

1. Console drift monitoring runs as an internal service separate from learner clients and the authoritative validator path.
2. It follows only approved, allowlisted journeys in dedicated non-production AWS accounts.
3. It uses short-lived workload identity; no static AWS keys, customer accounts, or learner data are used.
4. It captures only approved visible labels, semantic landmarks, routes, screenshots, region/service context, and timestamps.
5. It does not broadly spider the console, bypass access controls, or intercept undocumented internal APIs.

## R2: Review workflow

1. Detected changes become suspected drift, never automatic content edits.
2. Human reviewers classify changes as cosmetic, navigational, semantic, service availability, or false positive.
3. Critical confirmed drift can disable new walkthrough sessions or mark guidance stale without erasing learner evidence.
4. Publishing updated mappings requires content governance and regression checks.

## Exit criteria

Approved Bedrock console journeys run on schedule, detect seeded label/navigation changes, produce bounded review artifacts, and drive a complete suspected-to-reviewed-to-versioned-mapping workflow without automatic publication.
