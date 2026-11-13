# Unity 麻雀

`/mahjong/index.html` から起動する、キャラクター選択付きの四人打ちリーチ麻雀です。ひとり用は選んだキャラクターを自分として、残る3席をCPUが担当します。友人対局は4人の人間が同じルームコードへ参加し、4人全員が準備完了してからホストが開始します。CPU補充はありません。

## 遊び方

1. ホームの「麻雀」からゲームを開きます。
2. キャラクターを選び、「CPUと対局」または「友だちと対局」を選択します。
3. 手牌をタップして選び、「選んだ牌を切る」を押します。ロン、ツモ、鳴き、リーチなどは、その局面で可能な操作だけ表示します。
4. 人間同士の対局では、作成者が4桁コードを共有し、4人全員が「準備できた」状態にしてから開始します。
5. 手牌は左右にスクロールできます。ツモ牌には印が付き、キーボードの左右キーでも牌を選べます。初回操作で音を有効にでき、設定から動きを減らせます。

対局は東風戦、25000点持ち、30000点返し、喰いタン・赤ドラありです。連荘で長引く場合も最大12局で終了します。チー・ポン・大明槓・暗槓・加槓・加槓への槍槓に対応し、4人立直・4風連打はロンや鳴きの応答後に途中流局します。九種九牌は、本人の初回打牌前でまだ誰も副露していないとき、么九牌・字牌の種類が9種以上あれば宣言できます。ダブル立直は本人の最初の打牌で、途中に鳴きがなく、誰も副露していない場合だけ成立します。天和・地和を実装し、国士13面・四暗刻単騎・純正九蓮宝燈・大四喜はダブル役満、複合役満は加算します。流局時は親が移る場合も本場が1つ増えます。流し満貫は、流局まで誰にも槓を含む面子がなく、本人の全河が么九牌・字牌で、河の牌を鳴かれていない席に成立します。複数成立時は各成立者が互いを含む他の3席から満貫ツモ相当を受け取り、本場も各精算に加算します。立直棒は同時成立者の席順で最初の席が一括して受け取ります。槓は同局で合計4回までで、残り牌がない局面では宣言できません。持ち時間は各操作30秒で、時間切れの打牌はツモ切り、ロンや鳴きは見送ります。通信再送の重複判定IDは、席ごとに直近256件の成功操作を保持します。それより古い再送は、元のrevisionを送る限り古い状態として拒否されます。待合室では退出した席を再利用でき、作成者が退出すると残った参加者へ開始権限を渡します。対局中は同じブラウザで再接続できます。ルームは最長6時間で期限切れになりますが、無料構成のRenderではサービス再起動時に一時データが失われる可能性があります。

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
- `src/mahjong/reference-ai.js`: Kobalab AIへ自分の手牌と公開情報だけを渡すアダプター。副露表記とツモ牌を正しく渡し、打牌・鳴き・加槓・暗槓の推薦はUnity MIXの合法アクションに一致した場合だけ採用
- `public/mahjong/assets/kobalab/`: MIT表記付きのローカル牌画像・局面音声
- `public/mahjong/vendor/majiang-ai.bundle.js`: 固定したMIT版AIをオフライン利用できるようブラウザー用にbundle
- 参考実装のライセンス・技術比較: [REFERENCE_REVIEW.md](REFERENCE_REVIEW.md)

4人のオリジナル立ち絵を選択画面と対局画面に表示します。キャラクターごとに思考の傾向がわずかに違い、配牌やルールを操作しませんが、判断差が勝敗へ影響することはあります。作画素材の生成記録とトリミング方針は [ARTWORK.md](ARTWORK.md) を参照してください。リーチ後は、ツモ牌で成立し待ちが変わらない暗槓のみ許可します。暗槓への国士無双の槍槓に対応します。槓の補充牌を取れないときは槓を選べません。CPUの打牌・鳴き判断はKobalab AI 1.2.0を参考情報と公開河から動かし、推薦がUnity MIXの合法アクションに一致した場合だけ採用します。鳴き・加槓・暗槓の判断、リーチ者の危険牌、現物情報も渡します。アダプターはピン留めしたKobalab AI 1.2.0の内部状態フィールドを利用するため、依存更新時は回帰テストが必要です。伏せ牌・王牌・未公開の槓ドラ表示牌はAIへ渡しません。アダプター失敗時は既存の安全なCPU方針へ戻ります。対局音はMIT表記付きのKobalab同梱WAVを、ユーザー操作で再開したWeb Audio経由で再生します。iPhone Safari実機では未確認です。端末の音声機能が使えない場合はWeb Audioの短い生成音を代替し、キャラクターボイスはありません。

