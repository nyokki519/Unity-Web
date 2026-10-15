import {formatScaleValue} from './scale.js';
import {el,button,title,eyebrow,logo,modeNames,labeledSelect,modal} from './dom.js';
import {answerRenderers} from './answer.js';
import {resultRenderers} from './results.js';
import {invitation} from './lobby.js';
export function hostControls({state,send,catalog}){
 const wrap=el('details','host-controls');wrap.append(el('summary','','進行を管理 / HOST'));const body=el('div','host-control-body');
 const actions=el('div','host-actions');actions.append(button(state.paused?'再開する':'一時停止',()=>send('pause'),'button secondary'),button('このお題をスキップ',()=>confirmAction('このお題をスキップしますか？','回答中の内容は集計せず、次のお題に進みます。',()=>send('skip')),'button secondary'));
 if(state.phase==='ANSWER'){actions.append(button('お題を変更',()=>confirmAction('お題を変更しますか？','このお題への回答はリセットされます。',()=>send('change_question')),'button secondary'),button('未接続の人を待機扱いに',()=>confirmAction('未接続の人を待機扱いにしますか？','未回答で切断中の参加者を、このお題のみパスとして進めます。',()=>send('exclude_offline')),'button secondary'));}
 actions.append(button('ゲームを終了',()=>confirmAction('ここまでのMIXをまとめますか？','公開済みの回答だけを集計します。回答中の内容は含めません。',()=>send('end')),'quiet-button'));
 body.append(actions,labeledSelect('次のお題のカテゴリ',[['ALL','すべて'],...Object.entries(catalog.categories)],state.settings.category,v=>send('category',{category:v})),el('p','small muted',`公開済み ${state.progress.completed}問 / 残り ${Math.max(0,state.progress.total-state.progress.current)}問。切断中の人は復帰を待つか、ホストが待機扱いにできます。`));wrap.append(body);return wrap;
}
export function confirmAction(heading,description,callback){const actions=el('div','actions');actions.append(button('キャンセル',()=>document.querySelector('#modal').close(),'button secondary'),button('続ける',()=>{document.querySelector('#modal').close();callback();}));modal(heading,el('p','',description),actions);}
export function game({state,send,catalog,draft}){
 const screen=el('div','screen game-screen'),round=state.round,q=round.question,host=state.hostId===state.selfId;
 const top=el('div','game-top');top.append(eyebrow(`ROOM ${state.code} / ${q.mode==='QUICK'?'QUICK MIX':q.mode}`),el('span','small muted',`${state.progress.current} / ${state.progress.total}`),button('招待',()=>invitation(state),'quiet-button'));screen.append(top);
 const progress=el('div','round-progress');const progressBar=el('span');progressBar.style.width=`${state.progress.current/state.progress.total*100}%`;progress.append(progressBar);screen.append(progress);
 if(state.paused){screen.append(logo(),title('TAKE A MOMENT','ちょっと、ひと休み。','ホストが再開すると、同じお題に戻ります。'));if(host)screen.append(button('再開する →',()=>send('pause')));}
 else if(state.phase==='COUNTDOWN'){const count=el('div','countdown');count.append(eyebrow('LET’S SEE OUR MIX'),el('p','countdown-number serif','3'),el('p','muted','違いが、見えてくる。'),logo());screen.append(count);}
 else if(state.phase==='TALK'){
  screen.append(title(`${q.mode} / REVEAL`,q.question));const result=state.round.result;screen.append(resultRenderers[q.mode](result,state));const talk=el('section','talk-prompt');talk.append(eyebrow('LET’S TALK'),el('h2','',q.talkPrompt),el('p','small muted','スマートフォンを少し置いて、目の前の人の話を。理由を話すのも、パスするのも自由です。'));screen.append(talk);
  if(host)screen.append(button(state.progress.current>=state.progress.total?'今日のMIXを見る →':'次のお題へ →',()=>send('next'),'button wide next-button'));else screen.append(el('p','small muted center','話したら、ホストが次へ進めます。'));
 }else if(!round.participating){screen.append(logo(),title('JOINED THE ROOM','次のお題から、一緒に。','いまは、みんなの会話を楽しんでください。'));const self=state.players.find(p=>p.id===state.selfId);screen.append(button(self.ready?'次のお題の準備OK ✓':'次のお題への準備OK',()=>send('ready',{ready:!self.ready}),self.ready?'button secondary':'button'));}
 else if(round.ownAnswer){screen.append(logo(),title('ANSWER SAVED','答えを、預かりました。','みんなの答えが揃うまで、少しだけ。'));const own=el('div','own-answer');own.append(eyebrow('YOUR ANSWER / ONLY YOU'));const value=round.ownAnswer;if(value.skip)own.append(el('p','','今回はパス'));else if(['ALIGN','PREDICT'].includes(q.mode))own.append(el('p','',`${value.value.toUpperCase()} / ${q.choices[value.value==='a'?0:1]}`));else if(q.mode==='QUICK')own.append(el('p','',value.value||'口頭で話します'));else if(q.mode==='LINE')own.append(el('p','serif',formatScaleValue(q,value.value)));else own.append(el('p','small','回答を保存しました。公開後に、あなたの結果を確認できます。'));screen.append(own);}
 else {
  const target=state.players.find(p=>p.id===round.targetId);let description;
  if(q.mode==='PREDICT')description=round.targetId===state.selfId?'あなたが今回のターゲット。自分の答えを秘密で選んでください。':`${target?.name||'この人'}さんなら、どちらを選ぶ？本人の答えを予想してみよう。`;
  screen.append(title(`${catalog.categories[q.category]} / ${q.depth}`,q.question,description));
  const submit=button('答えを預ける →',()=>send('answer',{roundId:round.id,value:draft.value}),'button wide submit-answer');submit.id='submit-answer';
  const answer=answerRenderers[q.mode](q,draft,submit,()=>send('answer',{roundId:round.id,value:''}));screen.append(answer,submit,button('今回はパスする',()=>send('answer',{roundId:round.id,skip:true}),'quiet-button pass-button'),el('p','small muted center','公開されるまで、他の人には答えが見えません。'));
 }
 const waiting=el('div','answered-progress');waiting.id='answered-progress';screen.append(waiting);
 if(host&&state.phase==='ANSWER'&&!state.paused){const reveal=button('みんなの答えを公開 →',()=>send('reveal'),'button secondary wide');reveal.id='manual-reveal';reveal.hidden=state.settings.autoReveal;screen.append(reveal);}
 if(host&&state.phase!=='FINAL')screen.append(hostControls({state,send,catalog}));return screen;
}
export function updateGame(state,offset){const progress=document.querySelector('#answered-progress');if(progress){progress.replaceChildren(eyebrow(`ANSWERED ${state.round.answeredCount} / ${state.round.participantCount}`));const names=el('p','small muted',state.players.filter(p=>p.participating).map(p=>`${p.name} ${p.answered?'✓':p.connected?'…':'再接続待ち'}`).join('　'));progress.append(names);}const reveal=document.querySelector('#manual-reveal');if(reveal)reveal.disabled=state.round.answeredCount!==state.round.participantCount;const number=document.querySelector('.countdown-number');if(number)number.textContent=String(Math.max(1,Math.ceil((state.round.revealAt-Date.now()-offset)/1000)));}
