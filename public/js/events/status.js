const messages=Object.freeze({
 event_begin:'回答時間が始まりました。',event_answer:'回答を受け付けました。',event_close:'回答を締め切りました。',event_reveal:'回答を公開しました。',
 event_next:'次のお題へ進みます。',event_end:'ゲームを終了しました。',event_switch:'ゲームを切り替えました。',event_config:'設定を保存しました。',
 event_teams:'チーム分けを保存しました。',event_hide:'回答を非表示にしました。',event_vote:'予想を受け付けました。',event_solution:'正解を公開しました。',
 event_next_item:'次の回答を表示します。',event_question:'お題を保存しました。',event_cafe_draft:'チームの下書きを共有しました。',event_approve:'回答を承認しました。',event_kick:'参加者を退出させました。'
});

export function acknowledgementMessage(action){return messages[action]||'操作を受け付けました。';}
