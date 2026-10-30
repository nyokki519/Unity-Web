# 公開確認 — 2026-10-30

https://unity-mix.onrender.com/baccarat/index.html

実装コミット3df074eをmainへfast-forward pushし、Renderの公開を確認。変更したsalon-squeeze.jsのSHA256一致を待ってから検証した。

- public/baccarat/ 全217ファイルをHTTP取得し、手元のSHA256と全件一致。[結果](results/production-assets.json)
- 公開URLで方向別22項目成功。マウス/WebGLとタッチ/軽減表示で全8方向、戻し、つかみ直し、キャンセル、カード外、公開と精算を確認。
- 同じ公開URLで従来の14グループ成功。コミッション、タイ返却、第三カード、保存失敗・再試行・再読込・モーダル・スマホ配置を確認。[実行ログ](results/production-browser.txt)
- 実機iPhone/Safariは未確認。Chromiumのタッチエミュレーションである。

記録追加はゲームファイルを変更しない。残高・ルール・保存・精算のコードは今回変更していない。
