export const money = n => (n / 100).toLocaleString('ja-JP', {
  minimumFractionDigits: n % 100 ? 2 : 0,
  maximumFractionDigits: 2
});
export const names = {
  player: 'PLAYER',
  banker: 'BANKER',
  tie: 'TIE'
};
export const errors = {
  SAVE: '保存できませんでした。容量やブラウザの設定をご確認ください。直前までの残高は保持しています。',
  FUNDS: '利用できるチップが足りません。ベットを減らしてください。',
  MAX: 'ベット上限に達しています。別の賭け先か小さい額を選んでください。',
  MIN: 'このテーブルの最低ベット以上のチップを選んでください。',
  EMPTY: 'チップを選んで、賭け先へ置いてください。',
  PREVIOUS: 'まだ前回のベットがありません。',
  TARGET: '先に賭け先を選んでください。',
  PHASE: 'この操作はベット受付中に行えます。',
  AMOUNT: '利用できる額面を選んでください。'
};
export function element(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
