# Retro Cabinet Lamps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to carry out this plan. Work in small TDD steps and preserve unrelated working files.

**Goal:** Give 喫茶Unityレトロ台 the original dark green/brass premium cabinet exterior and clear event-synchronized lamps without changing the central playfield, gameplay, physics, controls, or design values.

**Architecture:** Keep all new art in the Three.js `machineG` presentation layer. `cabinet-lamp-state.js` owns deterministic color/chase/priority state, `scene.js` creates decorative outer meshes, and `fx.js` renders them from existing physical events. Maintain the existing `boardG`, camera framing, game configuration, and control DOM.

**Tech Stack:** Existing browser JavaScript ES modules, Three.js already vendored, Node test runner, existing Chromium/Playwright test setup.

---

### Task 1: Baseline and isolate the visual state

**Files:** QA evidence under `docs/qa/retro-cabinet-lamps/`; `docs/retro-cabinet-lamps-worklog.md`.

- Capture unmodified 375/390/414 portrait screenshots at the same idle and event states.
- Record existing `CFG`, `boardG` dimensions, camera framing, screen bounds, renderer calls, and FPS as baseline.
- Keep a time ledger separating implementation and QA, and never count wait or agent time.

### Task 2: Deterministic exterior lamp state (TDD)

**Files:** `public/silver-ring/src/cabinet-lamp-state.js`; `test/silver-cabinet-lamp-state.test.js`.

- First test idle palette, bounded channels, reduced-motion stability, stage chase order, event priority, and jackpot return to idle.
- Run tests and observe the expected RED failures.
- Implement a pure time/state sampler; it must not read RNG, physics configuration, or mutate game state.
- Rerun tests and capture GREEN output.

### Task 3: Deep green/brass cabinet shell (presentation-only)

**Files:** `public/silver-ring/src/scene.js`; `test/silver-cabinet-shell-contract.test.js`.

- Replace the burgundy box shell with deep green enamel, restrained brass rails, and subtle exterior medallions.
- Add precision bevel/trim details, symmetrical coffee medallions, and outer side lamp housings without moving/covering `boardG`, side placard content, operation controls, or the handle.
- Test the presence of exterior materials/segments and the no-change contract for game constants and central board group dimensions.
- Verify screenshot comparison before continuing to choreography.

### Task 4: Event-synchronized lamp choreography

**Files:** `public/silver-ring/src/cabinet-lamp-state.js`, `public/silver-ring/src/fx.js`, `public/silver-ring/src/main.js`, `test/silver-cabinet-lamp-state.test.js`, `test/silver_cabinet_lamps_browser.py`.

- Route existing gate, bowl-enter, successful breakthrough, miss, and jackpot events to cosmetic pulse state.
- Render warm idle, emerald traversal, amber miss, champagne success, stage progression, and short jackpot crescendo. Both side rails and marquee bulbs share the event color/path. Clear transient pulses on pause and game over.
- Respect reduced motion and visibility/pause lifecycle.
- Assert lamp code never writes to `Sim`, `CFG`, coin ledger, or camera state.

### Task 5: Visual/performance refinement and final QA

**Files:** `docs/qa/retro-cabinet-lamps/`; `docs/retro-cabinet-lamps-worklog.md`.

- Repeat matching idle, single-shot, each bowl stage, jackpot, and reduced-motion captures at 375/390/414px.
- Compare external pixels and central playfield bounds to the baseline; inspect contrast, clipped labels, lighting bloom, and button reachability.
- Measure renderer calls and frame timing before/after with equivalent device/browser settings.
- Run focused silver tests, browser flows, full repository suite, `git diff --check`, then publish only after the separate QA phase and report deployment evidence.

## Review Focus

- Confirm every changed mesh belongs to the presentation-only cabinet layer and changes no collision/geometry source.
- Check event pulse teardown on pause, document visibility, replay, restart, and game-over.
- Check reduced-motion behavior, light intensity / bloom preventing hidden pins, and increased mesh/material counts on mobile.
- Verify 375×667 short-screen controls and landscape/free-camera framing still function.
