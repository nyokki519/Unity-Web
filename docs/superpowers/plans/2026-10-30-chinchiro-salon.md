# Chinchiro salon implementation plan

**Goal:** Give the existing real-physics two-player Chinchiro a coherent brass/silver salon presentation.
**Architecture:** Keep game.js and dice-physics.js unchanged. A presentation-only module renders current Match data into new DOM; original CSS/SVG assets enhance the table. DiceTray render-only work is independent.
**Spec:** docs/chinchiro/salon/REVIEW.md
**Constraints:** Preserve all IDs and action labels used by existing tests; no hidden outcome changes; initial sound OFF; all other games unchanged. User authorized autonomous implementation and production.

- [x] Capture and inspect baseline at390/1440 and live throw.
- [x] Add tests for status, history, comparison and coin denomination composition before implementation.
- [x] Implement presentation module, original coin assets, shell and responsive styling.
- [x] Improve reflective materials and idle die meshes without touching physics.
- [x] Browser checks:375/390/414/1440; complete match; sound, reduce, pause, reset dialogs; coin preview, outcomes, limits, no overflow and usable fixed action.
- [x] Run full Node suite, existing physical/audio/browser checks, record real play and frame timings.
- [x] Review diff and isolate important fixes.
- [ ] Deploy main after green, compare production assets and smoke actual public game.

Review focus: narrow-height mobile action; native dialogs above sticky action; CPU scheduling while collapsed panels; stale outcome effects on reset; no fabricated result in idle preview.
