# Phase 11 Requirements

Status: implementation complete; product, visual, and manual accessibility review pending

## R1: Developer visual system

1. Desktop and web use a dark-first developer workspace with an optional light theme.
2. Color, typography, spacing, elevation, status, focus, and motion are represented as portable design tokens.
3. Color is never the only carrier of status or correctness.
4. Keyboard order, visible focus, text scaling, reduced motion, contrast, and forced colors are designed with each primitive.
5. The visual direction may take inspiration from developer-learning products but must not copy protected layouts or brand assets.

## R2: Workspace primitives

1. Reusable primitives cover navigation, command bars, resource tables, split panes, inspector panels, logs, status badges, dialogs, and guided overlays.
2. Primitives remain presentation-only and consume machine state through typed props.
3. Desktop and web may compose primitives differently where interaction patterns differ.

## Exit criteria

A representative lesson, grill, scenario, and lab render through the new token system in desktop and web. Automated checks pass, and manual keyboard, screen-reader, zoom, contrast, reduced-motion, and forced-colors review has no unresolved critical issue.