## 確認記録

- 2026-11-13 quality pass: `npm test` 724 tests passed, 0 failed. Added regressions for Tenhou/Chiihou, standard double-yakuman waits and ambiguous hand selection, five-limit settlement through a match, reference-AI kakan/ankan and all open meld notation, red-five mapping, 44px settings targets, wrapping opponent metadata, and every displayed Japanese yaku label; the former thirteen-orphans single-yakuman fixture now uses a true single wait.
- Differential check: 3,000 and 10,000 seeded generated closed standard hands, with random round/seat winds and alternating ron/tsumo, matched the pinned Kobalab core on every scored case (0 mismatches; 764 and 2,524 hands respectively had no yaku in both scorers). The 3,000-case check exposed double-yakuman wait rules that were then corrected. This smoke test does not cover calls, dora, or all rule variants. Reproduce with `node tools/mahjong-score-differential.mjs --samples=10000 --seed=877233`; reports: [3,000 cases](../qa/mahjong-quality-20261111/mahjong-score-diff-3000.json), [10,000 cases](../qa/mahjong-quality-20261111/mahjong-score-diff-10000.json).
- Updated Chromium CPU hand-result screens at 375/390/414px and four-browser online first-discard synchronization at 390px: [375](../qa/mahjong-quality-20261111/mahjong-result-375.png), [390](../qa/mahjong-quality-20261111/mahjong-result-390.png), [414](../qa/mahjong-quality-20261111/mahjong-result-414.png), [online room](../qa/mahjong-quality-20261111/mahjong-online-390-seat-1.png). No page errors or horizontal overflow occurred.
- Updated hand-result presentation now shows the actual Japanese yaku and distinguishes stacked/double yakuman. Chromium result-screen checks at 375/390/414px show no horizontal overflow; 44px minimum settings target is retained: [375](../qa/mahjong-quality-20261111/mahjong-result-yaku-current-375.png), [390](../qa/mahjong-quality-20261111/mahjong-result-yaku-current-390.png), [414](../qa/mahjong-quality-20261111/mahjong-result-yaku-current-414.png).
- Live table check at 375/390/414px: opponent point/hand labels render at 11px, wrap as intact fields, every setting control is at least 44×44px, document width equals viewport, and no browser errors occurred: [375](../qa/mahjong-quality-20261111/mahjong-live-table-readable-375.png), [390](../qa/mahjong-quality-20261111/mahjong-live-table-readable-390.png), [414](../qa/mahjong-quality-20261111/mahjong-live-table-readable-414.png).
- Point totals use grouped thousands for quicker scanning (`25,000点`); verified in CPU match screens at [375](../qa/mahjong-quality-20261111/mahjong-points-grouped-375.png), [390](../qa/mahjong-quality-20261111/mahjong-points-grouped-390.png), and [414](../qa/mahjong-quality-20261111/mahjong-points-grouped-414.png).
- A four-client 390px online QA run completed a full hand: all screens showed the same exhaustive result, 70 discard tiles and zero score transfers, with no browser errors: [capture](../qa/mahjong-quality-20261111/mahjong-online-full-hand-390.png) and [record](../qa/mahjong-quality-20261111/mahjong-online-full-hand-390.json).
- A mobile CPU East-only game reached final standings. Signed point totals conserved 100,000 points, the UI stayed within 390px, and there were no browser errors: [capture](../qa/mahjong-quality-20261111/mahjong-cpu-complete-match-390.png) and [record](../qa/mahjong-quality-20261111/mahjong-cpu-complete-match-390.json).
- At 375px, selected and discarded one tile in a live CPU game, waited for all CPU responses, and returned to the player's next turn with one own-river tile, 14 own tiles, 11px opponent metadata, no horizontal overflow, and no page errors: [first-discard flow](../qa/mahjong-quality-20261111/mahjong-live-first-discard-readable-375.png).
- Seeded 100-match run after the reference-AI meld fix terminated all 100 matches over 585 hands and 34,153 transitions. It checked 33,568 legal actions, 34,153 revisions, and point conservation at 34,253 snapshots; it recorded 582 chi, 651 pon, 33 kakan, 31 ankan, and 12 open kan actions. This tests legal progression and accounting, not CPU strength or competitive win rate: [report](../qa/mahjong-quality-20261111/mahjong-selfplay-100-open-chi-fix.json).
- Compact tile browser check: at 375px river art is 12×18 and dora is 21×29; at 390/414px river art is 15×21 and dora is 21×29. See [375](../qa/mahjong-quality-20261111/mahjong-compact-375.png), [390](../qa/mahjong-quality-20261111/mahjong-compact-390.png), [414](../qa/mahjong-quality-20261111/mahjong-compact-414.png). The physical iPhone/Safari output remains unverified.
- `npm test`: 648 tests passed, 0 failed in the 2026-11-10 reference-upgrade pass. Tests that bind local TCP ports require an execution environment that permits loopback listeners.
- Post-rule CPU simulation: 10 seeded matches terminated, 60 hands and 4,132 transitions; 4,072 legal actions checked and points conserved on 4,142 snapshots. Outcomes were 39 wins, 19 exhaustive draws, 2 abortive draws, and no nagashi mangan. One CPU chose nine-terminals. The sample validates progression stability only, not CPU strength or rare-rule frequency; report: [simulation JSON](../qa/mahjong-quality-20261111/mahjong-selfplay-10-followup.json).
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

