# Unity MIX: Mahjong / Rating / Tier Quality Pass

- Scope: `https://unity-mix.onrender.com/` existing three games only; protect all other games and room infrastructure.
- Requested quality window: at least 120 minutes of substantive improvement; deployment verification may take up to another 60 minutes.
- Started (UTC): 2026-11-10 03:25
- Baseline commit: `67b2559` (`main`).
- Working policy: scoped parallel agents, root integration and cross-game review; preserve pre-existing untracked Mahjong design docs and `node_modules`; no outside assets without clear rights.

## Work log

| UTC | Minutes | Work | Evidence / result |
|---|---:|---|---|
| 03:25 | 0 | Baseline status and scope check | `main` clean except pre-existing untracked files; 3 scoped agents started |

## Quality gates

- Per-game functional tests and all `npm test` tests.
- Browser checks for 375/390/414px phone widths; desktop layout, live game progression, keyboard/touch controls, sync/privacy.
- Capture screenshots and note known limitations before production publication.
- Commit at meaningful checkpoints; no unrelated user files staged.

| 03:26–03:31 | 5 | Baseline mobile capture: home, Mahjong CPU table/turn, 4-player Mahjong online lobby/start, Tier event rules | Chromium 390×844; Mahjong 4-player started with `[14,13,13,13]` concealed tiles, no page errors; CPU discard/response visible. Captures saved in this folder. A stale pre-existing port-3000 process returned 404 for current Mahjong engine route; fresh current build on port 3001 serves it correctly (200), so use the fresh server for further checks. |
| 03:29–03:32 | 3 | Run regression baseline and inspect Mahjong rules / Tier view / Rating content evidence | `npm test` 590/590 passed with network-enabled local loopback; standalone rating tests 6/6 passed. Rating content audit: 11 enabled questions, 1 evidence-backed comparison. |

## Findings under active review

1. Rating answer copy directly hinted at the correct side; fixed in 67b2559 by hiding descriptive labels until result, enlarging mobile images, removing SVG watermark text, and bumping cache keys. Production delivery verified.
2. Rating source depth remains a content-quality limitation: only one question is a verified real-vs-generated image comparison; the remaining enabled illustrations are authored practice stimuli, not evidence of professional authorship, provenance, or market value.
3. Mahjong's documented rules omit some rare/edge cases (nagashi mangan adjudication, riichi kan constraints, kokushi robbery of concealed kan); review compatibility and prioritize only changes with reproducible tests.
4. Tier summary now adds a discussion prompt panel for split decisions; verify live two-player collection/reveal and cache-version integration after worktree integration.
| 03:32–03:39 | 7 | Mahjong asset/UI review, 375/390/414px browser measurements, and TDD fix for riichi-kan edge cases | Original SVG portraits load at all widths; document width has no horizontal overflow. Mahjong concealed hand is one-row horizontally scrollable. Added exact tests for riichi ankan preserving the same wait, rejecting wait-changing ankan, and kokushi-only robbery of concealed kan. `node test/mahjong-match.test.js` 10/10 passed. Checkpoint commit `f3a41b0` (not pushed yet). |
| 03:40–03:52 | 12 | Reviewed image reference, created four original character portraits, optimized images, and corrected four-kan abort logic | Four 768×960 WebP portraits (173–242 KB each) were generated for Unity's cafe characters; contact sheet reviewed at 240×300. Portraits are original cafe-themed characters, not copies of the reference. Mahjong test suite exposed an existing/previously untested rule error: four kans by one player incorrectly ended the hand. Added seat tracking and only abort for multiple kan owners; match tests now 11/11 and UI tests 15/15. Full-suite pass still pending (first unpermissioned run failed network-bound tests, and exposed this Mahjong rule issue). |
| 03:52–03:56 | 4 | Integrated original portraits, removed obstructive image badges, refreshed PWA cache and captured current mobile gameplay | Each image loaded at 375/390/414px with no horizontal overflow or console errors. CPU table verified with 14 tiles, portrait loaded, 3 opponents visible, scrollable hand, no horizontal overflow. New art and sourced art-comparison images added to offline shell. Relevant Mahjong, Rating, Tier and offline-shell tests passed; full `npm test` passed 597/597 with loopback access. Screenshots are in this directory. |
| 04:19–04:25 | 6 | Replaced all four Mahjong character portraits after the user identified the first pass as under-detailed | Generated original 4:5 character art guided only by the reference's finish/detail level: adult cafe proprietor, bookshop owner, furniture artisan, and radio host. Optimized to 768×960 WebP (165–204 KB each). Updated artwork provenance. Selection cards and the compact in-game avatar reviewed at full resolution. |
| 04:25–04:30 | 5 | Repaired safe practice-question disclosure, aligned Service Worker URL, and verified current character assets | Rating question projection now emits only a neutral `practiceNotice` for generated practice stimuli while still withholding answer, explanation, source and per-choice provenance until reveal; verified questions do not receive it. Service Worker registration now requests v53. Browser checks at 375/390/414 found all four new portraits loaded at 768×960, selection cards 165×206 / 171×214 / 182×228, compact table portraits 48×58, zero horizontal overflow or JS errors. Latest full suite: 598/598 pass. Screenshots: `mahjong-portrait-selection-*-rev2.png` and `mahjong-cpu-table-390-rev2.png`. |
| 04:31–04:34 | 3 | Rechecked Rating privacy in a real host/guest browser flow after the notice fix | Created a two-browser RATING room, selected an original practice question, and answered from the host. The notice appears before answering; no correct choice is rendered, and guest sees zero selected cards after host response. 390px browser had no horizontal overflow. Captured `rating-practice-answer-390-rev2.png`. |
| 04:34–04:42 | 8 | Parallel read-only review found four Tier edge cases and a Mahjong hand-state issue; corrected with regression tests | Tier now disables empty placement buttons in the Tab order, shows an explicit skip action, describes late joiners accurately for one-round games, and labels discussion prompts with respondent count so partial answers are not mistaken for full consensus. Mahjong no longer permits any kan without a live-wall replacement tile. A 100-seeded-match CPU simulation previously showed one match running 98 hands; East-only matches now end after a transparent 12-hand ceiling. In 100 simulations / 54,593 actions, all finished, max hands=12, 14 ended via that cap. UI states maximum 12 hands. |
| 04:43–04:45 | 2 | Repeated Tier skip/partial-answer flow in actual two-browser mobile session | At 390px, verified unselected Tier destinations are disabled, skip button is visible, host submits all seven items, the other participant skips, and host publishes. Result text correctly says `1 / 2人` and asks the group to wait for other evaluations; no horizontal overflow. Captures: `tier-answer-skip-390-rev2.png`, `tier-results-partial-390-rev2.png`. |
| 04:45–04:48 | 3 | Refreshed Tier asset cache keys, updated mobile rule copy, and reran the full regression suite | Tier JS import and event screen moved to v6/v9; shell cache and registration bumped to v54 so installed PWA clients receive the fixes. Mahjong explains its maximum 12-hand East-only match; old persisted matches derive played hands from saved history. `npm test`: 604/604 pass with localhost enabled. |
