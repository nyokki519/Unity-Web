# Unity SHOOTING — UI/UX audit and safe improvements

Date: 2026-11-08. Baseline: `f8f1859`. Audited the current code through `http://127.0.0.1:3482/shooting/index.html` with Chromium + software WebGL. All screenshots below were captured in this audit run and visually inspected. This is browser viewport emulation, not a physical iPhone or Safari test.

## Steps actually operated

| Step | Action | Health / evidence |
| --- | --- | --- |
| 1 | Open the title, use “すぐ遊ぶ（おすすめ）” | Good: clear first action, three brief operation diagrams. [Title](before-01-title-390.png) |
| 2 | Play, inspect HUD and combat controls | Good: health and every ability control fit 375×667 without horizontal overflow. Tiny labels could improve. [Play](before-02-play-390.png), [short screen](before-play-375-667.png) |
| 3 | Press the music icon during play | Confirmed defect: its accessible label promises 音量設定, but it only opened a pause menu without volume controls. [Before](before-03-sound-button-pause-390.png) |
| 4 | Operate pause/resume using mouse and keyboard | Confirmed defect: focus remained behind the overlay; no dialog name/semantics. Fixed below. |
| 5 | Read a completed-stage result and choose Next | Good after the existing reveal animation settles: result, rewards, and sticky Next controls are available. Used controlled stage completion to avoid waiting for the boss; clicked the actual Next button to verify stage transition. [Result](after-stage-clear-390.png) |
| 6 | Retreat to equipment, open settings | Good: selected equipment summary, reasons for fixed modes, percentage/px/multiplier settings, touch-position preview. [Equipment](before-05-hangar-390.png), [settings](before-06-settings-390.png) |

## Ranked findings and implementation

| Rank | Evidence status | Finding and cost | Implemented improvement |
| --- | --- | --- | --- |
| 1 | Confirmed by actual control operation | Music icon cannot reach volume controls during an active flight; abandoning the game to reach settings is unnecessary friction. Low cost, high impact. | Music icon now pauses the flight, opens BGM/effect sliders, focuses the first slider, and saves changes immediately. The normal pause menu also contains a collapsed volume section. On result screens the icon opens the same controls without removing the result or settling twice. |
| 2 | Confirmed by DOM + keyboard operation | Pause/results lacked named dialog semantics and keyboard focus containment. Low cost, medium/high impact. | Added labelled dialog semantics, initial focus on the primary action, Tab/Shift+Tab containment, Escape from a slider, and focus restoration on resume. |
| 3 | Confirmed CSS size; readability is expert assessment | Mobile ability names were 9px and secondary status 7px. Low cost, medium impact. | Increased them to 10px/8px while retaining 50px controls and the existing playfield dimensions. |

The established title art, navy/mint palette, combat rendering, rules, physics, recovery drop rates, reflected-shot logic, scores, balance, and save schema were kept intact.

## After evidence

- [390×844 pause audio](after-audio-390-844.png)
- [375×667 compact screen](after-audio-375-667.png)
- [375×812](after-audio-375-812.png)
- [414×896](after-audio-414-896.png)
- [1440×900 desktop](after-audio-1440-900.png)

The compact pause view may scroll within the dialog. The resume action stays available; the active play controls and board dimensions remain unchanged.

## Verification

- `node --check public/shooting/main.js` — pass.
- `node --test test/shooting-*.test.js` — 5 test files pass (core, balance, feedback, input, save).
- `SHOOTING_QA_DIR=docs/qa/ux-audit-shooting python3 test/shooting-ux_browser.py` — pass at 375×667, 375×812, 390×844, 414×896, and 1440×900.
- Verified no simulation ticks advance while volume is edited during pause, updated percentages, persistence after reload, keyboard containment, Escape and focus restoration, and the real Next-stage control.
- No browser `pageerror` events.

## Limits / hypotheses

- No physical iPhone, Safari toolbar, assistive-technology, auditory loudness, frame-rate, or extended-play difficulty evaluation was performed. Changing sliders and persistence were verified; audio was not subjectively listened to.
- A busy painted background could make some enemy bullets hard to distinguish in maximum-intensity combat. This is a hypothesis requiring a longer real-play test; it was not used to justify a speculative rendering change.
- Replay pause/audio behavior was not included in this flow. No claim of full accessibility compliance is made from screenshots.
- No deployment, push, or commit was performed by this audit worker.
