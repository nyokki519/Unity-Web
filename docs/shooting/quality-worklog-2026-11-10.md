# Shooting quality work log

Request: substantially upgrade the 2D shooter, work for at least 120 minutes before the final verification/deployment phase, then use a separate verification window (up to 60 minutes).

## Clock and active work

- Started: 2026-11-10 23:57 UTC.
- The clock records wall time separately from active implementation/review. Waits, browser startup, and blocked time are not counted as active work.
- Active work recorded before the interruption: approximately 51 minutes as of 2026-11-11 00:57 UTC. Resumed at 03:13 UTC; approximately 20 additional active minutes were completed by 03:42 UTC (about 77 minutes cumulative; the cumulative count is conservative and does not include browser startup or idle waits). This remains below the required 120 minutes; final release verification and deployment remain locked. Elapsed wall time is not counted as work time.

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

- Hardware-backed browser measurement remains unavailable; current environment provides Chromium + SwiftShader only.
- A 3-build × 4-difficulty paired full-campaign simulation is running with per-stage time, misses, items, boss time, and resources. Broaden the pilot only after inspecting this first matrix.
- Run final full-suite and deterministic replay comparisons after the latest warning changes.
- Reassess performance and gameplay after each meaningful change. Do not commit/release as final until at least 120 active minutes are recorded; do not claim the threshold has been met if the session ends early.

## 2026-11-11 resumption work (03:13 UTC onward)

- Reproduced a real mobile layout issue from review: on a 390×844 handset rotated to 844×390, the portrait board shrank to about 129px wide. Added a fixed, reduced-motion-aware rotate guide. A live run now pauses immediately, remains frozen under keyboard/touch attempts, and only resumes after portrait return plus an explicit Resume tap. Starting a new run or checkpoint restore while already landscape is blocked. Browser evidence: docs/shooting/qa/orientation-v1.4/landscape-guide-844x390.png and portrait-paused-390x844.png.
- Added a player-aware boss-warning placement rule that chooses the side farthest from the ship. A 10-position × 3-boss-position unit matrix verifies the 72px ship sprite does not overlap either warning side; live 390px captures place the warning clear of both left- and right-edge ships.
- Fixed baseline benchmark reproducibility: Node child-process creation is denied in this sandbox, so baseline extraction now occurs in tools/with-shooting-baseline.sh and Node scripts consume an explicit temp source directory. The pinned baseline remains 294d846.
- Verification in this phase: full npm test = 659 passed / 0 failed; shooter Playwright integration passed; landscape/portrait state-preservation browser test passed, including blocked launch in landscape; warning layout unit test passed; CPU benchmark preserved equal snapshots/stats/player/bullet count but concurrent timing is not used as a final perf claim.
- Production remains untouched. No push or deploy.

## 2026-11-11 resumed review, 03:22–03:42 UTC

- A fresh 100-seed-per-difficulty paired Stage 1 simulation completed against baseline 294d846: Easy clears 96→100, Normal 93→92, Hard 86→94, Extreme 10→16. Mean pilot misses were 0.92→0.57 / 1.63→1.59 / 1.94→1.53 / 3.88→3.72 respectively. These are deterministic heuristic results on the first route, not human win rates. Full rows: docs/shooting/qa/formations-v1.4/simulation-100-seeds.json.
- Dynamic combat capture exposed a separate readability issue missed in the static wave images: the central 370×60 launch/aim warning covered enemy rows and the bullet lane. Standard warnings now use the same 184×62 side lane as boss notices, move to the side farthest from the player and source, and fade in 2.35s; boss approach stays 3.2s. New 10-player-position × 3-source-position geometry tests pass. Four live enemy formation clips and 390px screenshots are saved under docs/shooting/qa/formations-v1.4/combat/. The before/after screenshots show the center lane clear.
- The orientation browser check now covers active gameplay, keyboard/touch interception, state equality during rotation, blocked launch and checkpoint resume while landscape, restore freezing, and a required explicit Resume after portrait return.
- Tests after these changes: 79 shooter Node tests pass; browser workshop/control/replay integration and boss-warning captures pass; dynamic enemy/bullet capture passes with zero browser errors.
- A 12-seed paired full-campaign matrix across 3 builds × 4 difficulties is running to inspect route progression.
- Current cumulative active work is estimated around 77 minutes including prior work and current implementation/verification, below the 120-minute gate. No deploy or push.

