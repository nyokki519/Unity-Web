# SI-2 修正の検証記録

- `npm test`: 全142件成功。皿内の以前の停止位置、釘の隙間、下り流路、左右への反転、SI-1リプレイ互換を追加確認。
- 全体テスト初回では既存のランダムなお題に依存する `server.test.js` の「自他の値が異なる」判定が双方空配列で失敗。該当テストを変更せず再実行し、3件成功。その後の全体再実行でも142件成功。ゲーム本体の集計処理は今回変更していない。
- `node tools/check-jackpot-jams.mjs --baseline`: 凍結したSI-1、3難易度×60玉。2秒以上低速の停滞56件、時間上限回収42件。
- `node tools/check-jackpot-jams.mjs`: 同じシード・発射条件でSI-2。180玉で上記停滞0件、時間上限回収0件。before-stalls.json / after-stalls.json。全シードでの保証ではない。
- `node tools/check-jackpot-flow.mjs`: 通常発射35、5シード×100玉。全玉決着、合計3回の3段突破。natural-flow.json。練習モードの独自設計で、実機確率ではない。
- 釘区間の別計測：30玉で129衝突、左右の速度反転・横方向の移動幅をpin-motion.jsonに保存。プレイの楽しさを数値だけで認定しない。
- Chromium 375/390/414px：単発、長押し、停止、blur、再挑戦、JSONリプレイ、設定保存と再読込。report.json。
- 全3段の自然投入・成功穴・外れ穴、直接視点ボタンと全幅表示：browser-report.json / cradle-段-幅.png。ball-detail-390.pngは同じ物理・描画で0.3秒進めた球の確認画像。
- `python3 test/bonus_lifecycle_check.py --url ...`: 4件成功。
- ブラウザWorkerの近似1000回→3D物理進行→キャンセルを確認。worker-check.json。

再実行：`PORT=3400 npm start`、別ターミナルで `python3 test/jackpot_flow_browser_check.py`。別ポートは `JACKPOT_QA_URL` に指定する。

クラウドChromium/SwiftShaderはソフトウェア描画で、並行検証中に約2〜12FPSを観測。実機GPU性能やiPhone Safariの滑らかさを示す測定ではない。実在シミュレーター・実機動画は今回のネットワーク制限で閲覧できていない。本物と同等の再現度を検証済みとは主張しない。
