import {SETTINGS} from './config.js';
import {AtelierAudio} from './audio.js';
const $=id=>document.getElementById(id),audio=new AtelierAudio();
let sim,view,paused=false,finished=false,accumulator=0,last=null,held=false,holdTimer=null,flashTimer=null,disposed=false,raf=0,seed=1701;
const querySeed=Number(new URLSearchParams(location.search).get('seed'));if(new URLSearchParams(location.search).has('seed')&&Number.isSafeInteger(querySeed)&&querySeed>=0&&querySeed<=4294967295)seed=querySeed;$('seed').value=seed;
const abort=new AbortController(),listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
const update=()=>{
 $('remaining').textContent=sim.remaining;$('wins').textContent=sim.results.filter(r=>r.win).length;$('score').textContent=sim.results.reduce((score,r)=>score+(r.reason==='hole'?(r.win?100:10):0),0);
 $('progress').style.width=`${100*sim.remaining/SETTINGS.initialBalls}%`;
 $('launch').disabled=paused||finished||sim.remaining<=0||sim.balls.size>=SETTINGS.maxLive;
 $('pause').disabled=finished;$('restart').disabled=false;
};
function stopHold(){held=false;clearInterval(holdTimer);holdTimer=null;}
function onEvent(event){
 if(event.type==='impact')audio.impact(event.strength);
 if(event.type==='launch'){$('status').textContent='一球の行方を、ゆっくり見届けて。';}
 if(event.type==='result'){
  const returned=event.reason==='returned';$('status').textContent=returned?'玉を回収し、1球を返却しました。':event.win?`金色の穴へ。${event.dwell.toFixed(1)}秒の旋回、100点。`:`銀色の穴へ。${event.dwell.toFixed(1)}秒の旋回、10点。`;
  const chip=document.createElement('span');chip.className=event.win?'win':'';chip.textContent=returned?'返却':event.win?'＋100':'＋10';$('history').prepend(chip);while($('history').children.length>8)$('history').lastChild.remove();
  if(!returned)audio.play(event.win);
  if(event.win&&!matchMedia('(prefers-reduced-motion:reduce)').matches){document.body.classList.add('win-flash');clearTimeout(flashTimer);flashTimer=setTimeout(()=>document.body.classList.remove('win-flash'),700);}
 }
}
function fire(){if(paused||finished||!sim)return false;audio.ctx?.resume();const ball=sim.launch(Number($('power').value)/100);if(!ball&&sim.balls.size>=SETTINGS.maxLive)$('status').textContent='盤面は4球まで。穴へ抜けるのを待ってください。';update();return !!ball;}
function pause(value){if(!sim||finished)return;paused=value;stopHold();accumulator=0;last=null;$('pause-cover').hidden=!value;$('pause').textContent=value?'再開':'一時停止';if(value)audio.suspend();else if(audio.enabled)audio.ctx?.resume();update();}
function restart(){stopHold();sim?.dispose();sim=new window.ATELIER.SimClass({seed,onEvent});window.ATELIER.sim=sim;finished=false;paused=false;accumulator=0;last=null;$('result').hidden=true;$('pause-cover').hidden=true;$('pause').textContent='一時停止';$('history').replaceChildren();$('status').textContent='強さを選んで、最初の一球を。';document.body.classList.remove('win-flash');clearTimeout(flashTimer);update();}
async function start(){
 try{
  const [{AtelierSim},{createRenderer}]=await Promise.all([import('./physics.js'),import('./renderer.js')]);
  if(disposed)return;sim=new AtelierSim({seed,onEvent});view=createRenderer($('scene'),sim.dish);
  window.ATELIER={sim,view,SimClass:AtelierSim,get paused(){return paused;},get finished(){return finished;}};
  $('loading').hidden=true;$('status').textContent='強さを選んで、最初の一球を。';$('pause').disabled=false;update();if(document.hidden)pause(true);
  const frame=now=>{
   if(disposed)return;const dt=last===null?0:Math.max(0,Math.min(.05,(now-last)/1000));last=now;
   if(view.lost){pause(true);$('status').textContent='描画が中断されました。ページを再読み込みしてください。';}
   if(!paused&&!finished){accumulator+=dt;while(accumulator>=SETTINGS.dt){sim.step();accumulator-=SETTINGS.dt;}
    if(sim.remaining===0&&sim.balls.size===0){finished=true;stopHold();$('result-copy').textContent=`20球で ${sim.results.filter(r=>r.win).length}回の当たり。${sim.results.reduce((s,r)=>s+(r.reason==='hole'?(r.win?100:10):0),0)}点の余韻。`;$('result').hidden=false;$('retry').focus();}
    update();
   }
   view.render(sim,paused||finished?1:accumulator/SETTINGS.dt);raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);
 }catch(error){console.error(error);$('loading').replaceChildren();const p=document.createElement('p');p.textContent='3D台を読み込めませんでした。通信とWebGL2の対応をご確認ください。';const link=document.createElement('a');link.href='/';link.textContent='Unity MIXへ戻る';$('loading').append(p,link);}
}
listen($('power'),'input',()=>{$('power-value').textContent=`${$('power').value}%`;});
listen($('launch'),'pointerdown',e=>{if(e.button!==0||held)return;e.preventDefault();$('launch').setPointerCapture?.(e.pointerId);held=true;fire();holdTimer=setInterval(()=>{if(held)fire();},SETTINGS.shotInterval*1000);});
listen($('launch'),'lostpointercapture',stopHold);listen(window,'pointerup',stopHold);listen(window,'pointercancel',stopHold);listen($('launch'),'click',e=>{if(e.detail===0)fire();});
listen(window,'keydown',e=>{if(e.target.closest?.('input,button,a,summary,textarea'))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)fire();}});
listen($('pause'),'click',()=>pause(!paused));listen($('resume'),'click',()=>pause(false));listen($('retry'),'click',()=>{restart();$('launch').focus();});listen($('restart'),'click',()=>{restart();$('launch').focus();});
listen($('sound'),'click',async()=>{try{await audio.setEnabled(!audio.enabled);$('sound').textContent=audio.enabled?'音 ON':'音 OFF';$('sound').setAttribute('aria-pressed',String(audio.enabled));}catch{$('status').textContent='音を開始できませんでした。もう一度お試しください。';}});
listen($('reset-camera'),'click',()=>view?.resetCamera());
listen($('apply-seed'),'click',()=>{const value=Number($('seed').value);if(!Number.isSafeInteger(value)||value<0||value>4294967295){$('status').textContent='シードは0〜4294967295の整数を入力してください。';return;}seed=value;if(sim)restart();});
listen(document,'visibilitychange',()=>{if(document.hidden)pause(true);});listen(window,'blur',stopHold);
function dispose(){if(disposed)return;disposed=true;stopHold();clearTimeout(flashTimer);cancelAnimationFrame(raf);abort.abort();sim?.dispose();view?.dispose();audio.dispose();}
listen(window,'pagehide',event=>{if(event.persisted)pause(true);else dispose();});listen(window,'pageshow',event=>{if(event.persisted)pause(true);});
start();
