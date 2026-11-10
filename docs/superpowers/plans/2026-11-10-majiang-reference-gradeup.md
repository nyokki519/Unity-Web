# Kobalab Mahjong Quality Upgrade Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Improve Unity MIX Mahjong with Kobalab's licensed tile art, action sounds, and deeper CPU discard decisions while retaining Unity MIX game rules and room privacy.

**Architecture:** Vendor only the upstream tile/audio media and MIT notices. Pin Kobalab AI/Core, bundle the CommonJS AI for browser use, adapt public Unity match state into its discard evaluator, and accept only an action already authorized by Unity MIX. Keep the existing rules, settlement, online protocol, and UI layout authoritative.

**Tech Stack:** Node.js ESM, `@kobalab/majiang-ai` 1.2.0, its `@kobalab/majiang-core` 1.3.x dependency, esbuild, browser modules, HTMLAudio.

**Spec:** `docs/superpowers/specs/2026-11-10-majiang-kobalab-gradeup-design.md`

## Global Constraints

- Keep online legality, scoring, privacy views, and room protocol in Unity MIX.
- Never expose hidden hands, wall order, or unrevealed indicators to CPU evaluation.
- Every upstream asset and bundled code copy includes its MIT copyright and license notice.
- A Kobalab recommendation is used only if it maps to an exact current legal action; otherwise use the existing CPU policy.
- Keep audio gesture-gated and serve all required media locally for offline play.

## Review Focus

- Red five / normal five and honor tile IDs: verify correct reference image mapping.
- Open melds and riichi: verify adapter hand strings preserve group and ready state.
- Hidden wall order changes: verify CPU decision is invariant when only hidden order changes.
- Unsupported browser audio: verify the existing silent fallback and no unhandled rejection.
- Missing or stale browser bundle: verify a clear build check catches it before deploy.

---

### Task 1: Vendor licensed media and replace tile rendering

**Files:** `public/mahjong/src/tile-art.js`, `public/mahjong/src/app.js`, `public/mahjong/style.css`, `public/mahjong/assets/kobalab/tiles/*`, `public/mahjong/assets/kobalab/NOTICE.txt`, `test/mahjong-tile-art.test.js`, `test/mahjong-ui.test.js`, `public/sw.js`, `public/js/app.js`.

- [ ] Test all 34 face IDs, three red-five IDs, tile back, Japanese accessible labels, and local-only URLs.
- [ ] Copy only `m0`–`m9`, `p0`–`p9`, `s0`–`s9`, `z1`–`z7`, and `pai.gif` from the MIT upstream distribution; record source and copyright.
- [ ] Render those files as responsive `<img>` elements without changing labels or table geometry; use the actual back in opponent tile silhouettes.
- [ ] Add assets to the offline cache and bump both service-worker cache identifiers.
- [ ] Run focused tile/UI and offline-shell tests.

### Task 2: Use reference action sounds

**Files:** `public/mahjong/src/sound.js`, `public/mahjong/src/app.js`, `public/mahjong/assets/kobalab/audio/*`, `test/mahjong-audio.test.js`, `test/mahjong-ui.test.js`, `public/sw.js`.

- [ ] Test gesture gating, cue-to-file mapping, overlap budget, disabled state, and unsupported audio.
- [ ] Vendor the licensed discard, chi, pon, kan, ron, tsumo, riichi, gong, and beep WAV cues with notice.
- [ ] Play local cues via `Audio` after the explicit enable gesture; preserve silent operation when audio is unavailable.
- [ ] Select specific call/win cues from actual transition data and cache audio offline.
- [ ] Run focused audio/UI tests.

### Task 3: Integrate Kobalab CPU discard evaluation safely

**Files:** `package.json`, `package-lock.json`, `tools/build-mahjong-ai.mjs`, `public/mahjong/vendor/majiang-ai.bundle.js`, `public/mahjong/index.html`, `src/mahjong/ai.js`, `public/sw.js`, `test/mahjong-ai.test.js`, `test/mahjong-reference-ai.test.js`.

- [ ] Test reference output maps only to legal Unity discard/riichi actions; test public-only counts and fallback.
- [ ] Pin MIT `@kobalab/majiang-ai@1.2.0` and compatible Core; add an esbuild script and import map for offline browser loading.
- [ ] Build a browser ESM bundle from the pinned CommonJS package and fail verification if absent.
- [ ] Build the reference AI state from the acting hand, melds, visible rivers, revealed dora and riichi only; never read hidden hands or wall order.
- [ ] Normalize tile/meld notation and map a recommended type to one exact legal Unity action; on exceptions/mismatch use the existing policy.
- [ ] Run a seeded CPU match, full test suite, and benchmark adapter decision latency.

### Task 4: Document and verify

**Files:** `docs/mahjong/README.md`, `docs/mahjong/REFERENCE_REVIEW.md`, `docs/mahjong/evidence/*`.

- [ ] Update asset/code license records and accurately distinguish verified facts, adapted code, and remaining differences.
- [ ] Browser-test 375/390/414px, local media requests, CPU discard/call/win flow, offline shell, and console output.
- [ ] Run `npm test` and existing Mahjong 4-seat privacy/synchronization regressions.
- [ ] Record screenshots and performance limits; state clearly if physical iPhone audio was not tested.
