import {el,button,field} from '../dom.js';

const LABELS=['一流','二流','三流','四流','映す価値なし'];
export const ratingCategories=Object.freeze(['センス格付け','AI画像格付け','芸術格付け','プロの仕事','骨董品鑑定','盛り付け格付け']);
let cssRequested=false;
function styles(){if(cssRequested||typeof document==='undefined')return;cssRequested=true;const link=el('link');link.rel='stylesheet';link.href='/js/events/rating.css?v=rating-v5';document.head.append(link);}
function options(question){return ['A','B'].map(key=>{const value=question?.choices?.[key]||{};return{key,label:String(value.label||`選択肢 ${key}`),asset:String(value.asset||''),alt:String(value.alt||value.label||`選択肢 ${key}`)};});}
function imageCard(choice,selected,disabled,onSelect,{blind=false}={}){const card=button('',()=>onSelect(choice.key),`rating-choice${blind?' rating-choice-blind':''}`);card.type='button';card.disabled=disabled;card.setAttribute('aria-pressed',String(selected));if(selected)card.className+=' is-selected';card.append(el('span','rating-choice-letter',choice.key));if(choice.asset){const image=el('img','rating-choice-image');image.src=choice.asset;image.alt=choice.alt;image.loading='eager';image.addEventListener('error',()=>{image.hidden=true;card.className+=' rating-image-unavailable';});card.append(image);}else{const visual=el('div','rating-choice-art',choice.key==='A'?'✦':'◈');visual.setAttribute('aria-hidden','true');card.append(visual);}card.append(el('span','rating-choice-label',choice.label));return card;}
function questionNotice(question){return typeof question?.practiceNotice==='string'?question.practiceNotice:'';}
function rankName(row){return row.rankLabel||LABELS[Math.min(LABELS.length-1,Math.max(0,row.rankIndex||0))]||'一流';}
function standingsList(rows,selfId){const list=el('ol','rating-standings');for(const [index,row]of [...(rows||[])].sort((a,b)=>(a.place??999)-(b.place??999)).entries()){const item=el('li',`rating-standing rank-${Math.min(4,row.rankIndex||0)}${row.playerId===selfId?' is-self':''}`);item.append(el('span','rating-place',String(row.place??index+1).padStart(2,'0')),el('span','rating-standing-name',row.name||'参加者'),el('span','rating-rank-label',rankName(row)),el('span','rating-score',`${row.correct??0} / ${row.total??0} 正解`));list.append(item);}return list;}
function waitingRoom(title,names,count,side){const room=el('section',`rating-waiting-room rating-room-${side.toLowerCase()}`);room.append(el('p','rating-room-kicker',`${side} ROOM`),el('h3','',title),el('p','rating-room-count',`${count??names.length}人`));const list=el('ul','rating-room-list');for(const entry of names){const name=typeof entry==='string'?entry:entry.name||'参加者';list.append(el('li','rating-room-person',name));}if(!names.length)list.append(el('li','rating-room-empty','まだ誰もいません'));room.append(list);return room;}

