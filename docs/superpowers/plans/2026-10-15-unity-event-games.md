# Unity MIX Event Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution or superpowers:subagent-driven-development if the user selects delegation. Steps use checkbox syntax for tracking.

**Goal:** 既存MIXを維持し、対面イベント用6ゲームを複数人で遊べる状態まで追加する。

**Architecture:** Nodeの既存ルームにeventフィールドを追加し、イベント専用モジュールへ状態遷移とビュー生成を委譲する。既存モードと共通の入力・集計を再利用し、匿名予想とチーム相談はそれぞれ専用モジュールにする。

**Tech Stack:** Node.js 24以上、ES Modules、ws、qrcode、node:sqlite、node:test、Python Playwright／Chromium。

**Spec:** `docs/superpowers/specs/2026-10-15-unity-event-games-design.md`

## Global Constraints

- 対面の参加者6〜15人、各ゲーム10〜20分、登録不要、すべての回答と予想をスキップ可能。
- 既存ALIGN・PREDICT・LINE・RANK・AUCTION・QUICK、おまかせMIX、結果・共有を保持する。
- Node.js 24以上。新しい外部サービスや認証は追加しない。単一Nodeプロセス。
- 本番公開、Renderへのデプロイ、サイト削除、APIキー再発行、有料サービス契約は行わない。
- Unity Analytics、別サービスのQR、DROPは対象外。既存参加QRは継承する。
- 回答90秒、チーム相談180秒、予想45秒、体験談回答180秒を既定値とし、開始前に30〜600秒で設定できる。
- 短文120文字、共通点300文字、体験談600文字・見出し40文字、店名40文字・コンセプト300文字以内。
- チーム2〜4、カフェの標準予算100万円。司会切断後12秒で引継ぎ。
- 各ゲーム最低15題、共通点は各難易度最低5題。お題編集はルーム内のみ。
- 個別ランキングは本人のみ、境界線の分布は匿名、予想の正解は現在の一件だけ正解公開後に送る。
- ルームは最後の活動から24時間、終了後1時間で削除対象。
- 既存の隔離チェックアウトを使い、ユーザーが求めない限りworktreeを作らない。

## Review Focus

1. 非表示中の匿名回答が履歴・復帰ビュー・次の正解に再出現しないこと（Task 3）。
2. 司会が交代した直後に旧司会の進行コマンドが届いても進行しないこと（Task 1／6）。
3. チーム代表切断と締切が同時に起きても案が確定扱いにならず、復帰できること（Task 4）。
4. 日本語・絵文字の長文、名前、見出しが画面を押し広げず、文字数境界が一致すること（Task 5）。
5. 再接続直後に保存下書きと確定済みサーバー回答が異なる場合、確定済み回答を優先すること（Task 5／6）。

---

### Task 1: 共通状態とルーム統合

**Files:** Create `src/events/flow.js`, `src/events/view.js`, `src/events/catalog.js`, `test/events-flow.test.js`; Modify `src/engine.js`, `src/server.js`.

**Interfaces:**
- `createEvent(gameId, options, questions) -> EventState`：gameIdは `VALUES / WHO / BOUNDARY / QUEST / CAFE / STORY`、revision、phase、roundId、roundIndex、roundLimit、deadlineAt、answers、teams、historyを保持。
- `executeEvent(room, playerId, msg, now) -> void`：検証エラーは既存GameErrorで返す。
- `tickEvent(room, now) -> boolean`：締切で収集を閉じた場合true。
- `eventView(room, viewerId, now) -> object`：認証情報・生の回答辞書を含まない。
- 既存settingsにoptional `eventGame` と `eventOptions` を追加。未指定は既存動作。
- コマンド名は `event_config / event_begin / event_close / event_reveal / event_next / event_switch / event_end / event_answer / event_vote / event_solution / event_next_item / event_hide / event_kick / event_question / event_teams / event_cafe_draft / event_approve`。
- 進行コマンドは `roundId + revision` を要求する。回答・投票は `roundId + itemId(投票のみ)` を検証して一人一回受理する。回答による全体リビジョン更新で他の参加者の同時回答を拒否しない。

- [ ] `events-flow.test.js` にRULES→収集→締切→公開→次→終了、参加者の司会操作拒否、古い進行リビジョン拒否、二重回答拒否、未回答／スキップ区別の失敗テストを書く。
- [ ] `node --test test/events-flow.test.js` で未実装による失敗を確認する。
- [ ] 上記関数を実装し既存commandのロールバック・changed・tick・viewへ接続する。既存FINALとイベント終了状態を区別し、未公開回答を既存summaryへ渡さない。
- [ ] 退出・途中参加・司会引継ぎ・期限削除・SQLite再起動復帰をテストに追加し、新フィールドなしの旧ルームも読み込めることを確認する。
- [ ] `npm test` を実行し既存15テストと追加テストを通す。Task 1のファイルだけコミットする。

