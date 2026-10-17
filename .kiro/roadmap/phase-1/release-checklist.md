# Phase 1 Release Checklist

## Current local artifacts

- macOS app: `src-tauri/target/release/bundle/macos/Grill Me.app`
- macOS DMG: `src-tauri/target/release/bundle/dmg/Grill Me_0.1.0_x64.dmg`
- Release binary: `src-tauri/target/release/grillme`

The app launches locally, its plist is valid, and the DMG checksum verifies. These artifacts are unsigned and must not be distributed to customers.

## Signing and distribution

- [ ] Install a valid Apple Developer ID Application certificate in the build keychain.
- [ ] Configure Apple signing identity and hardened runtime.
- [ ] Configure notarization credentials outside the repository.
- [ ] Build, sign, notarize, staple, and verify the macOS app and DMG with `npm run tauri:bundle:macos`.
- [ ] Build Windows artifacts on a Windows runner with `npm run tauri:bundle:windows`.
- [ ] Configure an organization-owned Windows code-signing certificate outside the repository.
- [ ] Sign and verify Windows installers.
- [ ] Store signing keys only in protected CI secret storage.
- [ ] Add staged release, rollback, and update-signing procedures before customer distribution.

## Manual accessibility review

- [ ] Complete every action using keyboard only.
- [ ] Verify logical focus order and visible focus at 100%, 200%, and 400% zoom.
- [ ] Verify lesson changes move focus to the new lesson heading region.
- [ ] Verify loading, saving, degraded, and error messages are announced.
- [ ] Test with VoiceOver on macOS and Narrator on Windows.
- [ ] Verify content remains usable with reduced motion and increased contrast.
- [ ] Verify diagrams have meaningful textual descriptions and do not depend on visual order alone.
- [ ] Record issues and remediation; do not claim compliance from automated checks alone.