export function ratingScreen({state,send}){
 styles();const e=state.event,q=e.question||{},self=state.players.find(p=>p.id===state.selfId),host=state.selfId===state.hostId;
 const root=el('section','rating-game');root.dataset.phase=e.phase;root.setAttribute('aria-label','一流格付けチェック');
 const eyebrow=el('p','rating-eyebrow',`EXHIBIT ${String((e.roundIndex||0)+1).padStart(2,'0')} / ${e.categoryLabel||q.category||'鑑定の間'}`);root.append(eyebrow);
 if(e.phase==='RULES'){
  const panel=el('article','rating-panel');panel.append(el('p','rating-kicker','PRIVATE APPRAISAL'),el('h2','','一流格付けチェック'),el('p','','AとBを見比べ、一流だと思う方を選択。全員の回答後、二つの待機室に分かれてから扉の向こうを発表します。誤答するとランクが下がります。'),el('p','rating-note','ランクは演出上の称号です。正解数とあわせて最後に発表します。'));root.append(panel);
  if(host){const settings=el('section','rating-host-settings');settings.append(el('p','rating-kicker','本日の鑑定'),el('p','',`${e.options?.roundLimit||3}問 · 制限時間 ${e.options?.seconds||45}秒`),el('p','rating-muted','ジャンルは各問題に沿って出題されます。'));root.append(settings);}
  else root.append(el('p','rating-muted','司会が最初の問題を選んでいます。'));
 }else if(['ANSWER','CONSULT'].includes(e.phase)){
  const notice=questionNotice(q);if(notice)root.append(el('p','rating-note',notice));
  root.append(el('p','rating-prompt',q.prompt||'二つを比べ、一流だと思う方を選んでください。'));
  const choices=el('div','rating-choice-grid');const locked=Boolean(e.ownAnswer);
  for(const choice of options(q))choices.append(imageCard(choice,e.ownAnswer?.value?.choice===choice.key,locked,key=>send('event_answer',{value:{choice:key}}),{blind:true}));
  root.append(choices);
  if(locked){const key=e.ownAnswer?.value?.choice;root.append(el('p','rating-locked','選択を受け付けました。みんなの回答がそろうまでお待ちください。'),el('p','rating-private-pick',key?`あなたは ${key} の部屋へ。`:''));}
  else root.append(el('p','rating-nudge','選択は公開まで他の人には見えません。'));
 }else if(e.phase==='CLOSED'){
  const names=e.waitingRooms||{};const distribution=e.distribution||{};
  root.append(el('p','rating-phase-caption','全員の回答が出そろいました。いったん各部屋へご案内します。'),el('h2','rating-section-title','扉の前で、結果を待つ。'));
  const rooms=el('div','rating-waiting-grid');rooms.append(waitingRoom('Aの部屋',names.A||[],distribution.A,'A'),waitingRoom('Bの部屋',names.B||[],distribution.B,'B'));root.append(rooms);
  if(!host)root.append(el('p','rating-muted','司会が発表を始めるまで、部屋でお待ちください。'));
 }else if(e.phase==='REVEAL'){
  const elapsed=Math.max(0,(state.serverTime||Date.now())-(e.revealAt||state.serverTime||Date.now()));root.className+=' is-revealing';
  const stage=el('div','rating-theater');stage.setAttribute('aria-live','polite');const suspense=el('p','rating-suspense',elapsed<1800?'足音が近づく…':elapsed<3500?'ノブに手がかかった。':'正解の扉は——');stage.append(el('p','rating-kicker','THE REVEAL'),suspense);
  if(typeof window!=='undefined')for(const [at,text]of [[1800,'ノブに手がかかった。'],[3500,'正解の扉は——']])if(elapsed<at)setTimeout(()=>{suspense.textContent=text;},at-elapsed);
  const doors=el('div','rating-doors');for(const key of ['A','B']){const door=el('div',`rating-door rating-door-${key.toLowerCase()}`);door.append(el('span','rating-door-letter',`${key} ROOM`),el('span','rating-door-mark','✧'),el('span','rating-door-caption','鑑定の間'));door.style.animationDelay=`-${Math.min(5,elapsed/1000)}s`;doors.append(door);}stage.append(doors);stage.append(el('p','rating-suspense-sub','静寂のあと、真実が明かされます。'));root.append(stage);
 }else if(['TALK','FINAL'].includes(e.phase)){
  const notice=questionNotice(q);if(notice)root.append(el('p','rating-note',notice));
  const result=e.result||{},correct=result.correctChoice||'A',dist=result.distribution||{};const titleText=e.phase==='FINAL'?'最終格付け':'鑑定結果';
  root.append(el('h2','rating-section-title',titleText),el('p','rating-answer-reveal',`正解は ${correct}。`));
  const choices=el('div','rating-choice-grid rating-result-choices');for(const choice of options(q)){const card=imageCard(choice,false,true,()=>{});card.className+=choice.key===correct?' is-correct':' is-incorrect';choices.append(card);}root.append(choices);
  const explanation=el('article','rating-explanation');explanation.append(el('p','rating-kicker','鑑定メモ'),el('p','',result.explanation||'作品の細部を見比べて、違いを探してみましょう。'));root.append(explanation);if(result.sources){const credits=el('details','rating-sources'),summary=el('summary','','画像の出典・制作情報');credits.append(summary);for(const key of ['A','B']){const source=result.sources[key];if(!source)continue;const row=el('div','rating-source-row');row.append(el('strong','',`${key}：${source.creator||source.tool||source.kind}`),el('p','',source.attribution||source.promptNote||source.license||''));if(source.sourceUrl){const link=el('a','', '出典ページを確認');link.href=source.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}credits.append(row);}root.append(credits);}
  const distribution=el('div','rating-distribution');for(const key of ['A','B']){const side=el('div',`rating-distribution-side rating-room-${key.toLowerCase()}`);side.append(el('b','',`${key}を選択`),el('span','',`${dist[key]??0}人`));distribution.append(side);}root.append(distribution);
  if(result.standings?.length){root.append(el('h3','rating-section-title',e.phase==='FINAL'?'本日の格付け':'現在のランク'),standingsList(result.standings,state.selfId));}
  if(e.phase==='TALK'&&host)root.append(button((e.roundIndex||0)+1>=(e.options?.roundLimit||1)?'最終結果へ':'次の鑑定へ',()=>send('event_next'),'rating-reveal-trigger'));
 }else root.append(el('p','rating-muted','鑑定の準備中です。'));
 return root;
}