### Task 2: ランキング・境界線とお題基盤

**Files:** Create `src/events/individual.js`, `data/event-questions.json`, `test/events-individual.test.js`; Modify `src/events/catalog.js`, `src/events/flow.js`, `src/events/view.js`, `tools/check-questions.js`.

**Interfaces:**
- `validateEventQuestion(input) -> Question`：id、game、prompt、talkPrompt、difficulty、choices、必要なゲーム固有フィールドを検証。
- `questionsFor(event, gameId) -> Question[]`：ルームの追加・編集・無効化を反映。
- `validateIndividual(question, value) -> normalized value`、`individualResult(question, answers) -> public result`。
- VALUESは4〜5選択肢IDの順列、BOUNDARYは整数0〜100。VALUES公開結果は平均順位と匿名順位分布、BOUNDARYは匿名位置・平均・最小・最大。
- `event_question` は司会のみ、RULES／LOBBYで編集。稼働中のお題コピーを変更しない。

- [ ] 入力不正、締切前の回答非配信、VALUES個別順位の非配信、BOUNDARYのID非配信、ルームごとのお題編集を失敗テストにする。
- [ ] `node --test test/events-individual.test.js` で失敗確認。
- [ ] 既存RANK／LINEの検証・集計を再利用し、VALUESの分布を追加。両ゲームに15題以上を用意する。
- [ ] 残り4ゲームのデータ形式をcatalogで定義し、全体のお題検証を既存checkに追加する。
- [ ] `npm test && npm run check:questions` で既存252題も保持されていることを確認してコミットする。

### Task 3: 匿名予想と体験談

**Files:** Create `src/events/guessing.js`, `test/events-guessing.test.js`; Modify event flow/view/catalog/data。

**Interfaces:**
- `collectGuessItems(round) -> internal Item[]`：暗号学的乱数のitemId、ランダム順、内部ownerId。公開ビューはownerIdを削除。
- `validateNarrative(gameId, value) -> normalized narrative`：WHOは文字列120文字、STORYはtitle40文字とtext600文字。
- `openGuess(event, now) / closeGuess(event) / revealSolution(event) / nextGuessItem(event, now)`：各段階を検証して遷移。
- `guessView(event, viewerId) -> {item,canVote,ownVote,voteCount,solution,talkSeconds}`：現在の一件のみ。talkSecondsはWHO45、STORY120。
- 自分の回答には投票不可。候補一覧は全員共通。非表示の回答は結果・履歴・復帰ビューから除く。

- [ ] 本人投票拒否、他人にはownerIdなし、締切前のvote非配信、正解公開前のownerId非配信、現在以外の正解非配信を失敗テストにする。
- [ ] `node --test test/events-guessing.test.js` で失敗確認。
- [ ] 匿名予想の共通状態とWHO／STORYの異なる入力・会話時間を実装し、それぞれ15題を用意する。
- [ ] 司会が締切後に匿名内容を非表示にできるよう実装。現在表示中の非表示、全員スキップ、退出した回答者、SQLite復帰後の非表示維持をテストする。
- [ ] `npm test && npm run check:questions` を通してコミットする。

### Task 4: チームと共通点・カフェ

**Files:** Create `src/events/teams.js`, `src/events/team-games.js`, `test/events-teams.test.js`; Modify event flow/view/catalog/data。

**Interfaces:**
- `assignTeams(room, count, assignments?) -> Team[]`：2〜4チーム、memberIds、captainId。
- `refreshCaptains(room) -> boolean`：接続中の同チーム参加者に代表を移す。
- `validateTeamAnswer(gameId, question, value) -> normalized answer`。
- `cafeCost(question, selection) -> {total,remaining,overBudget}`：クライアントの価格を信用せず、サーバーの選択肢IDから計算。
- `teamGameView(room, viewerId) -> object`：同チームのカフェ下書きだけ収集中に配信。
- QUESTは代表の300文字回答と司会承認。CAFEはカテゴリ選択、店名、コンセプト、確定状態。

- [ ] 代表以外の提出拒否、非司会のチーム変更／承認拒否、他チーム下書き非配信、予算超過／不正ID拒否の失敗テストを書く。
- [ ] `node --test test/events-teams.test.js` で失敗確認。
- [ ] 均等自動分けと手動変更、代表引継ぎ、未確定案と確定済み案の区別を実装する。
- [ ] QUESTは3難易度×5題、CAFEは15の企画条件と各カテゴリの選択肢・費用を用意する。
- [ ] 6人／15人均等分け、途中参加の次ラウンド割当、代表切断と締切の競合、全員切断をテスト。`npm test && npm run check:questions` を通してコミットする。

### Task 5: 実際に遊べる画面と司会操作

