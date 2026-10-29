# Baccarat faithful implementation plan

> Execute inline with executing-plans; fresh review after integration.

**Goal:** Reproduce the observed source game, except authorized Unity card designs.
**Architecture:** Source Phaser renderer/assets + independent existing Session, local transactional storage and explicit cosmetic timeline.
**Tech:** JS modules, Phaser CE2.8.0, native WebAudio, local PNG/WOFF2/MP3, Playwright.
**Spec:** ../specs/2026-10-29-baccarat-faithful-design.md

Protect all other games and existing save formats. No remote source account/payment/tracking code. Review focus: old save with larger minimum, rapid confirm/rebet, interrupted third card, saved-result reopening, offline asset/error fallback.

- [x] Capture source desktop/mobile, all required round phases, input states, samples and timing. Save original hashes and user authorization; no credentials.
- [x] Add failing Node tests for classic table1-chip bet,95% banker profit, per-area caps, timeline order and interrupted/duplicate settlement. Run red.
- [x] Implement classic controller/config/timeline, add source asset map and local licensed renderer/font. Keep financial algorithms unchanged. Run green/full suite.
- [x] Implement actual table/title/controls/dialogs/card rendering. Browser fails first for old default. Compare real identical-state images and fix P0/P1/P2 drift.
- [x] Verify third/tie/banker/loss, touch/keyboard, min/max/clear/rebet, save/reload/hidden and audio; regression other games and retained VESPER page.
- [x] Fresh review, actual video and measured performance, final design-qa.md, report residual differences. Existing release authorization permits main/Render only after checks.

Evidence: docs/baccarat/faithful/README.md and root design-qa.md. Fresh review found two P2 recovery issues; both reproduced failing then fixed and verified. Required browser, financial, regression and image/video checks are recorded. Native iPhone and hardware FPS remain unverified.
