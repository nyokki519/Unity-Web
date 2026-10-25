import {Match} from './game.js';
import {DiceTray} from './dice-tray.js';
const $=id=>document.getElementById(id);
let match=new Match(),paused=false,busy=false,cpuTimer=null,rollTimer=null,generation=0,notice='',voids=0,tray=null;
try{tray=new DiceTray($('dice-board'));}catch(e){$('error').textContent='3D表示を開始できませんでした。WebGLが利用できるブラウザで再読み込みしてください。';}
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const motion=()=>{document.body.classList.toggle('reduced',reduced);$('motion').setAttribute('aria-pressed',String(reduced));tray?.setReduced(reduced);};motion();
function clearTimers(){clearTimeout(cpuTimer);clearTimeout(rollTimer);cpuTimer=rollTimer=null;busy=false;$('dice').classList.remove('rolling');}
function setPause(value){paused=value;clearTimeout(cpuTimer);cpuTimer=null;tray?.setPaused(value);render();}
function face(n){
 const e=document.createElement('div');e.className='die';e.setAttribute('role','img');e.setAttribute('aria-label',`${n}の目`);
 if(n===1){const img=document.createElement('img');img.src='/assets/unity-mark.webp';img.alt='';e.append(img);}
 else{const positions={2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n];for(let i=0;i<9;i++){const pip=document.createElement('span');pip.className=positions.includes(i)?'pip':'empty';e.append(pip);}}
 return e;
}
function showDice(values){$('dice').replaceChildren(...values.map(face));$('dice').setAttribute('aria-label',values.length?`出目 ${values.join('・')}`:'まだ振っていません');}
function renderPlayers(){
 $('players').replaceChildren(...match.players.map((p,i)=>{
  const card=document.createElement('article');card.className=`player ${i===0?'human':'cpu'} ${match.phase==='TURN'&&match.current===i?'active':''}`;
  const image=document.createElement('img');image.src='/assets/unity-mark.webp';image.alt='';
  const info=document.createElement('div');const name=document.createElement('h2');name.textContent=p.name;const bank=document.createElement('p');bank.className='bank';bank.textContent=p.coins.toLocaleString()+' 枚';const role=document.createElement('p');role.className='player-role';const r=match.results[i];role.textContent=r?(r.final?r.label:`役なし・${r.attempt}投目`):'出目を待っています';
  const badge=document.createElement('span');badge.className='badge';badge.textContent=i===match.dealer?'親':'子';info.append(name,bank,role);card.append(image,info,badge);return card;
 }));
}
function render(){
 renderPlayers();$('hand').textContent=`第${Math.min(match.hand+1,4)}局 / 全4局`;
 const phase=match.phase,isBet=phase==='BET',final=phase==='FINAL';$('bet-panel').hidden=!isBet;$('pause').hidden=phase!=='TURN'&&!paused;$('pause').textContent=paused?'再開':'一時停止';
 if(isBet){$('bet').max=match.maxBet;$('bet').value=Math.min(Number($('bet').value)||25,match.maxBet);}
 const bet=Number($('bet').value);$('bet-value').value=`${bet}枚`;$('risk').textContent=`最大の増減は ${bet*5} 枚。残高に応じて上限を調整します。`;
 document.querySelectorAll('[data-bet]').forEach(b=>{b.disabled=Number(b.dataset.bet)>match.maxBet;b.setAttribute('aria-pressed',String(Number(b.dataset.bet)===bet));});
 $('action').disabled=!tray||paused||busy||phase==='TURN'&&match.current===1;
 $('settlement').hidden=phase!=='ROUND_END'&&!final;
 if(!busy)showDice(phase==='TURN'?match.dice:phase==='ROUND_END'?match.results[0].dice:[]);
 if(isBet){$('turn').textContent=`今回の親：${match.players[match.dealer].name}`;$('role').textContent='一杯ぶん、勝負しよう。';$('message').textContent='コインを決めたら、親から順に振ります。';$('action').textContent='この枚数で勝負';}
 if(phase==='TURN'){
  const p=match.players[match.current],r=match.results[match.current];$('turn').textContent=`${p.name}の番 / ${match.current===match.dealer?'親':'子'} / ${Math.min(match.attempt+(!match.locked?1:0),3)}投目`;
  $('role').textContent=busy?'出目を待とう。':r?r.label:'サイコロを振ろう';
  $('message').textContent=match.locked?'この出目で勝負。':match.attempt?'役なし。あと'+(3-match.attempt)+'回振れます。':'役が出るまで、最大3回。';
  $('action').textContent=match.current===1?(busy?'CPUが振っています…':'CPUの番です…'):match.locked?(match.turnIndex===1?'結果を精算する':'CPUの番へ'):'サイコロを振る';
 }
 if(phase==='ROUND_END'){
  const d=match.last.delta;$('turn').textContent=`第${match.hand+1}局の結果`;$('role').textContent=d>0?'あなたの勝ち':d<0?'モカの勝ち':'引き分け';$('message').textContent=d?`${Math.abs(d)}枚のコインが移動しました。`:'この局のコイン移動はありません。';$('settlement').textContent=`あなた ${d>=0?'+':''}${d}枚 / モカ ${d<=0?'+':''}${-d}枚`;$('action').textContent=match.hand===3||match.maxBet<1?'最終結果を見る':'親を交代して次の局へ';
 }
 if(final){const d=match.players[0].coins-1000;$('turn').textContent='対戦終了';$('role').textContent=d>0?'今日は、あなたの一杯。':d<0?'今日は、モカに一杯。':'いい勝負でした。';$('message').textContent=`あなたの最終残高 ${match.players[0].coins.toLocaleString()}枚`;$('settlement').textContent=`最初の1,000枚から ${d>=0?'+':''}${d}枚`;$('action').textContent='もう一度対戦する';}
 if(notice&&phase==='TURN')$('message').textContent=notice;
 if(paused&&!$('rules').open&&!$('confirm').open){$('message').textContent='一時停止中です。「再開」で続けられます。';}
 $('history').replaceChildren(...(match.history.length?match.history.map(h=>{const li=document.createElement('li');li.textContent=`第${h.hand}局・親 ${match.players[h.dealer].name} / あなた ${h.results[0].label} 対 モカ ${h.results[1].label} / ${h.delta>=0?'+':''}${h.delta}枚`;return li;}):[Object.assign(document.createElement('li'),{textContent:'最初の一局を、ここから。'})]));
 scheduleCpu();
}
function scheduleCpu(){
 clearTimeout(cpuTimer);cpuTimer=null;
 if(paused||busy||document.hidden||$('rules').open||$('confirm').open||match.phase!=='TURN'||match.current!==1)return;
 const token=generation;cpuTimer=setTimeout(()=>{if(token!==generation||paused)return;try{if(match.locked){match.advance();render();}else roll();}catch(e){$('error').textContent=e.message;}},reduced?350:1000);
}
async function roll(){
 if(paused||busy||!tray||match.phase!=='TURN'||match.locked)return;
 const token=generation;notice='';busy=true;showDice([]);render();
 try{
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];const result=await tray.roll(seed);
  if(token!==generation)return;
  busy=false;
  if(result.values){match.roll(result.values);voids=0;}
  else{notice=result.reason+'。この投擲は回数に含めません。';voids++;if(voids>=3){paused=true;tray.setPaused(true);notice+=' 再開するともう一度振れます。';}}
  render();
 }catch(e){if(token!==generation||e.name==='AbortError')return;busy=false;paused=true;tray.setPaused(true);$('error').textContent='投擲を続けられませんでした。最初からやり直してください。';render();}
}
function reset(){generation++;clearTimers();tray?.cancel();tray?.setPaused(false);notice='';voids=0;match=new Match();paused=false;$('error').textContent='';render();}
$('action').addEventListener('click',()=>{if(paused||busy||!tray)return;notice='';try{
 if(match.phase==='BET'){match.placeBet(Number($('bet').value));render();}
 else if(match.phase==='TURN'&&match.current===0){if(match.locked){match.advance();render();}else roll();}
 else if(match.phase==='ROUND_END'){match.next();render();}else if(match.phase==='FINAL')reset();
 }catch(e){$('error').textContent=e.message;}});
