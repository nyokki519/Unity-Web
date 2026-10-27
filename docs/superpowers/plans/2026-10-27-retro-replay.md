# Retro replay Implementation Plan

> Execute inline with executing-plans.

**Goal:** 実際の最終入賞を3角度スロー再生。
**Architecture:** 有界座標履歴と補間をpure module、Three描画とDOM操作をreplay-view、mainに記録と待機の接続。
**Tech Stack:** 既存Three.js、Node tests、Playwright。
**Spec:** docs/superpowers/specs/2026-10-27-retro-replay-design.md

## Constraints / review focus
物理/確率不変。重複払出なし。履歴なしは即復帰。画面非表示で進めない。スキップで状態復帰。操作はリプレイ中遮断。記録メモリ上限。

- [x] 軌跡補間・履歴上限・不足データのRED→GREENテストと実装。
- [x] 3カット表示・スキップ・復元、mainの固定ステップ記録と大当たり待機へ接続。
- [x] 全Nodeテスト、390pxブラウザで実物理入賞/3カット/停止/スキップ/払出1回を確認。
- [ ] 本番反映と配信確認、実機iPhone未確認を報告。

検証記録: Node 282/282、ブラウザ4幅・3カット・再生中物理停止・一時停止/再開・スキップ/通常終了・単一払出を確認。履歴テストは未実装時のMODULE_NOT_FOUNDからGREEN。独立レビューの3指摘（再開UI重なり、ファンファーレ同期、リサイズ復元）を反映。

## 続行: replay2（最終段専用粒子と再生時の短音）
- [x] 時間原点付き粒子サンプルとカットごとの1回発音をpure moduleへ分離、RED→GREEN。
- [x] 最終段の通常粒子だけを差替え、ライブとリプレイで同一描画を使用。最長0.16秒の独自チャイムとミュート確認。
- [x] 終了後のライブ粒子復活防止、全テストと4幅ブラウザ再確認、本番反映。

replay2: 全285件成功、4幅ブラウザ確認済み。レビュー指摘のライブ粒子時刻持越しは開始時無効化。実入賞の録音は変更せず、リプレイ開始時の重ね直しを抑止。
