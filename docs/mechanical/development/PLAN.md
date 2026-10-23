# H3独立実装計画

Spec: DESIGN.md。実行方式: inline（ユーザーが追加承認不要・自律完遂を指定）。新規有料依存なし。

1. 保護・基盤: ローカルバックアップ、専用branch、研究資料の現行状態更新。config.js（仮定と範囲）、random.js、economy.js（台帳/電子抽選）、geometry.js（描画と衝突の共通記述）、mechanisms.js（可動姿勢）。test/mechanical.test.js でラウンド・台帳・穴・変換を先に失敗確認して実装。Expected: 単体テスト成功。
2. 物理: physics.js はRapier初期化、剛体球・CCD、可動剛体、接触と力、センサー。game.js は状態機械・操作履歴・固定tick。テストは自由落下/球衝突/高速壁/可動接触/磁気保持/入賞/再生を先に追加。Expected: 世界が有限・収支保存・非ワープ・一度だけ入賞。
3. 表現: scene.js、camera.js、audio.js、ui.js、main.js、index.html、style.css。共有形状からメッシュを作り、UIイベントがcanvasへ漏れない。ブラウザで実際の球筋・役物・V後のラウンドを確認し画像保存。Expected: 375/390/414とPCで操作、非表示復帰・音・視点切替。
4. 実遊技と統計: scripts/mechanical-survey.mjs は本体のエンジンを使い10,000球以上、感度分析、滞留・率・台帳・性能を記録。test/mechanical_browser.py は通常発射と明示された検証fixtureで機構・遊技遷移を検証。Expected: 通常プレイが進み、未解決球を隠さず報告。
5. 統合・公開: ホーム導線とSW更新、既存npm test、レトロ・交流回帰、fresh review、個別コミット。main更新とpushは今回の明示許可に基づく。デプロイ/本番HTTPを確認できなければ未確認として必要操作を報告。Expected: 新作URLと既存機能のHTTP/UI確認、または具体的な認証/通信ブロッカー。

Interfaces: config/geometry→physicsとsceneは同一寸法。mechanismsのtick→Rapier姿勢→scene描画。game→economyの入賞イベントは球IDで冪等。survey/browserは同一gameを使用。品質・計測不一致はprogress.mdへ判断理由を記録して修正する。
