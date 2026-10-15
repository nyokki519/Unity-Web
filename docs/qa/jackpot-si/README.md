# SI・3D物理改修の検証

2026-10-16（日本時間）。物理iPhoneと実機の映像比較は未実施。

- `npm test`: 全137件成功（交流ゲーム・CPU・旧物理18件を含む）。SI物理11件：実球質量、レールの連続性、全段の実開口への落下、高速横断での誤入賞防止、閉ゲートの衝突、同一球の段間連続性、30/120fps呼び出し時の決定論、エネルギー、複数玉の台帳、検証権限。
- `python3 test/bonus_lifecycle_check.py --url http://127.0.0.1:3410`: 全4件成功。
- `JACKPOT_QA_URL=http://127.0.0.1:3410 python3 test/jackpot_si_browser_check.py`: 375/390/414pxの単発・長押し・停止・blur・再挑戦、JSON輸出入リプレイ、設定保存・再読込。report.jsonを参照。
- `test/jackpot_si_stages_check.py`: 全3段の当たり穴・外れ穴をブラウザ操作で確認。stage-checks.json。
- `node tools/check-jackpot-flow.mjs`: 通常の発射のみ、5シード×100玉。全500玉が決着し、全シードで3段突破。natural-flow.json。ゲーム独自の練習設定であり実機の確率ではない。1玉は皿内時間上限で保護回収された。
- `test/jackpot_si_worker_check.py`: ブラウザWorker起動直後の開始指示を取りこぼさず、近似1000回完了→物理試行の進行→キャンセルを確認。worker-check.json。
- スクリーンショット `si-overview-375/390/414.png` は最終モデルの盤面。`verify-full-*` は操作検証の全画面。

クラウドChromium＋SwiftShaderはソフトウェア描画。約8〜19FPSの観測であり、スマホの性能保証にはならない。実機SafariのGPU性能・音・持続操作・温度と、実機パチンコとの軌道比較は未確認。
