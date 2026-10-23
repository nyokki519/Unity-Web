# 起動・操作・再現

Node.js 24以上。既存依存のみ。

```sh
npm ci --ignore-scripts
PORT=3461 DATA_PATH=/tmp/unity-mechanical.sqlite npm start
```

`http://localhost:3461/mechanical/index.html`。ホームの「フィールダー」からも移動可能。既存レトロ版は従来の導線で維持。

250球で開始。強さのスライダー／±、一球発射（長押し連射）、自動発射。発射間隔0.6秒、同時球64個まで。始動口に入ると羽根開放。拾われた球が左のストッパー・揺動棚・バット、または右の近道から回転体へ進む。実際のV口通過で大当たり、左の開始スルーを通し、下部アタッカーへ発射を継続。賞球は入った球だけに加算。

視点は全体／役物／自動追尾／自由。ドラッグ回転、2本指またはShift＋ドラッグでパン、視点バーの上下と±。ページはスクロールでき、操作をSafari下端に固定しない。「画質：高」で軽量表示へ切り替え可能（物理は同一）。音OFF開始、動きを控えめにできる。タブ非表示で一時停止し、ボタンで再開。途中終了・再挑戦可能。

設定と理論根拠: `public/mechanical/src/config.js`、共有形状 `geometry.js`、可動部・磁気モデル `mechanisms.js`。磁力・角速度・傾斜・摩擦は推定値。実機の測定値と呼ばない。

遊び方の詳細からシードを指定し「この条件で最初から」。操作履歴をJSON保存。Nodeで`replaySession(data)`を呼ぶと同じ固定tick入力を再生できる（固定された同版のRapierが前提）。途中の検証球投入は通常操作ログの対象外。ブラウザの履歴インポートは未実装。

## 検証

```sh
npm test
python test/mechanical_browser.py --url http://127.0.0.1:3461
node scripts/mechanical-survey.mjs 10000 /tmp/normal-10000.json
node scripts/mechanical-sensitivity.mjs /tmp/magnet-sensitivity.json
python scripts/mechanical-performance.py --url http://127.0.0.1:3461
```

`?inspect=1`の「検証専用」で各地点へ球を投入できる。実物理の初期条件を変える操作で、当たりの強制ではない。V→開始→アタッカー確認はこの順に投入。通常発射の統計に混ぜない。

## 配信と切戻し

既存Docker/Render構成が`public/`を配信するため、新規サービス・APIキー・課金設定は不要。mainの既存自動デプロイを利用する。ヘルス`/api/health`、新作`/mechanical/index.html`、既存ホーム・レトロ版を確認する。障害時は本機能のコミットをrevertし、既存サービスを再デプロイ。サービス削除やキー再発行はしない。

公開確認はHTTP200だけで完了としない。JavaScript/WASM/音、実際の発射、既存ルーム参加を確認。接続制限で確認できなければ未確認と報告する。