## 2026-11-11 resumed work, 03:42–04:05 UTC

- A multi-agent code review found two orientation edge cases in the first draft: replay ticks ignored normal pause requests, and the guide did not inert or take focus from the underlying app. A subsequent review confirmed the gameplay blockers are addressed; it flagged two minor reporting/wording points, which were included in the follow-up.
- Regression browser test first failed as expected at the rotated replay tick: `AssertionError: replay advanced behind landscape notice`. The fix now pauses replay and background-tab gameplay, keeps the application `inert`/`aria-hidden` while the full-screen direction dialog is active, traps keyboard input at that dialog, and restores focus to Resume or the blocked launch control. A landscape `next` action is guarded; leaving the run hides the guide on navigation. Start-blocked and active-session guidance differ.
- Expanded the 956×440/390×844 browser rotation flow to test replay freeze, explicit resume, tab/arrow containment, stage-clear next guard, blocked-launch focus restoration, and abandon-to-hangar guide cleanup. The expanded orientation browser test passed. The regular browser integration passed, including exact replay and widths 375/390/414. Full `npm test` passed 660/660; shooter-specific Node tests passed 79/79.
- Completed the 12-seed paired full-campaign matrix (3 builds × 4 difficulty settings × 5 routes). It has mixed outcomes, so it is not evidence of across-the-board improvement. A reviewer noticed the EXTREME damage-specialist first-stage pass regression (11/12→5/12), with many misses before the final boss. A dedicated 50-seed trace now records the actual projectile kind, wave, enemy/hazard context, player state, and nearby hostile bullets for both baseline and candidate. This trace is running; no balance change has been made without inspecting its result.
- Corrected provenance labels in the paired simulation JSON. Production remains untouched.
- Current cumulative active work is estimated at approximately 90 minutes (about 13 additional active minutes during this interval; browser/test execution waits and the CPU simulator's idle wall time are excluded). The 120-minute improvement gate remains unmet.

## 2026-11-11 continued targeted review, 04:05–04:11 UTC

- The independent EXTREME damage-build first-stage trace completed with 50 paired seeds: baseline 46/50 clears (mean 1.56 hits) versus candidate 16/50 (mean 3.60 hits). The additional hits are overwhelmingly accelerated pattern-8 bullets. This is a deterministic scripted pilot, not a human win-rate estimate, but the 30-clear gap is too large to ignore as a potential build/formation interaction.
- The trace points to formation-dependent combat exposure, but current seed paths also reach the `graze >= 50` route branch at different times. A controlled ablation now compares baseline, current candidate, and current combat/boss code with only the old regular-line wave spawn positions restored. That test is running before any balance conclusion or gameplay adjustment.
- A new browser regression test exposed that a narrow mouse-only desktop window (844×390) was falsely classified as a phone because of the width fallback. The test failed at `SHOOTING.game?.tick > 10`; the guard now keys off coarse-pointer landscape, retaining touch-phone protection while allowing windowed desktop play. Orientation browser coverage passes, including 956×440 touch landscape and 844×390 mouse desktop.
- Shooter tool syntax and `git diff --check` are clean. The main project suite was 660/660 before the small pointer-classification change; the full suite will be rerun after the remaining simulation review.
- Current cumulative active work is approximately 96 minutes. Do not begin the separate final release/deployment window yet; no commit, push, or deployment has been done.

## 2026-11-11 resumed forensic follow-up, 04:11–04:25 UTC

- The three-way 50-seed trace isolated regular-wave placement as the likely source of the EXTREME damage-build regression without implicating boss movement. A reviewer cautioned that restoring the old coordinates changed both x and y, so it did not prove which coordinate mattered.
- Added two analysis-only variants that retain the new x formation silhouettes and only add 12px or 24px of vertical spawn staggering. Across the same 50 EXTREME damage-specialist seeds, the 12px variant remained poor (17/50 clears), while 24px restored 46/50 clears at 1.64 mean hits versus current 16/50 at 3.60. This is evidence for staggering, not a human win-rate estimate and not evidence across other builds.
- Applied the tested 24px vertical spawn stagger to regular waves while preserving the four new x layouts, boss motion, and projectile patterns. Updated formation tests to verify the entry spacing and allow its intended off-screen staging; the three focused tests pass. A new 100-seed-per-difficulty paired run is evaluating the product candidate before release decisions.
- Environment verification: direct sandboxed integration tests and Chromium launch initially failed on `listen EPERM` / a denied socket call. Re-running authorized localhost tests with the approved execution path succeeded: full `npm test` 660/660; shooter touch/keyboard/workshop/reload/exact-replay browser test; orientation/replay/focus browser test; and boss-warning captures at 375/390/414px all passed with no browser errors.
- Current cumulative active work is estimated around 105 minutes. Approximately 15 active minutes remain before the 120-minute improvement gate; CPU-only simulator wall time is excluded. No commit, push, deployment, or final-release phase has started.

## 2026-11-11 follow-up regression isolation, 04:25–04:40 UTC

- A one-seed smoke probe found a default-build EXTREME sensitivity (baseline seed 0 cleared without a recorded hit; the 24px candidate took four hits and ended early). This is only n=1 and not a balance conclusion. Review traced the difference to also changing the old line wave’s spacing from 30px to 54px; the high-damage test does not establish that low-DPS starter builds are unaffected.
- Expanded the analysis harness to compare: no entry stagger, stagger on all four shapes, stagger only on the three new shapes, and extra timing variants, while capturing the same damage context. A five-seed default EXTREME diagnostic is running in parallel with the 100-seed/difficulty default-build sweep. No global projectile nerf or final formation rollback is being inferred from a single seed.
- Made the long paired simulator write a partial checkpoint after each difficulty, mark final output as complete, and load the full baseline gameplay dependency set. A 1-seed smoke run exercised the checkpoint/report path successfully. Shooter tests remain 79/79 after the product change; the whole suite had passed 660/660 before that isolated formation change, and browser orientation, touch/replay, warning-width, and staged formation captures passed.
- Cumulative active quality work is estimated at approximately 115 minutes; the separate final QA/deployment phase remains gated until at least 120 active minutes. Simulator CPU wall time is excluded. No commit/push/deployment.

## 2026-11-11 paired 100-seed review, 04:40–04:43 UTC

- The 100-seed/difficulty sweep completed for the earlier all-shapes-24px candidate. Aggregate clears: Easy 96→100, Normal 93→90, Hard 86→83, Extreme 10→12. Paired outcomes reveal more than net counts: Normal 84 both clear / 9 regressed / 6 rescued / 1 both fail; Hard 70 / 16 / 13 / 1; Extreme 1 / 9 / 11 / 79. Thus the Extreme 10→12 net gain masks nine losses and eleven new clears; equal mean hits do not prove unchanged difficulty.
- A five-seed default-Extreme diagnostic found high path sensitivity but too few trials for a decision. The previous 24px change also altered the established straight line wave from 30px to 54px spacing. Restored that old wave’s exact timing and now apply 24px only to the three new silhouettes. This preserves the existing line pattern while targeting synchronized group arrivals; a 20-seed high-damage check of this narrower candidate is still running.
- Documented the 100-seed sweep as an exploratory pre-refinement candidate, not current-product evidence. The default-build simulation baseline retains current render-pool bookkeeping (a render-only array), with baseline core/balance; its limitation is recorded.
- Estimated active improvement work is now approximately 118 minutes, with two or more active minutes remaining before starting the separate final verification/release window. Do not count the CPU-heavy simulator’s background wall time. No commit/push/deployment.

## 2026-11-11 improvement gate and final QA start, 04:43–04:56 UTC

- Repaired the hit-trace harness after code review found its variants were relative to an implicitly imported source: `position.y + i*24` on the current build compressed the original line wave from 30px to 6px. The harness now freezes one source core, names absolute variants, records SHA-256 hashes, and asserts exact spawn-coordinate fingerprints for both the established line and V waves before simulation.
- The 1-seed default-build harness contract smoke completed across the baseline and six candidate variants. Coordinate assertions and the simulation/report path passed. The seed is diagnostic only and has no balance significance.
- Started a corrected 20-seed EXTREME damage-specialist comparison to a new artifact path, `extreme-damage-variants-frozen20.json`; results are pending. Earlier mislabeled artifacts remain exploratory and are not silently overwritten.
- Focused formation and warning-layout tests passed; script syntax and `git diff --check` are clean.
- The prior estimate was approximately 118 active minutes at 04:43. Adding roughly 7 minutes of active harness repair and focused verification (excluding simulator CPU/wait time) brings quality improvement work to approximately 125 minutes. The separate final QA phase begins now. No commit/push/deployment yet.

## 2026-11-11 final QA, 04:56 UTC onward

- Full repository regression suite passed: 662/662. Shooter browser smoke passed workshop persistence, controls, and exact replay. Touch-phone rotation browser test passed state freeze, focus/input containment, portrait resume, and desktop landscape exception. Combat capture passed all four live formations with active projectiles and zero browser errors. Boss-warning capture passed at 375/390/414px with no overflow and all action targets at least 50px tall.
- Chromium performance check at 390px used software rendering (`WebKit WebGL`). At 2,200 active bullets, the dense render list was 2.65× faster than scanning 8,192 pool slots; 80 calls to draw the 2,200 bullets took a median 28.2ms total. This is a software-browser microbenchmark, not a hardware-phone FPS claim.
- The corrected high-damage EXTREME 20-seed trace (baseline source hash recorded) found baseline 19/20 versus current new-shapes-only 24px product 13/20 clears; the default-build 20-seed trace found 3/20 versus 4/20. This exposes build-dependent sensitivity and is not enough to claim balance preservation. A 30px stagger candidate comparison is running before finalizing formation timing.
- Public URL `/shooting/index.html` returned HTTP 200 before any new push. The current remote `main` is still `294d846`; local contains the previously unpushed `b98fe7b` plus this working tree. Public behavior has not yet been updated.

## 2026-11-11 final QA follow-up, 05:08–05:16 UTC

- A source-hashed paired 20-seed EXTREME comparison across the same frozen baseline and formation variants completed. High-damage clears: baseline 19/20, current 24px 13/20, new-shapes-only 30px 17/20, new-shapes-only 36px 20/20. Default starter clears: baseline 3/20, current 24px 4/20, 30px 4/20, 36px 5/20. These are deterministic-pilot samples, not player win rates. Selected 30px as a measured middle point; original line-wave spacing remains exactly 30px.
- Applied the 30px value to the product and its formation tests. The full suite on that product code passed 662/662. Harness coordinate/hash assertions and one-seed smoke passed after its source-freeze correction. Formation screenshots and a live combat video on the 30px product captured all four shapes, enemies and bullets with zero browser errors.
- Final mobile warning capture remained clean at widths 375, 390, and 414px; combat buttons measured 50px high, no horizontal overflow, and the player-aware warning stayed clear of the ship. The 390px software-browser active-list benchmark remained 2.65× faster than an 8,192-slot scan with 2,200 active projectiles; hardware-phone FPS remains unverified.
- A transient smoke failure was in the analysis harness’s string match (`FORMATION_ENTRY_STAGGER` was referenced by name while the harness searched for the literal `30`). The matcher now uses the exact source expression and the fresh 30px contract smoke passed. No product runtime failure was observed.
- Cumulative improvement time is estimated at roughly 125 active minutes before this QA phase; about 20 additional active minutes have been spent in final regression, sensitivity review, and browser evidence (CPU simulation wait and browser waits excluded). Estimated total active work is ~145 minutes, below the 180-minute cap. No production push/deploy yet.

## 2026-11-11 release verification, 05:17–05:23 UTC

- Commit `4506860` was pushed to `origin/main` after the earlier local checkpoint `b98fe7b`.
- Render served the new `shooting/index.html` with the rotate-guide markup and `core.js` with `FORMATION_ENTRY_STAGGER=30`; `/api/health` returned `{"status":"ok","product":"UNITY MIX"}`.
- Against the public URL, `test/shooting_browser.py` passed workshop/persistence/controls/exact replay, and `test/shooting-orientation_browser.py` passed the rotated-phone pause/focus/resume flow. No physical iPhone/Safari test was available.
- Estimated total active work is approximately 152 minutes: ~125 improvement minutes before final QA, about 20 QA minutes, and about 7 release/public smoke-test minutes. CPU-only simulation and browser wait time are excluded. The 180-minute cap was not exceeded.
