# Phase 11 Design

The visual direction is a dark, technical workspace with restrained charcoal and navy surfaces plus cyan, violet, lime, amber, and coral accents. It should feel like an IDE and operations console without reproducing KodeKloud or AWS trade dress.

Tokens live with portable UI, not in app-specific copies. Semantic tokens such as `surface-workspace`, `status-running`, and `focus-ring` sit above raw colors. Themes map semantic tokens to dark, light, high-contrast, and forced-color behavior.

The first component set is intentionally small: application rail, activity navigation, panel, resource table, field, code/log surface, status badge, progress/timer, dialog, and coach callout. Existing UI migrates incrementally; business rules remain in XState machines.

A component catalog is useful, but adding a heavy catalog dependency is a separate implementation decision. Screenshot review complements rather than replaces assistive-technology testing.
