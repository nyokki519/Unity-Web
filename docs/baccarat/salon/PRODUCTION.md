# 本番公開確認 — 2026-10-29

URL: https://unity-mix.onrender.com/baccarat/index.html

実装コミット `71f196194f11619070e6955d72a0e754ba9bd1ae` をmainへfast-forward push、Render自動公開を確認。旧版配信中は判定を保留し、新しいindexの一致後に検証。

- public/baccarat/ 全216ファイルをHTTP取得し、手元のSHA256と全件一致。[ハッシュ](results/production-assets.json)
- ホームの紹介文も別途SHA256一致。[結果](results/production-home.json)
- 本番で新UI独立14グループの操作・精算・復旧・サイズ検証成功。[ログ](results/production-browser.txt)
- 同じ本番でUnity MIX作成/モード選択、チンチロ投擲/残高保存、レトロ単発/200枚消費、シューティング実射撃、mechanical410を確認。
- 390×844のChromiumタッチエミュレーションで実touchポインターを送り、絞り進捗0.4923、ドラッグ中のページスクロール不変、続く80msのボタンタッチで1回だけ精算。[測定](results/production-touch.json)、[実画面](production-squeeze-touch.png)。実機iPhoneではない。

従来の保存残高を使用するSession/Storeは変更していない。新画面に不具合がある場合も旧画面は classic.html / vesper.html に保管。今回の記録追加コミットはゲームファイルを変更しない。性能・権利・既知の未確認事項は[README](README.md)を参照。
