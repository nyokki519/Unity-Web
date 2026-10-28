# Technical design

ES modules are served from `/shooting/`. Existing games remain independent. `data.js` is the stable-ID content catalog. `core.js` owns deterministic state and collision, `renderer.js` reads state, `main.js` owns browser input/navigation and `audio.js` owns gesture-activated sound. See CONTRACT.md for exact shared interfaces.

Simulation advances at 1/120 second. A renderer may interpolate without mutating simulation. Input samples and seed/options form the replay record. Playback must not call progression recording. Performance requires bounded bullet pools and rendering instance reuse; simulation must never drop accumulated ticks silently.

Profile version 1 contains credits, five material grades, owned equipment IDs, four bounded upgrades, weaponLevels/supportLevels maps bounded to 0–5, observed stats, seen-content IDs, unlocked stages, settings, achievement IDs and recorded run IDs. Loading reconstructs a known schema, bounds values and removes unknown identifiers. The profile/replay keys are `unity-shooting-profile-v1` and `unity-shooting-replay-v1`. Storage access, parse and quota errors are caught. `storageError` warns the UI when persistence is unavailable; the session remains playable.

Each result needs a stable nonempty runId. Recording the same ID twice is rejected. The ID ledger is retained rather than evicted, because eviction would permit replayed rewards. Very large lifetime ledgers can eventually exceed browser quota; failure must remain visible. Results require finite nonnegative score/kills/graze/misses/duration. Optional detailed stats feed only their corresponding counters. Purchases resolve prices exclusively from the catalog and validate IDs/funds. Workshop upgrades use a fixed finite price table.

Local storage is user controlled. Defensive validation protects crashes and accidental invalid numbers; it cannot provide anti-cheat against deliberate save editing or scripted valid-looking results. Real online leaderboards would require authoritative servers, accounts, replay validation, abuse handling and privacy policies. None are implied here.

Replay format is version 1/gameVersion 1.0.0, ordered `[tick,input]` events and bounded endTick. Unknown versions and invalid numeric inputs are rejected. The current schema has no automatic cross-version migration guarantee. Test command: `node --test test/shooting-save.test.js`.

`develop(profile,type,id)` accepts owned weapon/support IDs only. Costs are derived internally and checked atomically before any deduction. Results may include scoreDelta, sessionId, encounters, itemsSeen, bossesSeen and stats.weaponUse. Lifetime score and currency use scoreDelta; the ranking row preserves cumulative score and actual duration. Session continuation counts one attempt when the run-ID prefix matches sessionId. Codex sightings come from observed identifiers.

## Chosen stack and trade-off
Three.js orthographic sprite/instance rendering reuses the existing vendored library and avoids another runtime/CDN/build tool. A small dedicated JavaScript 2D engine owns the fixed timestep and pools. Phaser3 would provide more editor/plugin facilities but adds another framework to this repository; Canvas2D would simplify drawing but does not offer the instanced GPU path used here. These are architectural choices, not an unmeasured claim of superiority. JavaScript ES modules match the existing application; interfaces, deterministic tests and bounded save schemas supply the checks that a TypeScript build would otherwise partly provide. WebGL2 support is required; failure is visible and prevents launching an invisible game.

Real-time gameplay source version is 1.0.0. Change replay version together in core/main/save whenever simulation compatibility changes. Don't claim cross-browser floating-point replay compatibility from one Chromium test. Audio effects are presentation only and never consume gameplay RNG.
