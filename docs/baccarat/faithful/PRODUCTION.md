# 本番確認 — 2026-10-29

URL: https://unity-mix.onrender.com/baccarat/index.html

ゲーム実装コミット: `fcbbe4d052edc5f102c6fbb9fcd5e3113feb39ef`。mainへ通常のfast-forward push後、Renderの自動公開を確認。最初の照合は配備前の旧版だったため不一致、その後新版の配信を待って全件再検証した。

- public/baccarat/ の全190ファイル（フォント・ライセンスを含む）をHTTPで取得し、SHA256が手元と全件一致。[結果](results/production-assets.json)
- 公開URLでベット→第三カード→結果→精算→リベット、375/390/414pxとPC、再読込を確認。
- 公開URLで保存失敗4境界、ストレージ容量不足/拒否、必須ライブラリ/素材不足、中断・精算再試行・音設定中の配札を確認。二重精算なし。[実行ログ](results/production-browser.txt)
- 同じ本番URLでUnity MIX作成フォーム、チンチロ投擲/残高保存、レトロ単発/200枚消費、シューティング実射撃、mechanical410を確認。JavaScript例外なし。
- [本番390px](production-390.png) を目視確認。全てChromiumによる検証で、物理iPhoneではない。

ゲームコードを変えないこの公開記録の追加後も同じ成果物を配信する。性能・原典との差・実機未確認事項は[README](README.md)を参照。
