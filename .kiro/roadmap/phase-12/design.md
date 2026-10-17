# Phase 12 Design

The simulator teaches durable intent and AWS-console familiarity as separate layers. A learning invariant describes the capability; an AWS mapping describes the current service/resource representation; a presentation mapping describes current labels and navigation.

Example semantic targets include `service-search`, `bedrock-model-access`, and `guardrail-policy`. A renderer maps them to console-like tables, forms, breadcrumbs, status banners, and resource details. Validators inspect the semantic resource graph rather than click history.

The simulator provider implements the same typed operation boundary later used by managed sandbox and real-console companion modes. It returns deterministic resource state and sanitized errors. Authoritative validator definitions remain outside learner-delivered content.

The simulator is intentionally AWS-familiar, not a pixel-perfect clone. Current screenshots or reviewed label maps can supplement it without becoming the source of truth.