**Files:** Create `public/js/events/screen.js`, `public/js/events/individual.js`, `public/js/events/guessing.js`, `public/js/events/teams.js`, `public/js/events/editor.js`, `public/js/events/host.js`, `test/events_browser_check.py`; Modify `public/js/app.js`, `public/js/home.js`, `public/js/lobby.js`, `public/js/realtime.js`, `public/js/answer.js`, `public/style.css`, `public/sw.js`。

**Interfaces:**
- `eventScreen({state,send,draft,catalog}) -> HTMLElement`。`state.event`の加工済みビューから描画。
- `updateEventScreen(state, offset) -> void`：サーバー時刻に基づくタイマー・人数更新。
- `eventQuestionEditor({state,send}) -> HTMLElement`：ゲーム固有フィールドも編集できる司会専用UI。
- `eventHostControls({state,send}) -> HTMLElement`：段階に応じた締切・公開・正解・次・非表示・退出・切替。
- 既存rank／line入力関数をexportし共有。既存MIXの順序・選択肢・画面を保つ。
- クライアントは現在roundId/revisionを進行送信に添付し、送信中の操作を抑止する。受理状態前に保存済み表示を出さない。

- [ ] ブラウザテストに6ゲームの選択・説明・入力・公開・次・終了のUIシナリオを作り、追加UI不在で失敗確認する。
- [ ] 個人ゲーム、匿名予想、チームゲームの画面を分離して実装。STORYに入力ガイド、CAFEに費用計算と超過表示、QUESTに難易度選択を付ける。
- [ ] 司会編集・追加・無効化、チーム分け、非表示・退出、ゲーム切替を実装する。
- [ ] 再接続、送信中／未送信／受理済み、確定回答優先、下書き保持とスキップを実装する。
- [ ] 深緑・アイボリー、390px、44pxボタン、長文折返し、キーボード、live status、動きを減らす設定とprefers-reduced-motionを整える。PWAキャッシュを更新する。
- [ ] `python3 test/events_browser_check.py --url http://127.0.0.1:3000` で日本語600文字・絵文字・長名、予算超過、司会操作、動き低減を検証しコミットする。

### Task 6: 実通信と複数ブラウザの完成検証

**Files:** Create `test/events-server.test.js`; Modify `test/events_browser_check.py`, 各eventテスト。

**Interfaces:** 既存 `createApp({database,countdownMs,hostGraceMs})`、実HTTPルームAPI、認証済みWebSocketを使用。独立ブラウザコンテキストは6／15個生成し、同一ブラウザの単一localStorageを使い回さない。

- [ ] 6人・15人の実WebSocketで全6ゲームの全段階、未回答者ありの締切、スキップ、二重送信、古い操作、権限制御を検証する。
- [ ] 各クライアントの全受信JSONを検査し、未公開他人回答・匿名対応表・他チーム下書き・非表示内容が漏れないことを検証する。
- [ ] 司会断と復帰、旧司会の遅延操作、途中参加・退出・再接続、SQLite同一DBでのプロセス再起動復帰を検証する。
- [ ] 6／15ブラウザで390pxの全ゲーム通し進行を検証。回答未送信状態での切断、リロード後の確定回答優先、ドラッグ／上下ボタン、長文・全員スキップを確認する。
- [ ] `npm test`, `npm run check:questions`, `python3 test/browser_check.py --url http://127.0.0.1:3000`, `python3 test/events_browser_check.py --url http://127.0.0.1:3000` を実行。失敗を診断して該当実装を修正し、影響範囲だけ再検証する。
- [ ] 実行ログ・スクリーンショット・JSON検査結果を今回の実行と対応づけて保存し、検証追加をコミットする。

### Task 7: 起動手順・レビューと引渡し

**Files:** Modify `README.md`, `docs/ARCHITECTURE.md`, `docs/QA.md`; Create `docs/EVENT-GAMES.md`。環境設定のinstall_script/start_skillは必要な差分がある場合のみ更新。

**Interfaces:** 手順は `/workspace/Unity-Web` で `npm ci --ignore-scripts --cache /workspace/.npm-cache`、`npm start`。公開要件はHTTPS/WSS、確認済みPUBLIC_URL、非公開永続DATA_PATH、単一プロセス。

- [ ] ゲームごとの進行・公開範囲・司会権限、保存24時間／終了後1時間、再接続と復旧を文書化する。
- [ ] 今回の実行結果から通過／失敗／未確認を記録。iPhone／Android実機、外部HTTPS/WSS、OS共有、会場Wi-Fiは未確認として残す。
- [ ] 変更差分を全体レビューし、未公開データ露出と既存機能退行を重点確認。選択した実行方法のレビュー工程に従う。
- [ ] `git diff --check` と必要な最終テストを実行し、文書をコミット。push、merge、Renderデプロイ、本番公開は行わない。
- [ ] 実装内容、6／15人・390pxの実検証結果、起動方法、外部設定、未確認事項を簡潔に報告する。
