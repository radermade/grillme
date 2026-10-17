# Phase 11 Tasks

Status: implementation complete; manual accessibility and visual review pending

- [x] Inventory existing UI states and accessibility behavior.
- [x] Approve original dark/light visual direction and semantic token vocabulary.
- [x] Implement typed theme tokens in `packages/ui`.
- [x] Build the minimum workspace primitives and theme selector.
- [x] Migrate navigation, lessons, grill, scenarios, labs, readiness, mock, and settings through the shared token system.
- [ ] Add visual regression fixtures for loading, empty, success, degraded, conflict, expired, and failure states.
- [ ] Verify desktop/web responsive behavior and text scaling manually.
- [ ] Run manual keyboard, VoiceOver/NVDA, zoom, reduced-motion, contrast, and forced-colors review.
- [x] Record unresolved accessibility and visual-consistency risks before Phase 12 UI work.

## Verification

- `getDiagnostics`: no issues in changed theme, machine, and UI files.
- `npm run typecheck`: passed.
- `npm test`: passed, including OpenAPI checks and all existing suites.
- `npm run web:build`: passed.
- `npm run desktop:build`: passed.
- `cargo check` in `src-tauri`: passed.
- `npm run tauri:build`: passed.
- Raw-color audit: raw values are confined to `packages/ui/src/tokens.css`.

## Open review risks

- Automated checks do not establish accessibility compliance; keyboard, screen-reader, zoom, contrast, reduced-motion, and forced-color behavior still require manual review.
- Responsive desktop/web composition and persisted `system` theme transitions need visual smoke testing.
- Visual regression fixtures remain deferred until a catalog/screenshot harness is selected.
