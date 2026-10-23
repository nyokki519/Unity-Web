# Development ledger — plan: docs/mechanical/development/PLAN.md

- Authorization: 2026-10-23の明示指示でH3採用・実装・push/main/公開を許可。承認の反復は省略。
- Backup: /workspace/backups/mechanical-h3-20261023/ に履歴bundle、未コミットpatch、未追跡tarを保存中。既存研究・撤去変更を維持。
- Preflight interfaces: 共通幾何→physics/scene、一意の球ID→台帳、tick操作→replay、物理入賞→電子振分を固定。
- Ruling: 未確認寸法・磁気力は明示した推定値として機能モデルを作る — 追加資料で停止しないという最新指示 — 実機一致は保証せず感度と差異を報告する。
- Ruling: 途中のspec/plan再承認と実装停止を省略 — ユーザーが明示的に解除 — 研究の未確定事項は校正済みと呼ばない。

- 2026-10-23: 共通幾何、SI球（11mm・5.44g）、CCD、可動接触、240Hz＋バット掃引サブステップ、台帳・電子振分・リプレイを実装。
- Debug ruling: Rapier標準接触余裕は11mm球に大きすぎる。lengthUnitを小さくすると高速球の制限が生じたため1mを維持し、許容誤差20µm・予測距離100µmを明示。12m/s薄壁試験で確認。
- Debug ruling: 釘/屋根の楔と水平閉鎖アタッカー床の滞留を初期条件・接触位置で再現。幾何の傾斜・釘とのクリアランスで解消し、救済ワープは使用しない。
- Debug ruling: 磁極の軟化距離が設定を読まず12mm固定だった。設定18mmを使い、頂点越えの失敗試験→成功を確認。力0.20Nは実測ではなくmg/摩擦と搬送の機能仮説。120球の接触試験と通常発射の率を分ける。
- Debug ruling: 不成立の連打入力も記録されるため、再生は「発射成功」ではなく「操作の試行」を再現。拒否された発射を不正ログと誤判定しない。連打リプレイ試験を追加。
- 18機構テスト＋既存計226テスト成功（初回全体実行13.6秒）。ブラウザ・統計・回帰の最終結果はQAに追記予定。
- Final review: P1 starter-edge retention reproduced from the 10,000-shot snapshot → shared cup clearance +0.3mm numerical tolerance and full front-lip extent. Edge and front-lip tests RED→GREEN. Failed surveys retained, never used as release evidence.
- Final review: P2 manual finish bypassed auto-command log; P2 Escape dismissed terminal results. Browser reproduced both false, then command logging + non-cancellable result dialog yielded true at 375/390/414/PC, including full snapshot replay.
- Ruling: currentTicket is an electrical latch retained until next started opening; a captured ball takes a ticket snapshot, so later openings cannot rewrite it. This policy is a reconstruction, not confirmed H3 circuitry. Below-wing fixture is not evidence of ordinary wrong attribution; reviewer found no ordinary reproduction. Cost if wrong: round ownership differs near overlapping openings.
- Debug ruling: remaining right-lane retention is a pin/launcher gap below 11mm and a funnel endpoint wedge. Remove only protruding alternating pin; keep at least one full diameter of physical clearance. No timeouts or force nudges.
- Debug ruling: normal-route trace showed admitted balls dropping behind raised channel back panels and alongside route floors. Back panels now meet main board; visible tapered collectors connect wide mouths to floors. Both entry lanes pass a RED→GREEN depth-delivery test.
- Evidence ruling: manual track 213→229→280→338px before the bat proves cross-field motion, not calibrated speed. Flat cross-section left shelf preserved x and missed the bat. Add gravity-driven cross-slope to the same physical/render shelf; test left delivery reaching bat lane RED→GREEN. Angle remains estimated, not measured.
- Debug ruling: pin field lacked an outer front boundary. Add displayed upper/lane glass, lower recovery glass and shared top frame; CCD forward shot now retained. This follows actual enclosed-machine geometry rather than a hidden outcome condition.
- Ruling correction: bat-impulse test originally required y>0.365 at one phase, but contact log showed a genuine underside rotor collision at y≈0.347 and the same peak even with a faster motor. The height-only assertion conflated contact with guaranteed magnetic catch. Reverted motor speed to0.055s, retained physical contact assertion; catching still depends on pole phase. No force was added to make the test win.
- Regression: original retro 390px passed, 6 and15 independent contexts each completed all6 exchange modes with2 rounds, skip/missing answers/reveal/end. Protected retro/src/vendor/package/CPU paths remain byte-for-byte unchanged.
- Source rights: third-party research JPEGs and original uploaded videos remain local; product uses only original generated visuals and synth audio plus unchanged licensed vendors.

- Validation ruling: seam fixture y0.285 began inside the start-through side wall; requiring arbitrary interpenetration to self-resolve is not a valid normal-play regression. Use non-overlapping upstream y0.310. The normal baseline had justified reducing the wall height from24 to16mm; no pin removal was retained solely to force the invalid fixture to pass. Final28 tests green.
- Final physics verification: 10,000 genuine launcher shots, source hashes match final config/geometry/mechanisms/physics/game/economy/random/math. 87 pickups (69left/18right),2 natural V/jackpots,2 natural start-throughs,13 attacker captures,10,000 recovered,0 unresolved/0stalled/0escapes at drain end. Payout5,302 balances exactly. Temporary still>8s peak1 cleared naturally. No fixtures in this run.
- Final motion verification: 0.16/0.20/0.28N contact-grid sensitivity120 each; V1/0/1, no terminal stalls. Tiny sample and different initial conditions, not real-machine odds.
- Final browser verification: four widths pass after quality control and master audio gain. OFF gain is read after Web Audio quantum processing, not assumed synchronous with scheduled parameter updates. Low-quality renderer leaves physics unchanged; software-GPU average fps improves 5.8→14.9 mobile /3.0→9.1 desktop, still below60. Hardware Safari not verified.
- Setup correction: startup environment key is DATA_PATH, not DB_PATH. Initial local regression created test rooms in existing default local .data; no preexisting rows intentionally removed or production database accessed. Final isolated server uses DATA_PATH=/tmp/mechanical-isolated-qa.sqlite on3462. Runbook fixed. Local test rooms follow ordinary expiry.
- Completion: steps1–4 verified. Step5 has separate ATELIER retirement commit70ef855; feature integration and authorized push next. Existing vendor/retro/server/CPU/package paths unchanged from2352c87.
