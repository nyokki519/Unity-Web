# Delivery and remaining validation

The deliverable is a standalone original browser shooter integrated under `/shooting/`. Production readiness requires executable combat and menus, bounded state, no external runtime dependencies, replay/local persistence, graceful storage failure and clear Japanese explanations. Design intent alone does not establish that every mechanic passed validation.

1. Validate deterministic core with seeded runs and replay equivalence; check bullets, collision, bosses, pickups, all weapon kinds and all support effects.
2. Integrate renderer, audio and UI; verify title-to-run, pause/resume, continuation, result, purchase, upgrades, settings and local rankings. Confirm existing games still load.
3. Run save integrity tests including denied storage, duplicate results, malformed inputs, purchase bounds and replay schema. Confirm result IDs are stable for each run and never record playback rewards.
4. Browser QA at desktop and emulated mobile dimensions, including visibility pause, relative dragging, button reach, resize, reduced effects and high bullet counts. Record actual observed results separately from this plan.
5. Physical iOS/Android and lower-end GPU testing remains necessary for touch accuracy, audio unlocking, thermal load, frame pacing, memory pressure and interruption recovery. Browser emulation is not equivalent.
6. Tune all difficulties and equipment using measured combat telemetry. Review accessibility with real players, especially color distinction, motion reduction and touch target reach.

Online leaderboards, server anti-cheat, accounts, cloud sync, multiplayer, paid goods and authenticated daily competition are outside this local release. Future addition requires explicit architecture, implementation, testing and operating ownership. Do not label generated or seeded local records as real online rankings.

Follow-up integration includes data-driven evolutions, individual weapon/support development, all material-grade uses, observed codex tracking, stage score deltas, session-level attempt counting and duration-bearing time records. Save validation now includes thirteen executable tests covering these paths. Run the full core and browser suites after these interfaces are integrated; this document does not substitute for their observed output.

## v1.0.0 delivery ledger
Design, core flight/combat, item/evolution, special combat, all5 main stages+hidden content, local progression, visuals/audio, UI, automated QA and publication preparation implemented. Full-campaign pilot/replay equality passed four15-minute sessions. Review defects (charge velocity, terminal part reward, fractional time ranking, score-support development) were reproduced with failing tests and fixed with passing tests. Additional fixes cover piercing repeated damage, relative player collision, exact item-currency reward, end-of-stage supply collection and touch offset stability.

Do not equate delivered code with every target achieved: 60FPS is unmet on the software GPU; physical devices and human preference/gamefeel assessment remain. New external services, online rankings and cloud save synchronization are not implemented or implied.
