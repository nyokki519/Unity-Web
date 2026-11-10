# Unity 麻雀

`/mahjong/index.html` から起動する、キャラクター選択付きの四人打ちリーチ麻雀です。ひとり用は選んだキャラクターを自分として、残る3席をCPUが担当します。友人対局は4人の人間が同じルームコードへ参加し、4人全員が準備完了してからホストが開始します。CPU補充はありません。

## 遊び方

1. ホームの「麻雀」からゲームを開きます。
2. キャラクターを選び、「CPUと対局」または「友だちと対局」を選択します。
3. 手牌をタップして選び、「選んだ牌を切る」を押します。ロン、ツモ、鳴き、リーチなどは、その局面で可能な操作だけ表示します。
4. 人間同士の対局では、作成者が4桁コードを共有し、4人全員が「準備できた」状態にしてから開始します。
5. 手牌は左右にスクロールできます。ツモ牌には印が付き、キーボードの左右キーでも牌を選べます。初回操作で音を有効にでき、設定から動きを減らせます。

対局は東風戦、25000点持ち、30000点返し、喰いタン・赤ドラありです。連荘で長引く場合も最大12局で終了します。チー・ポン・大明槓・暗槓・加槓・加槓への槍槓に対応します。残り牌がない局面では槓を宣言できません。持ち時間は各操作30秒で、時間切れの打牌はツモ切り、ロンや鳴きは見送ります。待合室では退出した席を再利用でき、作成者が退出すると残った参加者へ開始権限を渡します。対局中は同じブラウザで再接続できます。ルームは最長6時間で期限切れになりますが、無料構成のRenderではサービス再起動時に一時データが失われる可能性があります。

## 開発・テスト

```sh
npm install
npm test
npm start
```

ゲームURLは `http://localhost:3000/mahjong/index.html` です。4人のオンライン確認には4つのブラウザまたはプライベートウィンドウを使い、同じルームコードで参加します。

## 構成

- `src/mahjong/`: サーバー権威の牌山、手牌、役・符・点数計算、局進行、CPU判断、クライアント向け秘匿ビュー
- `public/mahjong/`: 日本語画面、4名のオリジナル生成立ち絵、CPU接続、WebSocket通信
- `src/mahjong/service.js`: ルーム、権限、締切、復帰、6時間の期限切れ
- `src/mahjong/store.js`: 既存DBと分離した `mahjong_rooms` 名前空間
- `public/mahjong/src/tile-art.js`: 参照元の牌画像をローカル表示し、日本語アクセシブル名を付与
- `src/mahjong/reference-ai.js`: Kobalab AIへ自分の手牌と公開情報だけを渡すアダプター。AI推薦はUnity MIXの合法アクションに一致した場合だけ採用
- `public/mahjong/assets/kobalab/`: MIT表記付きのローカル牌画像・局面音声
- `public/mahjong/vendor/majiang-ai.bundle.js`: 固定したMIT版AIをオフライン利用できるようブラウザー用にbundle
- 参考実装のライセンス・技術比較: [REFERENCE_REVIEW.md](REFERENCE_REVIEW.md)

4人のオリジナル立ち絵を選択画面と対局画面に表示します。キャラクターごとに思考の傾向がわずかに違い、配牌やルールを操作しませんが、判断差が勝敗へ影響することはあります。作画素材の生成記録とトリミング方針は [ARTWORK.md](ARTWORK.md) を参照してください。リーチ後は、ツモ牌で成立し待ちが変わらない暗槓のみ許可します。暗槓への国士無双の槍槓に対応します。槓の補充牌を取れないときは槓を選べません。CPUの打牌・鳴き判断はKobalab AI 1.2.0を参考情報と公開河から動かし、推薦がUnity MIXの合法アクションに一致した場合だけ採用します。伏せ牌・王牌・未公開の槓ドラ表示牌はAIへ渡しません。アダプター失敗時は既存の安全なCPU方針へ戻ります。流し満貫など一部の細則は未実装です。対局音はMIT表記付きのKobalab同梱WAVを、最初の音声ボタン操作後に再生します。端末の音声機能が使えない場合はWeb Audioの短い生成音を代替し、キャラクターボイスはありません。

## 確認記録

