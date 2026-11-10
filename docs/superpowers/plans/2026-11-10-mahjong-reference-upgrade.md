# Mahjong Reference Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Unity MIX Mahjong more legible on phones and give CPU opponents stronger, explainable tile-efficiency decisions.

**Architecture:** Keep the tested server rules and legal-action engine. Add an original client-side SVG tile renderer and improve the server-side CPU policy using only public information and the acting player's concealed hand.

**Tech Stack:** Existing JavaScript ES modules, Node test runner, CSS, Playwright/Chromium for browser review.

**Spec:** `docs/superpowers/specs/2026-11-10-mahjong-reference-upgrade-design.md`

## Global Constraints

- Do not add a dependency or copy code/assets from reference repositories.
- Do not modify Mahjong rules, scoring, room protocol, or concealed-hand privacy.
- CPU actions must remain engine-generated legal action objects.
- Keep smartphone board width within 375/390/414px viewports.

## Review Focus

- Red five IDs 34–36 render as five tiles but retain their own labels.
- Honor tiles have legible, distinguishable glyphs at compact river size.
- Public-safety AI logic never reads opponent concealed hands or wall contents.
- Riichi, kan, chi/pon, and ron/tsumo remain legal-action-engine controlled.
- Narrow phone hands scroll rather than shrinking tiles below touch-safe size.

---

### Task 1: Original tile-face renderer

**Files:** Create `public/mahjong/src/tile-art.js`; modify `public/mahjong/src/app.js`, `public/mahjong/style.css`, `public/sw.js`; test `test/mahjong-ui.test.js`, create `test/mahjong-tile-art.test.js`.

- [x] Write renderer tests for all 34 types, red fives, accessible labels and dimensions.
- [x] Run the focused tests and verify the tile helper is missing.
- [x] Implement `tileLabel(tile)` and `renderTile(tile, {compact=false,back=false}={})` with inline original SVG.
- [x] Use the renderer in own hand, opponent/own rivers, melds and dora indicators; retain labels and button semantics.
- [x] Run Mahjong UI tests and capture the table at mobile widths.

### Task 2: CPU tile-efficiency and public-defense evaluation

**Files:** Modify `src/mahjong/ai.js`; test `test/mahjong-ai.test.js` and `test/mahjong-cpu-game.test.js`.

- [x] Add fixtures for same-shanten discard candidates with different visible ukeire and a public riichi genbutsu choice.
- [x] Run focused tests and confirm the current CPU misses the expected distinction.
- [x] Implement visible-copy accounting from own hand, rivers, open melds and dora; do not read hidden hands or wall.
- [x] Rank discards by shanten, ukeire, public dora retention and bounded danger; preserve seeded tie breaking and legal action objects.
- [x] Apply small character-profile weights to non-legality tie-breaks and verify same seed reproducibility.
- [x] Run focused AI and full Mahjong rule tests.

### Task 3: Verification and review

**Files:** Update `public/sw.js` cache revision, browser-check artifact under `docs/qa/`, and this plan's completion marks.

- [x] Run all Mahjong test files, `npm test` (642 passed), `git diff --check`, and cache validation. Full suite needs permission to bind loopback TCP ports.
- [x] Capture and inspect 375/390/414px browser views; confirm page width and tile scrolling.
- [x] Review diff for copied reference material and hidden-information access; document upstream license/dependency findings in `docs/mahjong/REFERENCE_REVIEW.md`.
- [x] Add regressions for hidden future kan-dora, called-river double counting, pre-riichi genbutsu, no-yaku open tenpai, malformed tile-label escaping, drawn-tile privacy, and duplicate online state effects.
- [x] Exercise four simultaneous browser clients through room setup, ready, deal, and discard synchronization; check concealed-hand privacy.
- [x] Production smoke uncovered a lobby-ready screen-routing bug; preserve `LOBBY` in the shared command receive path and add a regression test.
- [x] Run 300 seeded CPU matches (132,792 transitions, 2,038 hands); all returned legal actions, increased revisions, terminated and conserved total points.
- [x] Record exact test totals, screenshots, remaining limits and deployment state. Published to `main` as `3f697b8`; Render served the new assets and passed a 390px production CPU-turn smoke check.