### 2026-11-13 最終QA追記

- 改修後の全リポジトリテスト: `npm test` 726件成功・失敗0。対象高さのUI回帰、Service Worker v64、麻雀ロジック、サーバー/通信、他ゲームの回帰を含みます。
- 役計算差分: 固定したKobalabスコア実装に対し、閉じ手50,000件と副露手10,000件を比較し、採点対象・不採点双方で差異0。副露手にはチー・ポン・槓、ロン・ツモを含みます。
- 300試合の決定論的CPU自己対局: 300/300完了、1,706局、100,268遷移。合法手98,562件、revision単調増加100,268件、持ち点保存100,568件を検証。これはルール進行と安定性の確認であり、CPUの強さ評価ではありません。詳細: [300試合の機械可読レポート](../qa/mahjong-quality-20261111/mahjong-formal-selfplay-300.json)。
- 390px ChromiumでCPU東風戦を終了までプレイし、点数合計100,000点・画面エラーなしを確認。4ブラウザのオンライン対局では一局を流局まで進め、全員に同一の河・局結果・点数差を表示。資料: [CPU完了対局](../qa/mahjong-quality-20261111/mahjong-cpu-complete-match-390.png)、[4人オンライン流局](../qa/mahjong-quality-20261111/mahjong-online-full-hand-390.png)。
- オフライン: 新規ChromiumプロファイルでホームからService Worker v64をインストール後、通信を切って`/mahjong/`へ直接移動しCPU対局を開始。14枚の牌画像、25,000点表示、幅390px、通信失敗0・JavaScriptエラー0を確認。[結果画像](../qa/mahjong-quality-20261111/mahjong-cold-offline-direct-390.png)、[測定値](../qa/mahjong-quality-20261111/mahjong-cold-offline-direct.json)。
- モバイル: 375/390/414pxで横はみ出しなし。375×667と320×720では固定打牌欄が手牌を覆わないよう通常配置へ変更し、375×667で選択・打牌・CPU応答まで操作。[短い画面の測定](../qa/mahjong-quality-20261111/mahjong-mobile-height-overlap.json)、[打牌後](../qa/mahjong-quality-20261111/mahjong-mobile-375x667-after-discard.png)。
- 実機iPhone Safari・実機音声の主観確認は未実施。
