# Unity MIX Three-Game Follow-up Quality Pass

- Scope: production UX and implementation follow-up for Mahjong, Rating Check, and Tier Board.
- Started (UTC): 2026-11-10 07:59
- Baseline commit: `7d735c3` (`main`, matching `origin/main` at start).
- Preservation: retained the existing untracked Mahjong plan/spec docs, node_modules, and four prior QA screenshots. They are not part of this pass.
- Clock policy: substantive investigation, implementation, review, and verification only; browser/network waits and other idle time excluded.

## Work log

| UTC | Active minutes | Work | Evidence / result |
|---|---:|---|---|
| 07:59–08:16 | 17 | Read scope and skills; checked Git baseline; independently audited each game's source and began current production mobile flow capture | `main` at `7d735c3`; no tracked diff; pre-existing untracked items preserved. Chromium mobile emulation verified home, Mahjong character select and CPU turn, event room creation, Rating rules and 2-client lobby, Tier rules and answer board. Captures saved beside this log. Production access required an escalated proxied request because the sandbox proxy bridge initially refused connections. |
| 08:16–08:24 | 8 | Completed live Rating reveal capture with two independent 390px contexts; reviewed screenshot evidence; added regression assertions and server-side fixes for reveal timestamps and Tier completion/default time | Rating production reached A/B answers, closed room split, and REVEAL at +0.25s/+2.15s/+3.55s. Both clients stayed in lockstep, while the current code held both doors closed only coincidentally at the start, then opened both together; captures `14-rating-closed-baseline-390.png` and `15-rating-reveal-baseline-t*.png`. New tests first failed on missing `revealStartedAt` and 600s Tier default, then passed after adding server start/end timestamps, auto-close for all submitted Tier ballots/skips, and 300s default. Direct test files `events-rating` and `events-tier` pass; Node's concurrent `--test` harness in the sandbox failed to spawn, so direct-file execution is used for now. |

## Baseline findings (confirmed)

1. Mahjong's visible "音声 オフ/オン" setting only toggles state; no sound playback is wired to Mahjong actions. In CPU gameplay the opponent's concealed hands render five `▥` glyphs instead of tile-back shapes (`public/mahjong/src/app.js`, `public/mahjong/style.css`).
2. Rating's server stores `revealAt = now + 6500` (end time) while the client subtracts it as if it were start time. During reveal, elapsed remains zero and both doors animate with almost identical timing. Confirmed by code and tests; public room reached the A/B waiting-room phase with two mobile-emulated clients.
3. Rating has 12 enabled questions and 2 with verified source evidence; most remaining practice questions reuse effectively the same comparison prompt/art across paired questions. Confirmed in `data/rating-questions.json` and content tests; actual answer screen and questions rendered in a two-client production room.
4. Tier's exported share image does not receive the question prompt and always says only "みんなのTier会議". Its aggregate panel is labeled "みんなの真ん中" although it shows per-item plurality, not a median. Confirmed in source and two-player production flow.
5. Tier's default response window is 600 seconds and its explanatory copy describes 10–20 minutes, although the built-in default round limit is one. Confirmed in `src/events/catalog.js` and production 390px answer screen.

## Quality gates

- Keep three-game fixes isolated from other games and shared room state.
- Write regression tests for every behavior change before implementation.
- Capture 375/390/414px mobile states, exercise keyboard/touch/focus where applicable, and verify two-client event sync.
- Run relevant tests, the full test suite, and static question validation.
- Deploy only after review and passing verification; record production commit and endpoint checks separately from quality-pass active time.
| 08:24–08:41 | 14.5 | Mahjong portrait art direction and asset generation/curation; integrated four original 768×1152 WebP portraits; UI crop tuning and provenance note | Original Moka, Sumire, Houma, Kona portraits are ~134–238 KB each. Existing source portraits retained. Mobile selection/table captures at 375/390/414 have all four images loaded, no page-width overflow or browser errors; 390px art reviewed visually. Image-generation wait (~2.5m) excluded from active time. |
| 08:41–08:52 | 10 | Fixed Rating beat updates to advance in-place on the server clock; connected Tier prompt to comparison/share image; corrected outdated local test expectations and cache invalidation | Rating reveal clock now advances on both independent 390px contexts through approach/hold/touch; both doors stay shut until TALK, which opens only the correct room. Tier result shows original prompt and majority label semantics. |
| 08:52–08:59 | 6 | Repeated phone-flow review, removed redundant Tier answer copy, corrected image aspect-ratio handling for Rating evidence/practice images; reviewed 375/414 captures | Tier playfield begins at y≈541px on a 390px viewport, document width equals viewport, 7/7 cards visible in DOM; answer guidance includes tap, drag and privacy. Rating 640×440 cards render at their source ratio and image labels remain outside the artwork. Tier 2-player image export downloaded as `unity-mix-tier-result.png` with topic and agreement. |

## Subagent active-work reports (reported minutes, not elapsed clock)

- Mahjong: ~25 minutes in initial pass + ~3 minutes for deterministic CPU tie selection review = ~28 minutes.
- Rating: ~2.5 minutes in initial reveal pass + ~20 minutes for content quality/source audit and original SVG redraw/checks = ~22.5 minutes.
- Tier: ~5 minutes in initial UI pass + ~5 minutes for result metrics/legend/10-player table review = ~10 minutes.
- Root active investigation/implementation/review through 08:59: approximately 55 minutes (25m initial browser/code pass plus ~30m follow-up; generation and browser wait time excluded).
- Reported team active work through 08:59: approximately 115.5 minutes. This is below the requested 120-minute minimum; continue an additional substantive review/verification pass before finalizing. Wall-clock elapsed since 07:59 is 60 minutes and is not used as the work-minute total.

## Follow-up validation

- `npm test`: 624/624 passed, including legacy game regressions and new tests.
- `node tools/check-questions.js`: 259 core prompts validated; each event game still has 15 prompts; Rating remains 12 enabled / 2 evidence-verified.
- Browser: Rating reveal operated in two separate live contexts; Tier submissions auto-closed and revealed together; prompt, agreement, 7-item comparison and actual PNG download confirmed.
- Mahjong: four portrait assets loaded at 375/390/414; CPU table opens and concealed hands remain concealed. Chrome emulation only; no physical iPhone/Safari verification.

## Independent-review corrections and final quality gate

| UTC | Active minutes | Work | Evidence / result |
|---|---:|---|---|
| 08:59–09:09 | 8 | Fixed a privacy leak found by the Rating reviewer; audited image alt text against SVG geometry; made reduced-motion result doors deterministic; completed Tier share-image legend and spacing regression; invalidated offline cache | Rating ANSWER/CLOSED/REVEAL now sends neutral choice labels and alt text, preserving the detailed descriptions only in TALK/FINAL; dedicated regression checks cover both states. Corrected alt descriptions for the craft, antique and plating practice comparisons. Tier PNG now contains all five definitions and explains pairwise agreement; canvas coordinates assert non-overlap for long prompts. Bumped the app/service-worker revision to v58 and Tier bundle key to v9. `npm test` passed 624/624 under the permitted local-test execution; focused Rating, Tier UI and content checks pass. |

- Independent final reviews contributed approximately 6.5 active team minutes after 08:59 (Mahjong 3m, Rating 2.5m, Tier 1m). Combined reported team active work is approximately **130 minutes** (115.5m through 08:59 + 6.5m review + 8m root follow-up). Tool startup, failed sandbox bind attempt and other waits are excluded. This exceeds the requested 120-minute improvement minimum; the production deploy / endpoint check remains the separately tracked final phase.
