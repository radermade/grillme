# Phase 2 Design

Status: engineering implementation complete; manual validation pending  
Last reviewed: 2026-10-16

## Content boundary

A versioned `Assessment` manifest contains skills and discriminated activity definitions. Phase 2 supports single choice, multiple choice, ordering, and short structured response. Correct answers are bundled for provisional offline grading; the UI never presents them before submission. Server-authoritative grading is deferred to synchronization.

Multiple-choice grading is all-or-nothing to avoid ambiguous partial-credit policy. Ordering requires an exact order. Structured responses use explicit required concept terms and are labeled deterministic rather than semantic AI evaluation.

## Assessment machine

States: `loading -> introduction -> answering -> saving -> reviewing -> answering | submitting -> graded`, plus `degraded`, `failed`, and `abandoned`.

The machine receives storage, clock, and ID ports. Each submitted response is persisted before rationale is shown. Final submission derives skill gaps and a review schedule from response evidence.

## Review machine

States: `loading -> selection -> prompting -> revealing -> selfAssessment -> rescheduling -> selection | complete`, plus `degraded` and `failed`.

The queue uses UTC timestamps and fixed spacing rules. A successful review means confidence 4-5 after retrieval; two successful reviews remove the item. Confidence changes scheduling but never changes assessment correctness.

## Application composition

A small XState workspace machine selects course, assessment, or review mode. React views render machine state and send typed events. Assessment and review machines remain portable and import no React, DOM, or Tauri APIs.