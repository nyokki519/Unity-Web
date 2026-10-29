# Vesper presentation pass

The private table uses a midnight navy salon, emerald felt with an original fiber tile, leather rail and brass inlays, ivory card stock and champagne controls. The table selections, title screen, ordinary table and full-screen squeeze share these materials. The header uses the community cup/heart engraving. Original card generation and material provenance are recorded with their assets.

Denominations use ivory, burgundy, blue, green, plum and champagne chips with inset faces, segmented edges and layered sidewalls. Active wagers have small stacked chips. The bet console stays in document flow so tall desktop layouts cannot cover the table or receipt.

Deal motion originates at the rendered shoe, glides with rotation and scale, overshoots slightly and lands. A third-card wait adds 300ms to normal-speed anticipation without changing the actual card plan. The squeeze remains a direct-touch sheet; its shader adds subtle fiber and a curvature highlight without changing the mesh or gesture rules.

Settlement commits before presentation. Positive personal net receives table illumination, a card sheen, receipt entrance, and staggered chip flights to the actual wallet. Landing clicks and a small wallet response follow each chip; the original win sample starts at settlement. Pushes and losses use a single return/collection flight per line and never receive the positive-light sequence. Net tiers below 10,000 / below 100,000 / at least 100,000 (internal integer money) produce at most 5 / 7 / 9 chips per winning line (a paid TIE has at least tier2; pushes remain tier0), with an absolute 18-overlay cap. The saved wallet always shows the actual committed value; no cosmetic counter writes to money.

Settings independently disable table illumination and chip cascades, or enable the small table movement (off by default). Reduced motion and instant speed bypass flights and settlement animation. Quick speed shortens travel and caps winning flights at two per line. Skip, Next, navigation, settings changes and visibility handling cancel tracked animations/timers. Presentation callbacks never settle, alter bets, save money, consume shoe RNG or invoke financial callbacks.

## Verification

- `node --test test/baccarat-*.test.js`: 45 passed, including personal-net tiers and settings persistence/validation.
- `UNITY_URL=http://127.0.0.1:3483 python3 test/baccarat_browser.py`: real UI/save/reload/tutorial, large text and mobile/desktop layout passed.
- `python3 test/baccarat-hand_browser.py`: direct touch/mouse, peeking back, primary pointer, hold/resume, keyboard, 375/390/414 and desktop passed with video.
- `python3 test/baccarat-art_browser.py`: real committed known-shoe win/tie/loss and large win, overlay bounds, wallet invariance, normal deal, cleanup and Next cancellation. Output path configurable with `BACCARAT_ART_QA`.

Browser captures use Chromium, not physical iPhone hardware. Playwright's video contains visual frames only; it does not record the Web Audio output. The interactive browser uses the original audio path. The reference website was unavailable through the environment network policy; no claim of inspecting it is made.

Forecast refinement: the rarity palette now appears only in a fine inner inlay, short corner accents and a small phase-label jewel. A one-pass diagonal reflection crosses the cue ribbon; no thick colored rail or rotating rainbow frame remains. `test/baccarat-forecast_browser.py` checks all four visual-only palette fixtures on an actual settled practice hand, plus 375/390/414 title layout. The Japanese subtitle intentionally keeps the whole phrase プライベートテーブル on its own mobile line.

Card reflections now move a narrow composited light strip rather than repainting a brightness filter. Desktop raster-tail performance remains a known limitation; see the combined art-pass report.
