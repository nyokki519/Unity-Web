# 喫茶Unity：固定した皿でサイコロを転がす改修（2026-10-26）

皿を動かす前版を撤回。皿は完全に固定し、初回の投げ入れ後は重力・接触だけでサイコロが跳ね、回転して止まる。

**毎回3〜5秒の転がりは達成していない。** 有効投擲の確定まで平均1.557秒、p95 1.758秒。0.45秒の静止確認を含む。時間を延ばすための皿の移動、追加の蹴り、スローモーション、結果待ちタイマーはない。実物の同条件での転がり時間に校正したとも扱わない。

## 見る・調べる

- [音付き・通常速度の実操作動画](../qa/chinchiro-fixed-dish/video/play.mp4)
- [調査・単位変換・形状・仮定](RESEARCH.md)
- [500投の全結果](../qa/chinchiro-fixed-dish/survey-500.json)
- [500投の全域支持検査](../qa/chinchiro-fixed-dish/support-audit-500.json)
- [スマホ3幅と固定皿の検査](../qa/chinchiro-fixed-dish/browser/browser.json)
- [CPU4局・再試合](../qa/chinchiro-fixed-dish/match/browser.json)
- [実接触音・投擲中OFFの波形検査](../qa/chinchiro-fixed-dish/audio-browser.json)
- [検証概要](../qa/chinchiro-fixed-dish/verification.json)

## 何を直したか

- 皿を固定剛体へ変更し、規定運動コードを撤去。
- 角の表示メッシュは厳密な凸面ではなかったため、サイコロの衝突には同じ頂点から正しい凸包を作る。
- 皿の壁と縁は表示と共通断面の厚み付き凸立体にし、薄い面を通り抜ける方式をやめる。
- 小さな剛体を安定して解くため、計算内をcmへ変換。設定・描画・検査はSI。重力、密度、慣性、力も一貫して変換し、時刻と角速度は変えない。
- 初期の横速度と回転を手から転がして投げる条件に合わせ、任意の速度減衰を除去。CPUと人間で同条件。

## 検証

全266テスト成功。500投中、有効492、場外8、曖昧停止・未停止0。499投で最初の皿接触から150ms以降にも少なくとも1個の上面が切り替わった。皿の移動は0。

別の500投検査では、全ての物理tickで実際の金属コライダー内部への中心侵入と、皿の内側での底抜けを調べ、どちらも0件。実際の金属を点照会で検出する正の対照を確認し、音の観察処理を省いても3つの対照シードで位置・結果が完全一致することを確認した。これは全初期条件の数学的な保証や、微小な接触誤差が全くないことの証明ではない。

放出後の総機械エネルギーの記録上の最大比は初期の0.999956倍。位置・速度・質量・慣性のSI整合、自由落下、単一点の反発、着地後の回転、旧不具合シード、二重送信を含む既存機能を検査。CPU4局、精算、再試合、投擲途中の再開始、375／390／414px、休止・再開、縮小動作、音のON/OFFを確認した。

実操作動画は実際のCanvasとWeb Audioを同じMediaRecorderで収録し、速度変更・音源差替えなし。録画環境はChromiumのソフトウェアGPUで約16.2fps。物理iPhoneや実GPUの性能とは区別する。

## 未確認事項

真鍮と鋼の反発・摩擦の実測校正、実物動画との定量比較、物理iPhone Safari、60fpsの実機性能。材質値は設計仮定。特に3〜5秒という希望時間に合わせて現実の動きを再現できたとは主張しない。

## 起動・公開

```sh
PORT=3482 DATA_PATH=/tmp/chinchiro-fixed.sqlite npm start
npm test
node scripts/chinchiro-dice-survey.mjs 500 /tmp/chinchiro-survey.json
node scripts/chinchiro-support-audit.mjs 500 /tmp/chinchiro-support.json
python test/chinchiro_tumble_browser.py --url http://localhost:3482
```

公開先： https://unity-mix.onrender.com/chinchiro/index.html 。本番反映はユーザーが許可済み。この文書は公開前の検証記録。既存レトロ版、交流ゲーム、通信処理、公開停止中の役物、共有ライブラリは変更なし。
