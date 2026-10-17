# Phase 16 Design

This phase joins the detection systems to content governance without merging their trust boundaries. Console crawler observations, validator canaries, learner reports, official documentation changes, and provider incidents all create evidence for one drift case.

The drift case machine owns `reported -> triaged -> investigating -> mitigating -> correcting -> reviewing -> canaryValidation -> staged -> released -> closed`, with `rejected`, `blocked`, `unpublished`, and rollback paths. High-risk changes require separate author and reviewer identities.

Internal tooling edits semantic/presentation mappings and compatibility records. Private validator code remains in server repositories and deployment pipelines. Release artifacts include previous version, affected sessions, migration or grandfathering policy, canary evidence, and rollback plan.