$('bet').addEventListener('input',render);document.querySelectorAll('[data-bet]').forEach(b=>b.addEventListener('click',()=>{$('bet').value=b.dataset.bet;render();}));
$('pause').addEventListener('click',()=>setPause(!paused));$('motion').addEventListener('click',()=>{reduced=!reduced;motion();});
let resumeAfterDialog=false;
function openDialog(dialog){resumeAfterDialog=!paused;setPause(true);dialog.showModal();}
function closeDialog(dialog){dialog.close();if(resumeAfterDialog&&!document.hidden)setPause(false);else render();}
$('rules-open').addEventListener('click',()=>openDialog($('rules')));$('rules-close').addEventListener('click',()=>closeDialog($('rules')));
$('restart').addEventListener('click',()=>openDialog($('confirm')));$('cancel').addEventListener('click',()=>closeDialog($('confirm')));$('confirm-restart').addEventListener('click',()=>{$('confirm').close();reset();});
for(const d of [$('rules'),$('confirm')])d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
$('dice-zoom').addEventListener('click',()=>{if(!tray)return;tray.setZoom(!tray.zoomed);$('dice-zoom').setAttribute('aria-pressed',String(tray.zoomed));$('dice-zoom').textContent=tray.zoomed?'皿全体を見る':'近くで見る';});
render();

if(new URLSearchParams(location.search).get('inspect')==='1')window.chinchiro={get match(){return match;},tray,get busy(){return busy;}};

$('sound').addEventListener('click',async()=>{if(!tray)return;$('sound').disabled=true;try{await tray.sound.setEnabled(!tray.sound.enabled);$('sound').textContent=tray.sound.enabled?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(tray.sound.enabled));$('sound-status').textContent='';}catch{$('sound-status').textContent='音を開始できませんでした。もう一度押してください。';}finally{$('sound').disabled=false;}});
$('volume').addEventListener('input',()=>{const value=Number($('volume').value);tray?.sound.setVolume(value*.008);$('volume-value').value=value+'%';});