- `npm test`: 648 tests passed, 0 failed in the 2026-11-10 reference-upgrade pass. Tests that bind local TCP ports require an execution environment that permits loopback listeners.
- Chromium 390×844: キャラクター選択、CPU対局開始、実打牌、CPU応答を確認。
- Chromium 375/390/414px: 4枚の新規立ち絵が768×960で読み込まれ、横はみ出しなし。390pxのCPU対局中の48×58アバターにも顔が収まる。
- Chromiumの4ブラウザ: ルーム作成・3人参加・全員準備・開始を確認。各ブラウザに自分の手牌のみ表示されることを確認。
- 画面証跡: [CPU対局](evidence/mahjong-cpu-turn-smoke.png)、[4人対局](evidence/mahjong-online-mobile-smoke.png)。
- 新しい立ち絵と対局表示：[375pxキャラクター選択](../qa/three-games-quality/mahjong-portrait-selection-375-rev2.png)、[390pxキャラクター選択](../qa/three-games-quality/mahjong-portrait-selection-390-rev2.png)、[414pxキャラクター選択](../qa/three-games-quality/mahjong-portrait-selection-414-rev2.png)、[390px CPU対局](../qa/three-games-quality/mahjong-cpu-table-390-rev2.png)。
- 実機iPhone Safariでは未確認。
- Chromium 375/390/414px：実CPU対局を局結果まで進め、和了・点数移動・次局ボタンを確認。390pxで次局ボタンが対局を再開することも確認（[375px](../qa/three-games-quality/mahjong-cpu-hand-result-375-rev3.png)、[390px](../qa/three-games-quality/mahjong-cpu-hand-result-390-rev3.png)、[414px](../qa/three-games-quality/mahjong-cpu-hand-result-414-rev3.png)）。流局時の聴牌表示と精算欄は同じ画面コードで描画され、実際の1局でも表示を確認。
- Chromium 390×844: Kobalabの牌画像15枚を読み込み、実打牌とCPU応答を確認。375/390/414pxで横はみ出しなし（[CPU対局390px](../qa/mahjong-kobalab-gradeup/cpu-390.png)、[打牌後390px](../qa/mahjong-kobalab-gradeup/cpu-after-discard-390.png)）。盤面の自作図形牌を実牌画像に切替え、局面別WAVを追加。音声の開始・消音時停止はテスト済みだが、実機スピーカーでの主観確認は未実施。
- CPU判断はKobalab AI 1.2.0から打牌・鳴きの提案を受け、Unity MIX側の合法手と一致する場合だけ採用。自分の手牌・公開河・公開副露だけを渡し、伏せ牌・牌山を変えても判断が変わらないテストを追加。CPU 4人の通し対局も合格。
- Chromium 375/390/414px: 改修後の対局盤、手牌、河、副露、打牌演出を確認。ページ幅は各ビューポートと一致し、手牌は画面幅に押しつぶされず横スクロール（[375px](../qa/mahjong-reference-upgrade/mahjong-updated-375.png)、[390px](../qa/mahjong-reference-upgrade/mahjong-updated-390.png)、[414px](../qa/mahjong-reference-upgrade/mahjong-updated-414.png)、[打牌演出](../qa/mahjong-reference-upgrade/mahjong-moment-discard-390.png)）。
- Chromiumの4ブラウザで、ルーム作成・4席参加・準備・開始・打牌同期を確認。各プレイヤーは自分の手牌のみを受け取り、他席には伏せ牌を表示（[4人対局](../qa/mahjong-reference-upgrade/mahjong-online-390.png)）。サービス・サーバービューの自動テストでもツモ牌の秘匿を確認。
- 本番URLで更新済みJS/CSS/SVG・Service Worker v60をHTTP確認。390px相当でCPU対局開始・打牌・CPU応答、横幅390px、ブラウザーエラーなしを確認（[本番CPU対局](../qa/mahjong-reference-upgrade/mahjong-production-390.png)）。
- 本番待合室の準備後に待合室から対局画面へ誤遷移する問題を確認。LOBBY受信時の画面判定を直し、準備済み表示と4人待機が続く回帰テストを追加。
- 修正後の本番4ブラウザ検証: 4席参加・全員準備・司会の開始ボタン有効化まで同期。全画面390px幅で横はみ出しなし、検証参加者は待合室から退出（[本番待合室](../qa/mahjong-reference-upgrade/mahjong-production-online-390.png)）。
- CPUの300戦シード付きストレステスト: 132,792手順・2,038局を実行。平均442.6手順・6.79局、最短163・最長1,011手順。5,319回の鳴き候補を含め、全遷移で合法アクション・revision増加・終局・持ち点合計100,000点を確認。流局は36.3%。これはループ・合法性・点数保存の確認で、CPUの強さや実戦勝率の評価ではありません。実機iPhone Safariと実機音声の主観評価は未実施。
