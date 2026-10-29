# Baccarat faithful reproduction — design QA

Scope: the playable 640×960 game canvas and observed dialogs at playingcards.jp/m/gamble/baccarat/. User-authorized source materials. Unity community card faces/back intentionally replaced; remote portal/account/purchase excluded. This is not a claim that the whole site is identical.

Evidence: docs/baccarat/faithful/comparison/pair-{betting,selected,wager,deal,reveal,result,settlement,record,max,min,clear}.png; aligned-comparison.mp4 and separate real-audio clips. Desktop capture800×1300/DPR1; game origin80,206. Local host-only outside-game margin206 aligns portal placement. Canonical comparison excludes portal chrome. Physical viewport captures375/390/414px are supplied separately; mobile layout viewport640 is deliberate reference behavior.

## Findings and resolutions

|Severity|Observed issue|Resolution / evidence|
|---|---|---|
|P1|Previous VESPER layout and cinematic squeeze diverged from source|Default replaced with actual source layout, imagery, coordinates and face-up sliding deal. Old version separately retained|
|P1|Canvas fallback produced lighter betting fields|Retained source WebGL SCREEN blend; fields match source RGB75,131,38|
|P2|Instruction copy duplicated text already baked into background|Removed overlay except actual error messages|
|P2|Dialog dimensions, title close control and copy differed|Source jQueryUI theme, body text, auto width538×262 and explicit actions; title X hidden; keyboard action focus maintained|
|P2|Unity card substrate/outline and raster scale differed|White stock, black border, rounded corners, source144×200 atlas and86.4×120 displayed size; original community artwork retained|
|P2|Flying cards could cover fixed HUD|Separate card layer below fixed HUD matches source ordering|
|P2|Oversized52SVG textures|One local52-face atlas, theoretical RGBA reduction72.8→7.5MB|
|P2|Failed rebet saves or missing dialog library could strand round|Fresh independent review, failing tests then transactional recovery and preflight validation. Browser regressions green|

Inspected result/settlement pairs and390px viewport directly. Fonts, chip buttons, table texture, colors and static geometry agree in no-card states. Three no-card states have0 mean absolute channel error outside the sole variable name mask; do not extrapolate to dynamic frames. Unity faces are visibly different by design. Dialog hover/focus styling depends on current pointer/keyboard state. No new decorative effects or invented BGM added.

## Validation / limits

413 Node tests passed; browser touch/keyboard, third card, accounting, storage failure recovery, repeated inputs, interrupted/reloaded rounds, source controls, other games and retained VESPER passed. Actual evidence/logs: docs/baccarat/faithful/results/.

Recorded initial-four-card timing differs by40.2ms and result timing by176.3ms under recording; no exact dynamic identity claim. Actual render21.42fps at390px and21.33fps at1920px in software-GPU Chromium. Source cap30 preserved, performance remains a limitation. Not tested on physical iPhone/Safari. Same semantics, legal hand and nominal tween timings are used; source network callbacks are not reproduced.

Expected retained differences: local profile/menu instead of remote account/purchase/portal;8deck and cent-exact95% payout instead of source per-hand52deck/whole-chip floor. These financial safeguards remain documented. Scope result: compared canvas/static source reproduction verified, remaining differences explicitly disclosed; no assertion of commercial readiness or perfect site-wide fidelity.
