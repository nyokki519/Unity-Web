2026-10-30追補: さらに以前のカジノ風へ戻す指示を反映。docs/baccarat/classic-return/README.md と実画面を参照。明るい緑の卓・筆記体ロゴ・点線円形ベット枠・旧チップを復帰、全方向絞りと操作UIは維持。

最新の追補: docs/baccarat/omni-casino/README.md。全8方向の折り目・戻し・つかみ直しと、緑のフェルト/金のレール/曲線文字を確認。422 Nodeと独立22方向QA、既存14通し検証成功。実機Safari未確認。以下は前段のUI刷新記録。

# Unity Baccarat original salon — design QA

Current target is the user-approved audit at docs/baccarat/audits/2026-10-29-original-redesign/README.md, not source pixel matching. Scope is the actual playable title, table, direct squeeze, betting, inline receipt, history and settings. Old faithful reproduction evidence remains under docs/baccarat/faithful/; its fidelity metrics no longer describe the default page.

Actual new UI screenshots and sound-on round recording: docs/baccarat/salon/. Inspected title-390, squeeze-390, result-390 plus independent mobile/desktop captures. The recording uses an explicit legal known-shoe QA fixture; no mocked images/sounds/trajectories. Source-style title, yellow circles, PNG controls and OS-themed dialogs have been replaced with original navy/emerald/ivory/brass, detailed community cards and chips, woven felt, consistent buttons and native themed panels.

## Findings resolved

- Tiny fixed640px UI → responsive native layout, main44px+ targets, mobile scroll/safe-area, desktop record sidebar.
- Min meaning wrong → explicit one-step undo / clear / previous / maximum.
- Card tiny at53px → actual86px overlapping mobile cards, preserving index visibility and each hand's area; root fixed initial inherited1/3 maxwidth constraint.
- No direct reveal → pointer-controlled segmented3D sheet, face/back and curl shading,720×1000 active texture, fallback, keyboard, skip.
- Title ghost artwork/blank gap → visible original card/chip vignette, clean transparent community logo, consistent game/title palette.
- Every-round forced dialog → inline actual winner, principal/profit/returned/net and next/rebet controls.
- Record unavailable while playing → header and squeeze actions open history/settings, full focus handling.
- SAVE recovery edge cases → same explicit transactional commit/retry path; independent QA catches real failure states.

Independent review found modal Escape/Tab captured by squeeze and nested retry success hiding a repeated failure; both fixed with dedicated regression. Async retry also clears warning only after successful settlement. No material open findings from the review.

## Evidence limits

Node420 green,14 independent browser groups green, existing protected-game regressions green. Exact commands and logs in docs/baccarat/salon/results. Browser375/390/414/1440 touch geometry plus1920 performance; all Chromium, not physical iPhone. Idle rAF16.7ms and curlCPU submit1.0ms median are measured, not a promise of60fps on devices. Colors/typography/reading order and actual pointer/reveal sequence were visually checked; screen-reader compliance and speaker listening remain unverified. No claim of commercial/perfect quality solely from tests.
