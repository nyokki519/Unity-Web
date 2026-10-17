# 最高画質を初期設定へ

スマホでは初期quality=1、DPR上限1.5で、さらに低FPS時の自動降格が有効だった。初期quality=2とqualityLocked=trueへ変更し、親画面の選択も「最高画質」に同期した。低FPSだけで最高画質を落とさない。「自動」「省電力」は手動で選べる。

最高品質：端末DPRを上限4まで使用、4x MSAA（端末上限以下）、輪郭補正有効、影4096、ソフトシャドウ、テクスチャ異方性16（GPU対応上限にクランプ）。画質変更時にマルチサンプル用ターゲットを再確保し、描画と後処理の解像度を合わせる。元画像に存在しない細部を生成する変更ではない。

検証：Node178件成功。390×844・deviceScaleFactor=3のChromiumで、iframeの390×644に対して描画1170×1932、quality=2、固定ON、samples=4、anisotropy=16を確認。低→高の手動切替とDPR復帰、旧キャッシュからの更新・オフライン取得も成功。結果は `docs/qa/ultra-quality/report.json`。物理iPhone Safariの描画・フレームレートおよびRender反映完了は未確認。
