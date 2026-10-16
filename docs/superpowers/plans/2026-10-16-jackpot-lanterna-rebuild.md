# Lanterna-inspired Jackpot Rebuild Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans; implement inline, then fresh whole-branch review.

**Goal:** Build a playable, readable pachinko with designed pin routes and three genuine physical dishes.
**Architecture:** Preserve fixed-step Rapier and simulation/render interfaces; freeze SI-3 replay, introduce SI-4 geometry, split scene decoration and compact play layout.
**Tech Stack:** Existing Three.js, Rapier, ES modules, Node test, Playwright.
**Spec:** docs/superpowers/specs/2026-10-16-jackpot-lanterna-rebuild-design.md

## Global Constraints
No multiplayer/CPU changes, no new paid services, no external assets/code copied. 100 balls, three difficulties, sound OFF, reduced motion, old replay versions preserved. Normal play uses physical contacts; no invisible attraction or forced win. User approved design and waived further design/plan confirmations.

## Review Focus
- Repeated taps/hold release and backgrounding must not continue unwanted launches.
- At least 375/390/414px canvas and controls must not overlap.
- Edited tuning and old replay versions must not silently change geometry.
- Intermediate transfer balls must keep identity and not steal tray focus.
- Pin support lanes must not create permanent cradles between pegs.

### Task 1: Freeze SI-3 and rebuild physical routes
Files: si-v3/{si-config,si-geometry,si-engine,si-renderer}.js, si-config.js, board-routes.js, replay.js, renderer.js, storage.js, test/abyss-rebuild.test.js.
Interfaces: createBoard(difficulty,overrides) returns current board with layout metadata; simulation public interface unchanged.
- [x] Write tests for purposeful route groups, actual physical support gaps, versioned SI-3 replay, long-enough lateral paths.
- [x] Run new tests and observe expected failures.
- [x] Freeze old files, implement SI-4 board routes; honor pin tuning and preserve contact geometry.
- [x] Run targeted physics/replay tests and baseline comparison. Commit passing unit.

### Task 2: Dish profiles and continuous chutes
Files: tray-layout.js, si-geometry.js, si-config.js, si-engine.js, test/abyss-rebuild.test.js.
Interfaces: createTrays(board,overrides) populates board.trays and parts; bowlHeight(t,x,z) shared with physics and render.
- [x] Test comparable success/loss apertures, genuine falling, orbital motion, all-stage transfer identity and ledger.
- [x] Observe expected failures, implement profile/holes/visible descending routes.
- [x] Run seeded natural flow and stalls, fix geometry from contact evidence, no trajectory steering. Commit.

### Task 3: Cabinet and play layout
Files: cabinet.js, si-renderer.js, play-layout.js, screen.js, abyss.css, presentation.js.
Interfaces: cabinet builds independent visual resources with dispose; play layout relocates existing accessible controls, retains analysis/settings.
- [x] Write browser checks for play area vs dock bounds, settings toggle, pause/background, reduced/manual cameras.
- [x] Observe pre-change layout failure, add cabinet/material/labels and compact play layout.
- [x] Check three mobile widths, capture actual WebGL and natural-motion recording; commit.

### Task 4: Integration, validation and review
Files: frozen replay routing, sw.js, docs/qa/jackpot-rebuild/, README.md.
- [x] Run all existing tests, 180-shot stalls and 500-shot natural flow; compare to SI-3 baseline.
- [x] Run browser synchronization/bonus/worker checks appropriate to changed modules; verify old replays and cache modules.
- [x] Review whole diff using fresh reviewer, address material findings and rerun affected checks.
- [x] Commit reviewable implementation, report screenshots, launch and limits. Publish only verified changes within existing authorization.
