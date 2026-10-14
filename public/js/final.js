import {el,button,title,eyebrow,bar,row,logo,toast} from './dom.js';
import {shareCard} from './share.js';
export function finalScreen({state,send,leave}){
 const screen=el('div','screen final-screen'),summary=state.summary;screen.append(logo(),title('TODAY’S MIX','違いを知ると、\n少し近くなる。','今日、意外だったことをひとつ。みんなで話してみよう。'));
 const stats=el('div','result-stats');stats.append(row('PEOPLE',summary.people),row('QUESTIONS',summary.questions),row('MINUTES',summary.minutes));screen.append(stats);
 const grids=el('div','mix-grid');for(const [key,label,subtitle]of [['group','OUR MIX','今日の、みんなの選択。'],['own','YOUR MIX','あなたの選択。あなただけに表示。']]){const data=summary[key],part=el('section','mix-panel');part.append(eyebrow(label),el('h2','',subtitle));for(const item of data.values.slice(0,6))part.append(bar(item.label,item.score,`${item.observations}回の回答に基づく${item.people?` / ${item.people}人`:''}`));if(!data.values.length)part.append(el('p','muted','このMIXでは、数値にする回答はありませんでした。会話の中に残った言葉を楽しんでください。'));part.append(el('p','mix-message',data.message),button(`${label} の共有カード ↗`,()=>shareCard(state,key).catch(()=>toast('カードを作れませんでした。接続を確認して、もう一度お試しください。')),'button secondary wide'));grids.append(part);}screen.append(grids);
 const note=el('details','summary-note');note.append(el('summary','','このまとめについて'),el('p','small muted',summary.note),el('p','small muted','個人のまとめは本人の端末だけへ送信します。ルームの記録は終了から1時間後に削除対象になります。'));screen.append(note);
 const actions=el('div','actions');if(state.hostId===state.selfId)actions.append(button('もう一度、MIXする →',()=>send('again')));else actions.append(el('p','small muted','ホストが「もう一度」を選ぶと、同じルームで遊べます。'));actions.append(button('ルームを終了してホームへ',leave,'button secondary'));screen.append(actions,el('p','serif closing-line','A little closer, every time.'));return screen;
}
