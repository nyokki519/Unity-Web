# Task 1 — Salon shell

Complete: `public/baccarat/salon-shell.js`, `public/baccarat/salon.css`.

Pure createSalonShell(root) module renders title initially visible, game initially hidden, full DOM/action contract, native dialog, inline receipt, squeeze host, optional desktop #salon-history-preview. Imports chipArt URL contract. Root owns event handling, dialog content, dynamic financial and history state.

Design: original layered emerald felt, inset brass table rail, navy surrounding space, ivory display typography using existing local Cormorant font; original CSS title vignette with cards, community mark and art-agent chips. No old reference image/style imports. Phone controls include two-column undo/clear/repeat/max actions, readable 12–13px main labels, 44px minimum buttons, safe-area bottom padding and scroll. Desktop adds session column. Reduced-motion overrides transitions.

Validation: `node --check public/baccarat/salon-shell.js` passed. Temporary isolated Playwright harness `/tmp/salon-shell-check.py` with system Chromium checked 375/390/414/1440: title/game no horizontal overflow; every visible game button >=44px; no page/module errors. Screenshots `/tmp/salon-{title,game}-{width}.png` reviewed at phone and PC. Temporary harness does not alter repository index/controller.

Parent requested action labels applied: 1つ取り消す / 全解除 / 前回のベット / 最大ベット / 同じベットで配札 / ベットを変更.

Integration concerns: dynamic actual-card sizing should receive browser QA with worker card module; controller must update aria-pressed on selected chips and desktop history preview when rendering. Parent moves squeeze host outside game for inert support. Community image retains source background; art worker consulted for clean mark, otherwise circular crop softens source rectangle.

## Final visual revision
Parent's integrated screenshot review requested a visible mobile title vignette instead of ghost watermark and spare space. Title now stacks a 248px full-opacity original artwork section below CTA without overlap; PC keeps large split composition. Uses art worker `title-ace.svg`, `title-back.svg`, and transparent `community-mark.svg` instead of CSS generic cards / original mark background. Reviewed `/tmp/salon-title-390.png` and desktop screenshot. Added global 44px minimum width as well as height. Re-ran browser geometry check for both width AND height at375/390/414/1440: all pass; no overflow or module errors. Mark concern above is resolved by new transparent asset.
