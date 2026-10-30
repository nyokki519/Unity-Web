// Presentation only: financial and physical decisions remain in Match / DiceWorld.
export function coinBreakdown(value){
 if(!Number.isSafeInteger(value)||value<0||value>100)throw new RangeError('賭け枚数を確認してください');
 const coins=[];for(const d of [100,50,25,10,5,1])while(value>=d){coins.push(d);value-=d;}return coins;
}
export function roundProgress(hand,phase){return Array.from({length:4},(_,i)=>i<hand?'complete':i===hand&&phase!=='FINAL'?'current':'future');}
export function resultTone(delta){return delta>0?'win':delta<0?'loss':'tie';}
export function roleDescription(role){
 if(!role)return '投擲を待っています';
 if(role.kind==='shonben')return '場外・賭け枚数の1倍を支払い';
 if(role.kind==='unthrown')return '相手の場外で決着';
 if(role.kind==='none')return role.final?'3投終了・役なし':'役なし・振り直しできます';
 if(role.kind==='hifumi')return '最弱・負けると最低2倍';
 return `勝ったとき ${role.multiplier}倍`;
}
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function miniDie(value){
 const e=node('span','score-die');e.dataset.value=value;e.setAttribute('role','img');e.setAttribute('aria-label',`${value}の目`);
 if(value===1){const img=node('img');img.src='./assets/community-ink.svg';img.alt='';e.append(img);}
 else{const cells={2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[value];for(let i=0;i<9;i++)e.append(node('i',cells.includes(i)?'dot':''));}return e;
}
export class SalonPresentation{
 constructor(){this.lastHistory=-1;this.lastBet=-1;this.lastPhase='';this.effectsTimer=null;}
 render(match,{busy,paused,bet}){
  document.body.dataset.phase=match.phase;document.body.dataset.rolling=String(busy);document.body.dataset.paused=String(paused);
  document.body.dataset.result=match.phase==='ROUND_END'?resultTone(match.last.delta):'none';
  const round=document.getElementById('round-progress');round.replaceChildren(...roundProgress(match.hand,match.phase).map((s,i)=>{const e=node('span',s,`${i+1}`);e.setAttribute('aria-label',`第${i+1}局${s==='complete'?' 終了':s==='current'?' 現在':''}`);if(s==='current')e.setAttribute('aria-current','step');return e;}));
  document.getElementById('live-state').textContent=paused?'一時停止':busy?'転がっています':match.phase==='BET'?'ベット受付中':match.phase==='TURN'?`${match.current===0?'あなた':'モカ'}の番`:match.phase==='FINAL'?'対戦終了':'決着';
  const selected=match.phase==='BET'?bet:match.bet||0;
  document.getElementById('stake-total').textContent=`${selected} 枚`;
  if(this.lastBet!==selected){
   this.lastBet=selected;document.getElementById('stake-coins').replaceChildren(...coinBreakdown(selected).map((v,i)=>{const img=node('img','stake-coin');img.src=`./assets/coin-${v}.svg`;img.alt=`${v}枚`;img.style.setProperty('--i',i);return img;}));
  }
  const showdown=document.getElementById('showdown');showdown.hidden=match.phase==='BET';
  showdown.replaceChildren(...match.results.map((r,i)=>{
   const e=node('article',`showdown-side ${match.phase==='TURN'&&match.current===i?'is-current':''}`);
   e.append(node('span','showdown-name',i===0?'あなた':'CPU モカ'));
   const dice=node('div','showdown-dice');if(r?.dice?.length)dice.append(...r.dice.map(miniDie));else dice.append(node('span','waiting-dice',busy&&match.current===i?'•••':'— — —'));
   e.append(dice,node('strong','showdown-role',busy&&match.current===i?'投擲中':r?.label||'未投擲'),node('small','showdown-hint',busy&&match.current===i?'物理演算で出目を判定':roleDescription(r)));return e;
  }));
  const hist=document.getElementById('history');
  hist.replaceChildren(...(match.history.length?match.history.map(h=>{const li=node('li',`history-hand ${resultTone(h.delta)}`);li.append(node('span','history-round',`第${h.hand}局`),node('span','history-roles',`${h.results[0].label} / ${h.results[1].label}`),node('strong','history-delta',`${h.delta>0?'+':''}${h.delta} 枚`));return li;}):[node('li','history-empty','まだ勝負はありません。最初の一局をどうぞ。')]));
  if(match.history.length<this.lastHistory){this.lastHistory=0;this.clearEffects();}
  if(match.phase==='ROUND_END'&&match.history.length>this.lastHistory){this.lastHistory=match.history.length;this.outcome(match.last.delta);}
  if(match.phase==='BET'||match.phase==='FINAL')this.clearEffects();
  this.lastPhase=match.phase;
 }
 outcome(delta){
  this.clearEffects();const fx=document.getElementById('result-fx');fx.dataset.tone=resultTone(delta);fx.classList.add('playing');
  if(delta){for(let i=0;i<7;i++){const c=node('img','payout-coin');c.src='./assets/token.svg';c.alt='';c.style.setProperty('--i',i);fx.append(c);}}
  this.effectsTimer=setTimeout(()=>this.clearEffects(),1300);
 }
 clearEffects(){clearTimeout(this.effectsTimer);const fx=document.getElementById('result-fx');fx.classList.remove('playing');fx.replaceChildren();}
}
