# 公開確認 — 2026-10-30

URL: https://unity-mix.onrender.com/baccarat/index.html

実装39e8412をmainへ通常push、Renderで新しいmainモジュールのSHA256一致を待った。

- public/baccarat/全220ファイルのSHA256が手元と一致。[結果](results/production-assets.json)
- Unity MIXホームのバカラ説明文もSHA256一致。操作順の説明だけ更新。
- 公開URLで14グループ、全方向22項目成功。追加のコイン積み上げ・5回の実タッチ、undo/reload、失敗したコイン保存の1回だけの再試行、375/390/414/PCも成功。[ログ](results/production-browser.txt)
- 元のロゴ/コイン画像を既定画面で使用せず、独自素材が表示されることをDOMでも確認。参考素材は旧画面保管用として維持。
- 実機iPhone/Safariは未確認。ブラウザのタッチエミュレーションである。

この公開記録はゲームコードを変更しない。卓の背景・配色・全方向絞り・ルール・残高・保存形式は維持。
