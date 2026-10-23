import {createGame} from './game.js';
import {MachineScene} from './scene.js';
import {CameraRig} from './camera.js';
import {MachineAudio} from './audio.js';
const $=id=>document.getElementById(id),sound=new MachineAudio();let game,view,rig,holding=false,last=0,accumulator=0,ready=false,hudAt=0,ended=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let reduceMotion=reduced,highQuality=true;
const phaseNames={PLAY:'羽根を狙う',START:'大当たり / 開始スルーへ',ROUND:'大当たり',INTERVAL:'次のラウンドへ',END:'遊技終了'};
$('welcome').showModal();
const params=new URLSearchParams(location.search);if(params.has('seed'))$('seed').value=params.get('seed').slice(0,64);const inspection=params.get('inspect')==='1';$('inspection').hidden=!inspection;
async function boot(){
 ready=false;for(const id of ['start','fire','auto','pause','retry','new-seed'])$(id).disabled=true;
 try{rig?.dispose();game?.dispose();view?.dispose();ended=false;holding=false;accumulator=0;last=0;
  game=await createGame({seed:$('seed').value||'unity-field',onEvent:e=>{sound.play(e);if(e.type==='end')showResult();}});game.command('pause',true);
  view=new MachineScene($('board'),game);view.setQuality(highQuality);rig=new CameraRig(view);rig.setMode($('camera').value);view.reduced=reduceMotion;
  $('power').value=30;$('power-value').value='30%';$('sweep').checked=false;$('pause').textContent='再開';
  ready=true;for(const id of ['start','fire','auto','pause','retry','new-seed'])$(id).disabled=false;$('canvas-state').textContent='';$('load-error').textContent='';updateHud();
  if(inspection){window.mechanical={game,audio:sound,getState:()=>game.snapshot(),step:n=>{for(let i=0;i<n;i++)game.step();updateHud();},fixture:k=>game.fixture(k)};}
 }catch(e){ready=false;$('load-error').textContent='3D盤面を開始できませんでした。再読み込みしてお試しください。';$('canvas-state').textContent='3D描画の初期化に失敗しました。';console.error(e);}
}
function pause(value){if(!ready)return;holding=false;game.command('pause',value);accumulator=0;last=0;$('pause').textContent=value?'再開':'一時停止';$('canvas-state').textContent=value?'一時停止中 —「再開」で戻れます':'';updateHud();}
function begin(){if(!ready)return;$('welcome').close();$('result').close();pause(false);}
function showResult(){if(ended)return;ended=true;holding=false;game.command('auto',false);game.command('pause',true);const l=game.ledger;$('result-copy').textContent=`発射 ${l.fired.toLocaleString()}球 ／ 賞球 ${l.payout.toLocaleString()}球 ／ V入賞 ${game.stats.v}回。残り ${l.stock.toLocaleString()}球。`;$('result').showModal();}
function power(value){if(!ready)return;game.command('power',Math.min(100,Math.max(0,value))/100);$('power').value=Math.round(game.power*100);$('power-value').value=`${Math.round(game.power*100)}%`;}
$('start').addEventListener('click',begin);$('retry').addEventListener('click',async()=>{await boot();begin();});$('new-seed').addEventListener('click',async()=>{await boot();begin();});
$('result').addEventListener('cancel',e=>e.preventDefault());
$('finish').addEventListener('click',()=>{if(ready)showResult();});$('pause').addEventListener('click',()=>pause(!game.paused));
$('power').addEventListener('input',e=>power(Number(e.target.value)));$('power-down').addEventListener('click',()=>power(game.power*100-5));$('power-up').addEventListener('click',()=>power(game.power*100+5));
$('sweep').addEventListener('change',e=>{if(ready)game.command('sweep',e.target.checked);});
$('auto').addEventListener('click',()=>{if(!ready||game.paused)return;game.command('auto',!game.auto);updateHud();});
$('fire').addEventListener('pointerdown',e=>{if(!ready||game.paused)return;e.preventDefault();holding=true;game.command('hold',true);e.currentTarget.setPointerCapture(e.pointerId);game.command('fire');});
for(const e of ['pointerup','pointercancel','lostpointercapture'])$('fire').addEventListener(e,()=>{holding=false;if(ready)game.command('hold',false);});
$('fire').addEventListener('click',()=>{if(ready&&!game.paused)game.command('fire');});
window.addEventListener('keydown',e=>{if(e.target.closest('input,button,select,summary,a,dialog'))return;if(e.code==='Space'){e.preventDefault();holding=true;if(ready){game.command('hold',true);game.command('fire');}}if(e.code==='ArrowUp'){e.preventDefault();power(game.power*100+5);}if(e.code==='ArrowDown'){e.preventDefault();power(game.power*100-5);}});
window.addEventListener('keyup',e=>{if(e.code==='Space'){holding=false;if(ready)game.command('hold',false);}});window.addEventListener('blur',()=>{holding=false;if(ready)game.command('hold',false);});
$('sound').addEventListener('click',async()=>{try{await sound.setEnabled(!sound.enabled);$('sound').textContent=`音 ${sound.enabled?'ON':'OFF'}`;$('sound').setAttribute('aria-pressed',String(sound.enabled));}catch{$('hint').textContent='音を開始できませんでした。もう一度お試しください。';}});
$('motion').setAttribute('aria-pressed',String(reduceMotion));$('motion').addEventListener('click',()=>{reduceMotion=!reduceMotion;if(view)view.reduced=reduceMotion;$('motion').setAttribute('aria-pressed',String(reduceMotion));if(reduceMotion&&$('camera').value==='自動追尾'){$('camera').value='役物';rig?.setMode('役物');}});
$('quality').addEventListener('click',()=>{highQuality=!highQuality;view?.setQuality(highQuality);$('quality').textContent=highQuality?'画質：高':'画質：軽量';$('quality').setAttribute('aria-pressed',String(highQuality));});
$('camera').addEventListener('change',e=>rig?.setMode(e.target.value));$('zoom-in').addEventListener('click',()=>rig?.zoom(.85));$('zoom-out').addEventListener('click',()=>rig?.zoom(1.18));$('pan-up').addEventListener('click',()=>{rig?.pan(.045);$('camera').value='自由';});$('pan-down').addEventListener('click',()=>{rig?.pan(-.045);$('camera').value='自由';});
$('export').addEventListener('click',()=>{if(!ready)return;const data=JSON.stringify(game.replayData(),null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='unity-fielder-replay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
for(const [key,name]of Object.entries({wing:'羽根',main:'ストッパー',slugger:'右ルート',bat:'バット',rotor:'回転体',v:'V口',start:'開始スルー',attacker:'アタッカー',out:'回収'})){const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.fixture=key;b.addEventListener('click',()=>{if(!ready)return;game.fixture(key);updateHud();});$('fixtures').append(b);}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)pause(true);});
const ro=new ResizeObserver(()=>{view?.resize();rig?.resize();});ro.observe($('board'));
function updateHud(){if(!game)return;const l=game.ledger,s=game.stats;
 for(const [id,value]of Object.entries({stock:l.stock,fired:l.fired,payout:l.payout,'v-count':s.v,pickups:s.pickups,'left-count':s.left,'right-count':s.right,'out-count':s.out}))$(id).textContent=value.toLocaleString();
 $('phase').textContent=phaseNames[game.phase];$('auto').setAttribute('aria-pressed',String(game.auto));$('auto').querySelector('span').textContent=game.auto?'ON':'OFF';
 const t=Math.floor(game.time);$('session-time').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
 const round=game.phase!=='PLAY'&&game.phase!=='END';$('round-banner').hidden=!round;$('round-label').textContent=game.phase==='START'?`${game.awardedRounds}R 大当たり`:`${game.round} / ${game.roundTarget}R · ${game.roundHits} / 9個`;$('round-help').textContent=game.phase==='START'?'左の「開始」スルーへ球を通してください。':'発射を続け、下部アタッカーを狙います。1入賞14球。';
 const stopped=[...game.physics.balls.values()].filter(b=>b.still>8).length;$('hint').textContent=game.paused?'一時停止中です。「再開」で遊技を続けられます。':stopped?`${stopped}球が滞留中。役物の次の動きを待っています。`:game.phase==='START'?'大当たり！ 左の「開始」スルーを狙って発射を続けてください。':game.phase==='ROUND'?'下部アタッカー開放中。発射を続けて賞球を獲得。':'強さを調整して、羽根が開く瞬間を狙います。';
 if(inspection)$('debug-state').textContent=JSON.stringify({tick:game.tick,phase:game.phase,ledger:l.snapshot(),stats:s,stalled:stopped},null,2);
}
function frame(now){requestAnimationFrame(frame);if(!ready)return;const dt=last?Math.min((now-last)/1000,.10):0;last=now;
 if(!game.paused){accumulator+=dt;let steps=0;while(accumulator>=game.config.physics.dt&&steps<24){game.step();accumulator-=game.config.physics.dt;steps++;}if(steps===24)accumulator=Math.min(accumulator,game.config.physics.dt);}
 sound.sync(game);view.sync(game.paused?1:accumulator/game.config.physics.dt);rig.update(dt);view.render();if(now-hudAt>120){updateHud();hudAt=now;}
}
requestAnimationFrame(frame);await boot();