export const ratingRanks=Object.freeze([...LABELS]);
export function ratingQuestionEditor({send,categories}){
 const form=el('form','rating-question-editor');form.append(el('h3','','オリジナル問題を追加'));const make=(name,label,type='text',value='')=>{const input=el('input');input.name=name;input.type=type;input.required=true;input.value=value;return input;};
 const category=el('select');for(const item of categories||[]) {const option=el('option','',item);option.value=item;category.append(option);}form.append(field('ジャンル',category),field('問題文',make('prompt','問題文')),field('会話のきっかけ',make('talkPrompt','会話のきっかけ')));
 for(const key of ['A','B'])form.append(field(`${key}の画像パス（/rating/xxx.svg）`,make(`${key}-asset`,`${key}画像`)),field(`${key}の画像説明`,make(`${key}-alt`,`${key}画像の説明`)),field(`${key}の表示ラベル`,make(`${key}-label`,`${key}の説明`)));
 const correct=el('select');for(const key of ['A','B']){const option=el('option','',`${key}が正解`);option.value=key;correct.append(option);}form.append(field('正解（発表まで非公開）',correct),field('正解の根拠',make('explanation','根拠')));
 form.append(el('p','rating-muted','追加する画像は自作、または利用許諾を確認した作品に限ってください。画像は /rating/ 配下のSVGを指定します。'));const submit=el('button','button secondary','問題を追加');submit.type='submit';form.append(submit);form.addEventListener('submit',event=>{event.preventDefault();const val=name=>form.querySelector(`[name="${name}"]`).value;send('event_question',{question:{game:'RATING',category:category.value,prompt:val('prompt'),talkPrompt:val('talkPrompt'),choices:Object.fromEntries(['A','B'].map(key=>[key,{asset:val(`${key}-asset`),alt:val(`${key}-alt`),label:val(`${key}-label`)}])),correct:correct.value,explanation:val('explanation'),source:{kind:'original-created',assetLicense:'自作または利用許諾を確認した素材',editorialNote:'司会が追加したオリジナル問題'}}});});return form;
}
