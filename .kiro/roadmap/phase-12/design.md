# Phase 12 Design

The simulator teaches durable intent and AWS-console familiarity as separate layers. A learning invariant describes the capability; an AWS mapping describes the current service/resource representation; a presentation mapping describes current labels and navigation.

Example semantic targets include `service-search`, `bedrock-model-access`, and `guardrail-policy`. A renderer maps them to console-like tables, forms, breadcrumbs, status banners, and resource details. Validators inspect the semantic resource graph rather than click history.

The simulator provider implements the same typed operation boundary later used by managed sandbox and real-console companion modes. It returns deterministic resource state and sanitized errors. Authoritative validator definitions remain outside learner-delivered content.

Exact walkthrough mode uses reviewed AWS Console captures as immutable visual scenes. It does not attempt to reproduce AWS pixels with application CSS. Accessible native controls and semantic hotspots are positioned over each image using normalized, versioned anchor rectangles. Capture assets are hash-pinned and declare viewport, source origin, region, capture/review dates, reviewer, and mapping versions.

Practice mode may use the component-rendered semantic reconstruction, but it must be labeled as reconstructed and cannot satisfy the console-fidelity gate. Challenge may use the managed-console companion when approved. Missing, stale, unapproved, hash-mismatched, or incompletely anchored captures fail closed and disable exact walkthrough selection.

The drift process invalidates affected scenes and opens review work. It can never move anchors, replace images, or publish scenes automatically. Screenshot capture and use remain subject to legal, security, privacy, and AWS-usage approval.
