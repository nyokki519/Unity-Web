# Retro stage presentation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the user's accepted proposals1–4: clear winning-hole view, material hierarchy, mechanical construction details, synchronized final-stage sound.
**Architecture:** Preserve simulation geometry and outcomes. Adjust the camera, separate render-only structural details, and mix existing contact events through bounded short voices.
**Tech Stack:** Existing Three.js / WebAudio / Node tests / Playwright.
**Spec:** User approval in chat of the first proposals1–4; no new aiming statistics or additional proposals.

## Global constraints
- Existing physics.js/config.js, winning paths, economy and recorded stage clips remain unchanged.
- Keep current rainbow flow and dark final sleeve.
- Preserve social games, chinchiro and hidden mechanical game.
- Do not reintroduce prolonged hiss or camera shake.

## Review focus
- Camera must clear transfer rails without deleting support for moving balls.
- New decorative fasteners must stay away from playable ball space.
- Contact voices must be muted, bounded and driven only by actual events.
- Reduced motion and free camera controls must remain usable.
- iPhone-sized screenshots and actual RAF playback are required; no actual iPhone claim.

###1. Clear camera view
- [x] Add final-stage camera preset and its test, keeping stages1/2 unchanged.
- [x] Browser raycast winning-hole sightlines against actual transfer rails; tune final preset only.

###2. Material and construction
- [x] Add `stage-structure.js` for structural materials, formed acrylic rim and bolted supports.
- [x] Integrate silver transfer rails, dark supports and restrained brass entry rims in scene.js.
- [x] Confirm dimensions stay outside simulated trajectories; compare screenshots.

###3. Contact sound and ambient focus
- [x] Add `stage-sound.js` with bounded force-to-voice parameters and focus levels, test first.
- [x] Store ambient gain and duck it for a live third-stage ball.
- [x] Use actual rattle/clack/air events for short differentiated sounds; preserve recordings.
- [x] Browser verify actual PCM, mute and focus return without permanent sound.

###4. Release
- [x] Run all Node tests and375/390/414 browser checks.
- [x] Record geometry/physics protection, screenshots, sound and limitations.
- [x] Commit/push under existing production authorization and verify served assets and browser behavior.

Execution ledger: all four tasks implemented. Reviewer Important floating supports fixed with connected posts/rear carrier; connectivity test RED→GREEN. Final276 tests pass and four browser widths pass. Protected physics/config and other games have no changes. Final release verification follows.
