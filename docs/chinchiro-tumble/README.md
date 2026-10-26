# 喫茶Unity：金属骰子の投擲改修（2026-10-26）

> この皿を動かす版はユーザーの指示で撤回。[固定皿の改修](../chinchiro-fixed-dish/README.md)へ置き換える。以下は旧版の調査・検証記録。

皿を振る規定運動と実際の物理接触で、一投約5秒の体験を作った。金属の自由落下だけが5秒続くという主張ではない。重力・骰子の質量・摩擦・反発は維持し、出目による軌道操作や最低5秒の結果待ちはない。

- [音付き・通常速度の実プレイ動画](../qa/chinchiro-tumble/video/play.mp4)
- [調査・数式・仮定・変更理由](RESEARCH.md)
- [500投の生データ](../qa/chinchiro-tumble/survey-500.json)
- [スマホ3幅](../qa/chinchiro-tumble/browser/browser.json) / [CPU対戦完走](../qa/chinchiro-tumble/match/browser.json)
- [接触音・投擲中OFFの実波形検査](../qa/chinchiro-tumble/audio-browser.json)
- [検証概要](../qa/chinchiro-tumble/verification.json)

## 結果

全257テスト成功。500投の有効投擲は449、斜め停止・重なり46、場外5、未停止0。有効投擲の確定まで平均4.905秒、p95 5.167秒（前版は全投平均0.889秒）。無効率10.2%で、前版の10.6%とほぼ同程度。

2〜3.5秒の間にも全500投で動きと接触があり、374投で少なくとも1個の上面が変わった。387投で1rad以上の姿勢変化。全骰子が毎回5秒回転し続ける保証ではない。

底の三角形接触の支持抜けを再現し、共通寸法の中実円柱と曲面へ分離。さらに端の支持抜けをseed1024/1097で再現し、接触予測距離を0.1→2mmに修正した。500投では底の内側109mm半径の監視で床下への中心侵入0件。端の別途回帰テストも成功。全領域・全初期条件の完全な証明ではない。

375/390/414pxで表示と衝突位置の一致、休止・再開、縮小動作、横はみ出しなし。390pxでCPU4局・精算・再試合・投擲途中の再開始を確認。音OFFは物理動作が継続中にも音源停止・PCM無音を確認した。初回OFF検査はAudioParam内部値の厳密一致でタイムアウトしたため、診断で内部値0を確認後、実際の音源停止・波形の無音を確認する検査へ改めた。音の製品コード変更はない。

録画環境はChromiumソフトウェアGPUで約11.2fps。実操作で完了した3投の壁時計時間は約5.26／5.35／4.92秒。通常速度・実音の同一MediaRecorder収録であり、速度変更や別音源への差替えはない。**滑らかさは実機で未確認**。物理iPhone Safari、実材の摩擦・反発・音の測定校正、アクセス制限された参考サイトとの直接比較は未確認。

## 起動と調整

```sh
PORT=3482 DATA_PATH=/tmp/chinchiro-tumble.sqlite npm start
npm test
node scripts/chinchiro-dice-survey.mjs 500 /tmp/chinchiro-survey.json
python test/chinchiro_tumble_browser.py --url http://localhost:3482
python scripts/chinchiro-metal-capture.py --seconds 20 --output /tmp/chinchiro-video
```

接触・投擲設定はpublic/chinchiro/src/dice-physics.js、皿の規定運動はbowl-motion.js、寸法はdice-geometry.js。bowlMotionSeconds:0で静止皿の基礎試験ができる。参考質量約3.32kgの皿を運動学的剛体として動かすため、手や皿の反作用・弾性変形は省略している。人とCPUの条件は同じ。

本番反映は2026-10-26に許可を受領。公開URLは https://unity-mix.onrender.com/chinchiro/index.html 。この文書は公開前の検証記録。レトロ版・交流ゲーム・通信処理・公開停止中の役物・共有ライブラリは変更なし。
