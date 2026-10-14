# イベントゲーム実装の判断記録

ユーザーの省エネ・簡潔な報告の希望に合わせ、作業上の判断をここに保持します。

- Ruling: use a local ledger and task test logs because cloud skill script resources are not executable filesystem packages — equivalent progress retained — cost: less helper automation.

- Ruling: event phase lives in room.event; room.phase EVENT or FINAL, existing round cleared when entering events — keeps legacy renderer and summary isolated — cost: migration must be tested.

- Ruling: Tasks 1/2 committed together because Task 1's meaningful deadline test requires an actual individual result; data and validation were prepared together — cost: commit boundaries less granular, tests remain separate.

- Ruling: anonymous games default to one round, WHO samples at most six answers and STORY four, with host-adjustable 1–15 sample size — 15 full stories at 120s each cannot meet the requested 10–20 minute game; explicitly explain randomized selection and unrevealed answers in rules — cost: not every submitted story is discussed in a round.

- Ruling: imports of the initial fixture registered duplicate tests; moved fixture into events-helper.js — makes reported test counts accurate — cost: none to application behavior.

- Ruling: overlap the one read-only whole-branch reviewer with the remaining long browser validation — implementation is committed and unchanged, final completion still requires both results — cost: reviewer sees provisional browser evidence; no completion claims before successful final run.

独立レビューのImportant4件は全件修正し、追加の旧モード選択干渉も再現テスト付きで修正しました。保留したMinorはありません。物理端末・外部ネットワークと新タスク復元は未確認です。
