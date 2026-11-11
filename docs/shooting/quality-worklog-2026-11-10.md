# Shooting quality work log

Request: substantially upgrade the 2D shooter, work for at least 120 minutes before the final verification/deployment phase, then use a separate verification window (up to 60 minutes).

## Clock and active work

- Started: 2026-11-10 23:57 UTC.
- The clock records wall time separately from active implementation/review. Waits, browser startup, and blocked time are not counted as active work.
- Active work recorded so far: approximately 51 minutes as of 2026-11-11 00:57 UTC. This is below the required 120 minutes; final release verification and deployment remain locked. Elapsed wall time is not counted as work time.

## Baseline review

- The production page returned HTTP 200 and its `main.js` SHA-256 matched the checked-out source.
- Existing campaign/balance design is already substantial: 20 projectile patterns, 12 enemy types, staged bosses with destructible parts, 120 Hz fixed-step logic, seeded replay, and late-upgrade damage budgets.
- The archived SwiftShader measurements are old and software-GPU-specific. They showed roughly 13.5–29 FPS and do not establish phone performance.
- The simulation uses an 8,192-slot bullet pool and the renderer visited all slots every frame, even when most were empty. A dense active-index array is used only by rendering; simulation and clear order retain the original ascending capacity scan so deterministic gameplay and free-slot reuse stay unchanged.
- Existing mobile checks cover 375/390/414 px and touch input. The latest browser integration and max-build-art browser checks pass; physical iPhone Safari remains untested.

## Work performed

- 2026-11-11 00:02–00:10 UTC: Tried a bitset iterator across simulation/render hot paths. Correctness tests passed, but a 2200-bullet 480-tick CPU comparison measured median 66.97ms vs 63.91ms baseline (about 5% slower); that implementation was removed.
- 2026-11-11 00:10–00:17 UTC: Kept a dense active-index array solely for renderer bullet submission. An early seven-trial CPU run was noisy; the benchmark is now 21 paired, alternating-order trials. Current Node replay comparison retains identical snapshots, stats, player state, and bullet count (about 67.4ms baseline vs 67.2ms current median per 480 ticks with 2200 stationary hostile bullets). Chromium iteration measured 2.13x faster active-list traversal than scanning 8192 slots at 2200 active bullets; `drawBullets` submitted the 2200 bullets 80 times in 28ms total on SwiftShader. These are microbench/software-renderer measurements, not device FPS claims.
- Added four deterministic wave geometries: the existing staggered line, a symmetric V-entry, paired left/right flanks, and a curved arc. Browser screenshots exposed that the first draft's V was effectively another line; the shape definition and assertions were revised. Odd-size flank groups now place a centered rear guard rather than biasing the left.
- Added distinct, bounded horizontal/vertical movement signatures for route bosses 1–5; route 0 retains its prior motion. A parallel code review caught an interaction between boss entry movement and the new vertical pose that caused a sawtooth. The live movement now blends into the new pose after entry; new 120Hz live-state tests cover entry and full encounter smoothness.
- A 50-seed-per-difficulty scripted-pilot comparison against v1.3.0 (before the review fixes) produced Easy 47→50, Normal 47→44, Hard 42→43, Extreme 4→11 clears. A fresh 20-seed comparison after the movement/formation fixes produced Easy 20→20, Normal 18→17, Hard 17→20, Extreme 2→4. The simulator input policy is a deterministic heuristic, not a person; these results are not human win rates and expose seed sensitivity, especially at Extreme.
- A 145-second/120Hz pose test confirms each route remains in bounds and moves continuously. Browser evidence includes four 390px wave canvas screenshots, a six-route boss motion video, and 375/390/414×667/812 browser integration. A stale-checkpoint test verifies that the v1.4 update explains that old replay/checkpoint data is retired while equipment/progression remains. Physical iPhone Safari remains untested.
- A separate live boss-warning browser capture showed the original centered 370px panel covering projectiles. Boss-entry warnings now use a smaller side card opposite the boss, while ordinary route alerts retain their center treatment. This keeps the central projectile lane clear in recorded 375×667, 390×667 and 414×667 captures. The clipping caused by the 70px warning texture region was caught during visual review and corrected by keeping the side card inside that texture bounds.
- Fixed an obsolete browser assertion that expected “耐久” after the UI had changed to “体力”. The full project suite now passes 658 tests; the 77 shooter-specific unit tests also pass. Browser integration passes at widths 375/390/414 and heights 667/812, including keyboard, touch drag, manual fire, pause, exact replay, workshop persistence, controlled boss clear, next stage, stale-checkpoint notice, and denied-storage play. Max-build art/feedback browser checks also pass; physical iPhone Safari remains untested.

## Remaining before the 120-minute gate

- Repeat before/after measurements on a hardware-backed browser when available; this environment provides only Chromium + SwiftShader.
- Reassess the small post-review 20-seed comparison with additional varied pilot paths and inspect all formation/boss/warning recordings.
- Run deterministic replay comparisons, broader campaign simulations across seeds/difficulties, and mobile browser regressions after remaining changes.
- Review enemy attack readability, boss pacing, progression, audio cadence, and small-height mobile layout with current browser evidence; implement only measured issues.
- Reassess performance and gameplay after each meaningful change. Do not commit/release as final until at least 120 active minutes are recorded; do not claim the threshold has been met if the session ends early.
