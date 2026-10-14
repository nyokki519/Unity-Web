import {el,button,field,labeledSelect} from '../dom.js';
import {confirmAction} from '../game.js';
export function eventHostControls({state,send,catalog}){
 const e=state.event,wrap=el('section','event-host');wrap.append(el('h2','','司会の進行'));
 const add=(label,action,data={})=>{const b=button(label,()=>send(action,data),'button wide');b.dataset.action=action;wrap.append(b);};
 if(['ANSWER','CONSULT','GUESS'].includes(e.phase))add(e.phase==='GUESS'?'予想を締め切る':'回答を締め切る','event_close');
 if(e.phase==='CLOSED'){for(const t of e.teamModeration||[]){if(t.answer.value){const card=el('div','event-card');card.append(el('h3','',t.name),el('p','',typeof t.answer.value==='string'?t.answer.value:`${t.answer.value.name}：${t.answer.value.concept}`),button('この回答を非表示',()=>send('event_hide',{teamId:t.id}),'quiet-button'));wrap.append(card);}}for(const item of e.moderation||[]){const row=el('div','event-card');row.append(el('p','',item.title),el('p','',item.text),button('この回答を非表示',()=>send('event_hide',{itemId:item.id}),'quiet-button'));wrap.append(row);}add('回答を公開する','event_reveal');}
 if(e.phase==='GUESS_CLOSED')add('正解を公開する','event_solution');
 if(e.phase==='SOLUTION')add('次の回答へ','event_next_item');
 if(e.phase==='TALK')add(e.roundIndex+1>=e.options.roundLimit?'ゲームを終了する':'次のラウンドへ','event_next');
 if(e.guess&&!e.guess.item.hidden)wrap.append(button('表示中の回答を非表示',()=>send('event_hide',{itemId:e.guess.item.id}),'quiet-button'));
 const details=el('details');details.append(el('summary','','司会の管理'));const body=el('div','event-admin');const sel=labeledSelect('切り替えるゲーム',Object.entries(catalog.eventGames).map(([id,g])=>[id,g.name]),e.gameId);body.append(sel,button('ゲームを切り替える',()=>confirmAction('ゲームを切り替えますか？','未公開回答を終了し、次のゲームの説明へ移ります。',()=>send('event_switch',{gameId:sel.querySelector('select').value})),'button secondary'));
 for(const p of state.players.filter(p=>p.id!==state.hostId))body.append(button(`${p.name}さんを退出`,()=>confirmAction('参加者を退出させますか？',`${p.name}さんの参加情報は無効になります。`,()=>send('event_kick',{playerId:p.id})),'quiet-button'));
 body.append(button('ここで終了',()=>confirmAction('ゲームを終了しますか？','未公開回答は公開せずに終了します。',()=>send('event_end')),'quiet-button'));details.append(body);wrap.append(details);return wrap;
}
export function eventSettings({state,send}){
 const e=state.event,wrap=el('details');wrap.append(el('summary','','時間・ラウンド・難易度を設定'));const form=el('form'),inputs={};
 for(const [key,label,min,max] of [['seconds','回答・相談時間（秒）',30,600],['guessSeconds','予想時間（秒）',30,600],['roundLimit','ラウンド数',1,15],...(['WHO','STORY'].includes(e.gameId)?[['itemLimit','公開する匿名回答数（ランダムに選択）',1,15]]:[])]){const n=el('input');n.type='number';n.min=min;n.max=max;n.value=e.options[key]??(key==='itemLimit'?(e.gameId==='STORY'?4:6):'');n.required=true;n.name=key;inputs[key]=n;form.append(field(label,n));}
 const difficulty=labeledSelect('難易度',['すべて','気軽','ひと工夫','じっくり'].map(d=>[d,d]),e.options.difficulty);form.append(difficulty);const save=el('button','button secondary','設定を保存');save.type='submit';form.append(save);form.addEventListener('submit',ev=>{ev.preventDefault();send('event_config',{options:{...e.options,...Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,Number(n.value)])),difficulty:difficulty.querySelector('select').value}});});wrap.append(form);
 if(['QUEST','CAFE'].includes(e.gameId)){
  const count=labeledSelect('チーム数',[[2,'2チーム'],[3,'3チーム'],[4,'4チーム']],e.options.teamCount);wrap.append(count,button('均等にチーム分け',()=>send('event_teams',{count:Number(count.querySelector('select').value)}),'button secondary'));const assignments={};const manual=el('details');manual.append(el('summary','','手動でチーム分け'));for(const [i,p]of state.players.filter(p=>p.ready&&p.connected).entries()){const t=e.teams.findIndex(t=>t.memberIds.includes(p.id));assignments[p.id]=t>=0?t:i%Number(count.querySelector('select').value);manual.append(labeledSelect(p.name,[[0,'チーム1'],[1,'チーム2'],[2,'チーム3'],[3,'チーム4']],assignments[p.id],v=>assignments[p.id]=Number(v)));}manual.append(button('手動のチーム分けを保存',()=>send('event_teams',{count:Number(count.querySelector('select').value),assignments}),'button secondary'));wrap.append(manual);
 }return wrap;
}
