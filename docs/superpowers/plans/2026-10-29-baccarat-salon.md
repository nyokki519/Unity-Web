# Unity Baccarat Salon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. User specifically requests parallel independent tasks.

**Goal:** Implement every audited improvement and publish verified original mobile/PC Baccarat.
**Architecture:** Independent responsive DOM UI plus Three.js paper curl, existing transactional financial core and save format.
**Tech Stack:** ES modules, CSS, local Three.js, WebAudio, Node tests, Chromium Playwright.
**Spec:** docs/superpowers/specs/2026-10-29-baccarat-salon-design.md

## Global Constraints
- No change to rules.js/shoe.js/session.js/storage.js or other games. New files salon-* under public/baccarat; root owns index.html (copy current to classic.html).
- Existing save/8deck/95%commission/integer cents and transactional Session remain source of truth.
- All visible main actions44px+,375/390/414px/PC, text readable without forced640px viewport; safe-area and scroll.
- No forced win, no outside account/service/payment. Community logo only.
- Agents write only owned files and never commit or spawn agents. Root integrates, tests and commits.

## Review Focus
- Storage failure during start/confirm/settle/next/rebet and old larger-minimum saves.
- Dialog/focus and visibility interruption while a card is waiting for user reveal.
- Pointer cancellation/outside release, repeated taps/skip/restart and gesture scroll interference.
- WebGL unavailable/asset failing/denied storage fallback, keyboard and reduced motion.
- Small heights/large text, iPhone bottom safe area and desktop history width.

### Task 1: UI shell / CSS (parallel)
Files salon-shell.js, salon.css. Export createSalonShell(root) returning refs by query selectors. Pure markup helper; no controller business logic. See interfaces below. Native dialogs title/settings/help/history/session/error handled by root. Render static independent full visual design, quality felt, original chips from art assets, table rail, title vignette. Agent owns only two files.

### Task 2: paper curl (parallel)
Files salon-card.js, salon-squeeze.js, salon-squeeze.css and own Node/browser tests. Export createCard(card,{hidden=false}={})→HTMLElement using original classic-cards atlas for source-independent Unity card faces/back. Export SqueezeView class constructor(host,{onProgress,onReveal,onSound}) with async open({card,label,reduced=false}), finish(), cancel(), dispose(); open returns promise resolved exactly once on completed reveal or cancel; cancel resolves false, completion true. A persistent host section in shell #salon-squeeze. Caller controls phase and accounting. open shows direct pointer curl (no slider), reveal/tap button, keyboard, prevents page-scroll only within card. THREE imported local vendor; WebGL fallback visible/usable. No RAF while closed, resize and disposal robust. Root awaits completion only; onReveal is notification. No shared files.

### Task 3: independent art / audio (parallel)
Files salon-art.js, salon-audio.js, salon-assets/*.svg|webp|png, own tests/docs. Export chipArt(value)→safe SVG string or asset URL? use URL contract: returns URL string. createChip(value)→HTMLElement optional. Export class SalonAudio with unlock(), play(kind,strength=1), set(options), pause(), resume(), dispose(). Options {muted:false,bgm:.12,se:.35,ui:.25}; play kinds chip,undo,confirm,deal,lift,reveal,third,win,tie,loss,payout,click. Synthesized/original audio; no noise tails, limited simultaneous contacts, suspend ambient on background, no autoplay. Material/art real textures and detailed original craft, no reference PNG/button/font/SE imports. Agents coordinate art names via module not global.

### Task 4: orchestration / accounting (root)
Files salon-controller.js, salon-main.js, salon-round.js, salon-panels.js, index.html; own tests. window.SALON={controller,settings,view,squeeze,audio,ready:true}, controller.session existing Session. Native data-action selectors and IDs below. Retain classic.html and previous UI scripts/tests, source not deleted/shared assets protected.

### Task 5: QA independent (parallel, test-only)
New test/baccarat-salon_browser.py; flows after integration. Consumer app selectors data-action=start,resume,new-session,chip:N,bet:player|tie|banker,undo,clear,repeat,confirm,skip,next,rebet,settings,history,help,home; .salon-title, .salon-game; #salon-panel native dialog; #salon-squeeze; [data-squeeze=finish]. Inline #salon-message and #salon-receipt. Main cards .salon-hand[data-side=player|banker], totals [data-score=side], wallet [data-money=balance|stake]. Chips are integer chips values1,10,100,500,1000,5000; internal units cents. API fixture can set Session shoe order in browser tests only. Save fail injection is controller.session.commit=()=>false. Browser tests must cover real gestures, known legal tie/banker/third, next/rebet, storage/save retry, mobile sizing/focus and keyboard. Tests run local http://127.0.0.1:3483 default; production UNITY_URL configurable. No duplicate full suites per worker.

## Root/worker interface: shell DOM
createSalonShell(root) injects title and game (one hidden). title data-action=start/resume/new-session/help/settings; game data-action=home/history/settings/help and hand containers .salon-hand[data-side] containing .salon-cards and [data-score]; title preview can use static art markup. #salon-status; #salon-message[role=status]; [data-money=balance|stake|available]; #salon-shoe; betting buttons data-action=bet:side and child [data-bet=side]; chips data-action=chip:N; controls undo/clear/repeat/maximum/confirm. #salon-receipt[hidden] contains #salon-receipt-content and actions rebet,next. #salon-round-status; skip; #salon-squeeze initially hidden; #salon-panel <dialog> child #salon-panel-title, #salon-panel-content and close-panel. Root may append dynamic markup but not edit shell/CSS until worker reports. Pure presentation no source1:1 requirement.

## Ledger
- [x] Root financial controller + Node regression
- [x] Shell and original art integration
- [x] Direct squeeze integrated, fallback and keyboard checked
- [x] New browser end-to-end and existing protected regression
- [x] Independent whole-change review and fixes
- [x] Visual and motion capture, measured performance
- [ ] Main/Render deploy and production hashes + play
