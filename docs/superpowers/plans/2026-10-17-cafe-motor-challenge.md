# Cafe Motor Challenge Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; one fresh final reviewer.

**Goal:** Independent Japanese 3D pachinko with real rotating mechanisms and resource pressure.
**Architecture:** Freeze SI-4, add SI-5 mechanisms and recorded tilt; retain existing simulation/render interfaces and mount lifecycle.
**Tech Stack:** Existing Three.js, Rapier, Node tests, Playwright; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-17-cafe-motor-challenge-design.md

## Global Constraints
100balls,1000virtual points,10/shot,5000/jackpot. 240Hz,11mm,5.5g. No copied author code/assets, no hidden steering, no real money. Preserve multiplayer/CPU and old replays. No further design approvals per user.

## Review Focus
- Rejected launches must neither spend points nor consume input RNG.
- Tilt during lock/pause/end must not create unrecorded divergent state.
- Motors must share collision/render pose and not pinch balls against pins.
- Hold/auto/tilt must stop on blur/unmount; keyboard form controls stay usable.
- Short portrait/landscape controls and DPR3 camera bounds must fit.

### Task 1: Reference evidence and SI-5 mechanisms
- [ ] Record rights, direct browser observations, reproducible same-condition baseline without copying source into app.
- [ ] Add failing tests for motor collision/pose, tilt lock/replay and frozen SI-4.
- [ ] Freeze SI-4 modules with corrected relative imports; implement rotor-mechanism.js and SI-5 physics, save/replay routing.
- [ ] Run targeted tests, compare motor running/stopped trajectories and seed stalls. Commit passing physical unit.

### Task 2: Japanese challenge controls and presentation
- [ ] Add pure point-ledger and firing-policy tests, including rejection and pause.
- [ ] Implement challenge-controls.js; connect existing frame/input/lifecycle, slow-motion and Japanese visible labels/decoration.
- [ ] Browser-check single/auto/random fire, tilt lock/release, pause/blur, points and gameover/retry at375/390/414 plus short/landscape.
- [ ] Capture original screenshots and natural-motion clip; keep reference images outside public deliverables. Commit.

### Task 3: Comparison and completion
- [ ] Execute full existing Node suite and browser regression; natural seeded 6/15 concurrency game tests remain covered.
- [ ] Compare normalized35/45/55 power,0.6s spacing,240Hz samples; document denominators, unfinished balls and statistical limitations.
- [ ] Fresh final review; fix important findings and rerun affected tests.
- [ ] Publish independent implementation/docs to GitHub under existing authorization; distinguish main push from Render live confirmation and iPhone testing.
