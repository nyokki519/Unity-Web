import {el,button,field,labeledSelect} from '../dom.js';
export function guessingScreen(state,send,draft){const e=state.event,g=e.guess,wrap=el('section','event-reveal');
 if(!g)return wrap;wrap.append(el('p','eyebrow',`匿名の回答 ${g.index} / ${g.total}`));
 if(g.item.hidden){wrap.append(el('p','','この回答は司会が非表示にしました。'));return wrap;}
 if(g.item.title)wrap.append(el('h2','',g.item.title));wrap.append(el('blockquote','event-story',g.item.text));
 if(g.solution){wrap.append(el('h2','',`${g.solution.name}さんのエピソード`),el('p','',`的中 ${g.solution.correct}人`),el('p','talk-prompt',`本人が話す時間：目安${g.talkSeconds}秒。話す・パスするのは自由です。`));}
 else if(e.phase==='GUESS_CLOSED')wrap.append(el('p','','予想を締め切りました。司会の正解公開を待ちましょう。'));
 else if(g.ownVote)wrap.append(el('p','answer-saved','予想を受理しました。正解公開を待ちましょう。'));
 else if(g.canVote){
  draft.vote??='';const select=labeledSelect('誰の回答だと思う？',[['','選んでください'],...g.candidates.map(c=>[c.id,c.name])],draft.vote,v=>{draft.vote=v;submit.disabled=!v;});select.querySelector('select').name='guess-person';const submit=button('予想を送る',()=>send('event_vote',{itemId:g.item.id,value:draft.vote}));submit.id='event-vote';submit.disabled=!draft.vote;wrap.append(select,submit,button('予想をパス',()=>send('event_vote',{itemId:g.item.id,skip:true}),'quiet-button'));
 }else wrap.append(el('p','muted',e.participating?'自分の回答には投票できません。正解公開を待ちましょう。':'今回は見学です。次のラウンドから参加できます。'));
 const progress=el('p','small muted',`予想済み ${g.voteCount}人。回答者情報は正解公開後に表示されます。`);progress.id='guess-progress';progress.setAttribute('role','status');wrap.append(progress);return wrap;
}
