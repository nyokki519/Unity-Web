import {el,button,field,labeledSelect} from '../dom.js';
import {createGame} from './model.js';
import {WIDTH,HEIGHT} from './config.js';
import {drawBoard} from './render.js';
import {createBonusAudio} from './audio.js';
const names={practice:'練習',normal:'通常',hard:'高難度'};
const clock=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export function mountBonus({onBack}){
 const params=new URL(location.href).searchParams,debug=params.get('debug')==='1';
 const node=el('section','bonus-screen');node.dataset.phase='setup';
 const abort=new AbortController(),audio=createBonusAudio();let game=null,preview=createGame(),held=false,raf=0,last=performance.now(),lastUpdate=0,lastEvent=0,destroyed=false,power=55;
 const listen=(target,type,handler,options={})=>target.addEventListener(type,handler,{...options,signal:abort.signal});
 const heading=el('header','bonus-heading');heading.append(button('← Unity MIXへ戻る',()=>{stopHolding();onBack();},'quiet-button'),el('p','eyebrow','UNITY MIX / SOLO BONUS'),el('h1','','琥珀の三段塔'),el('p','bonus-subtitle','カフェの大穴チャレンジ'),el('p','small muted','釘を抜け、三つの皿を越えて。100球で、大穴を狙おう。'));
 const setup=el('div','bonus-setup');const difficulty=labeledSelect('難易度',Object.entries(names),'practice',()=>{preview=createGame({difficulty:difficulty.querySelector('select').value});describe();});
 const description=el('p','small muted'),seed=el('input');seed.value=params.get('seed')||'cafe';seed.maxLength=64;setup.append(difficulty,description);
 if(debug)setup.append(field('再現用シード',seed));
 const start=button('チャレンジ開始',startGame,'button');setup.append(start,el('p','small muted','登録・ルーム不要。通常は3〜5分が目安。練習では短時間で流れを試せます。玉・スコアはゲーム内だけのものです。'));
 const debugLink=el('a','quiet-button','検証画面を開く（通常プレイと区別）');debugLink.href='/?bonus=jackpot&debug=1';if(!debug)setup.append(debugLink);
 const layout=el('div','bonus-layout'),machine=el('div','bonus-machine'),canvas=el('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','釘の盤面と3段の抽選皿。各段の金色の穴に入ると次へ進みます。');machine.append(canvas);
 const ctx=canvas.getContext('2d');const controls=el('div','bonus-controls');controls.hidden=true;
 const stats=el('dl','bonus-stats'),values={};
 for(const [key,label]of [['remaining','残り玉'],['fired','発射数'],['score','スコア'],['elapsed','経過時間']]){const cell=el('div');values[key]=el('dd','',key==='remaining'?'100':'0');values[key].id=`bonus-${key}`;cell.append(el('dt','',label),values[key]);stats.append(cell);}
 const passes=el('p','bonus-passes');for(let i=1;i<=3;i++){const v=el('strong','','0');v.id=`bonus-pass-${i}`;passes.append(el('span','',`${i}段突破 `),v,document.createTextNode(i===3?'':' / '));}
 const current=el('p','bonus-current','盤面からスタート');current.id='bonus-current';
 const status=el('p','bonus-message','強さを調整して、1球発射してください。');status.id='bonus-message';status.setAttribute('role','status');
 const strength=el('input');strength.type='range';strength.min='0';strength.max='100';strength.step='1';strength.value=String(power);const powerValue=el('output','bonus-power',String(power));
 const powerRow=el('div','bonus-strength');const decrease=button('−',()=>setPower(power-5),'button secondary');decrease.setAttribute('aria-label','強さを下げる');const increase=button('＋',()=>setPower(power+5),'button secondary');increase.setAttribute('aria-label','強さを上げる');powerRow.append(decrease,field('発射の強さ',strength),powerValue,increase);
 listen(strength,'input',()=>setPower(Number(strength.value)));
 const single=button('1球発射',fire,'button'),hold=button('長押しで連続発射',()=>{},'button secondary');hold.setAttribute('aria-label','押している間に連続発射');hold.setAttribute('aria-pressed','false');hold.classList.add('bonus-hold');
 const shots=el('div','bonus-shot-actions');shots.append(single,hold);
 const pause=button('一時停止',()=>{if(!game)return;stopHolding();if(game.status==='paused'){game.resume();status.textContent='再開しました。';}else{game.pause();status.textContent='一時停止中です。';}last=performance.now();update();},'button secondary');
 const quit=button('ここで終了',()=>{stopHolding();game?.end();update();},'quiet-button');
 const optionRow=el('div','bonus-options'),sound=el('input'),motion=el('input');sound.type='checkbox';sound.id='bonus-sound';sound.checked=false;motion.type='checkbox';motion.checked=localStorage.getItem('mix-reduce-motion')==='true'||matchMedia('(prefers-reduced-motion: reduce)').matches;
 optionRow.append(field('音を鳴らす（初期OFF）',sound),field('動きを減らす',motion));listen(sound,'change',()=>audio.setEnabled(sound.checked));listen(motion,'change',()=>{localStorage.setItem('mix-reduce-motion',String(motion.checked));node.classList.toggle('bonus-reduced-motion',motion.checked);});
 const actions=el('div','bonus-pause-actions');actions.append(pause,quit);
 controls.append(stats,passes,current,status,powerRow,shots,actions,optionRow,el('p','small muted','玉が動いている間も次の球を発射できます。画面内は最大12球。Spaceで1球、←→で強さ、Pで一時停止。'));
 const result=el('section','bonus-result');result.id='bonus-result';result.hidden=true;
 const testMark=el('p','bonus-test-mark','検証モード：穴への投入・玉数変更を使える、通常プレイとは別の記録です。');testMark.id='bonus-test-mark';testMark.hidden=!debug;
 const tools=el('details','bonus-debug');tools.hidden=!debug;tools.append(el('summary','','検証用の操作'));const testStage=labeledSelect('確認する段',[[0,'釘の盤面'],[1,'1段目'],[2,'2段目'],[3,'3段目']],'1');const lost=el('strong','','0');lost.id='bonus-lost';const lostLine=el('p','small muted','回収された玉：');lostLine.append(lost,document.createTextNode('球'));tools.append(lostLine);tools.append(testStage,el('p','small muted','玉を指定した場所に置き、通常と同じ物理判定で確認します。隠れた当落の変更はしません。'));
 for(const [label,outcome]of [['皿の縁から投入','natural'],['当たり穴で落下を確認','win'],['外れ穴で落下を確認','miss']])tools.append(button(label,()=>{if(game?.debugDrop(Number(testStage.querySelector('select').value),{outcome})){status.textContent='検証用の玉を投入しました。';update();}},'button secondary'));
 tools.append(button('残り玉を0にする',()=>{game?.debugEmpty();update();},'button secondary'),el('p','small muted',`シード：${seed.value}。同じ難易度・強さ・発射時刻なら動きを再現できます。`));
 const rules=el('details','bonus-rules');rules.append(el('summary','','遊び方と判定について'),el('p','','発射した玉が入口に入ると、1段目の皿へ。各段の金色の穴に入れば次へ進み、3段目を突破すると10,000点。暗い穴に入ると回収されます。残り玉が0になり、動いている玉がすべて落ちると結果が出ます。'),el('p','','皿は上から見た形を楕円で表しています。玉の中心が穴の落下範囲に入ると、そのまま落ちます。穴の大きさ・配置・入口幅によって難しさが変わります。隠れた当落抽選はありません。'),el('p','','画面を離れると一時停止します。戻ったら「再開する」を押してください。発射から60秒を超えた玉や計算異常の玉は、詰まり防止のため回収し、画面でお知らせします。スコアは端末内だけの表示で、送信・換金・景品交換はありません。'));
 layout.append(machine,controls);node.append(heading,setup,testMark,layout,tools,result,rules);
 function describe(){const mode=difficulty.querySelector('select').value;description.textContent=mode==='practice'?'入口と金色の穴を広くした練習台。まずは3段突破を体験。':mode==='normal'?'入口と当たり穴が小さくなります。狙う強さと玉の行方を見比べよう。':'当たり穴がさらに小さく、外れ穴も多い台。難しい分、一球の行方をじっくり見守ろう。';}
 function setPower(value){power=Math.max(0,Math.min(100,Math.round(value)));strength.value=String(power);powerValue.value=String(power);powerValue.textContent=String(power);strength.setAttribute('aria-valuetext',`${power} / 100`);}
 function fire(){if(!game)return;if(game.fire(power))update();}
 function stopHolding(){held=false;hold.setAttribute('aria-pressed','false');}
 function startGame(){stopHolding();game=createGame({difficulty:difficulty.querySelector('select').value,seed:seed.value||'cafe',debug});lastEvent=0;last=performance.now();setup.hidden=true;controls.hidden=false;result.hidden=true;status.textContent='強さを調整して、1球発射してください。';update();if(matchMedia('(max-width:700px)').matches)requestAnimationFrame(()=>machine.scrollIntoView({block:'start',behavior:'instant'}));}
 function update(){
  if(!game)return;node.dataset.phase=game.status;
  for(const key of Object.keys(values))values[key].textContent=key==='elapsed'?clock(game.elapsed):String(game[key]);
  lost.textContent=String(game.lost);game.passes.forEach((count,i)=>node.querySelector(`#bonus-pass-${i+1}`).textContent=String(count));
  const stage=Math.max(0,...game.balls.map(b=>b.stage));current.textContent=game.balls.length?`${stage?`${stage}段目`:'釘の盤面'}に注目 / 動いている玉 ${game.balls.length}球`:'次の1球をどうぞ';
  pause.textContent=game.status==='paused'?'再開する':'一時停止';pause.disabled=game.status==='finished';
  single.disabled=hold.disabled=game.status!=='running'||!game.remaining;quit.disabled=game.status==='finished';
  if(game.status==='finished'&&result.hidden){
   stopHolding();result.hidden=false;result.replaceChildren(el('p','eyebrow',debug||game.debugUsed?'TEST RESULT':'CHALLENGE RESULT'),el('h2','','今回のチャレンジ結果'),el('p','bonus-result-score',`${game.score.toLocaleString('ja-JP')}点`),el('p','',`大当たり ${game.jackpots}回 / 発射 ${game.fired}球 / ${clock(game.elapsed)}`),el('p','small muted',game.endReason==='quit'?'途中で終了しました。動いていた玉は回収しました。':'すべての玉の行方が決まりました。'),button('もう一度挑戦',()=>{game=null;setup.hidden=false;controls.hidden=true;result.hidden=true;node.dataset.phase='setup';lastEvent=0;describe();},'button'),button('Unity MIXへ戻る',onBack,'quiet-button'));
  }
 }
 listen(hold,'pointerdown',event=>{if(event.button!==0||hold.disabled)return;event.preventDefault();hold.setPointerCapture(event.pointerId);held=true;hold.setAttribute('aria-pressed','true');fire();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])listen(hold,name,stopHolding);listen(window,'pointerup',stopHolding);listen(hold,'blur',stopHolding);listen(window,'keyup',event=>{if(['Space','Enter'].includes(event.code))stopHolding();});
 listen(hold,'keydown',event=>{if(['Space','Enter'].includes(event.code)&&!event.repeat&&!hold.disabled){event.preventDefault();held=true;hold.setAttribute('aria-pressed','true');fire();}});listen(hold,'keyup',event=>{if(['Space','Enter'].includes(event.code)){event.preventDefault();stopHolding();}});
 listen(node,'keydown',event=>{if(event.target.matches('input,select,textarea,button,a,summary'))return;if(event.code==='Space'){event.preventDefault();if(!event.repeat)fire();}else if(event.code==='ArrowLeft'){event.preventDefault();setPower(power-5);}else if(event.code==='ArrowRight'){event.preventDefault();setPower(power+5);}else if(event.code==='KeyP'){event.preventDefault();pause.click();}});
 function autoPause(){stopHolding();if(game?.status==='running'){game.pause();status.textContent='画面を離れたため一時停止しました。「再開する」で続けられます。';update();}}
 listen(document,'visibilitychange',()=>{if(document.hidden)autoPause();last=performance.now();});listen(window,'blur',autoPause);listen(window,'pagehide',autoPause);
 function resize(){const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(WIDTH*dpr),h=Math.round(HEIGHT*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(dpr,0,0,dpr,0,0);}
 listen(window,'resize',resize);resize();describe();setPower(power);node.classList.toggle('bonus-reduced-motion',motion.checked);
 function frame(now){if(destroyed)return;const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;if(game?.status==='running'){if(held)fire();game.step(dt);}const active=game||preview;drawBoard(ctx,active,{reducedMotion:motion.checked,time:active.elapsed});
  if(game){for(const event of game.events)if(event.id>lastEvent){lastEvent=event.id;audio.play(event.type);if(event.type==='jackpot')status.textContent='大当たり！3段突破、10,000点を獲得しました。';else if(event.type==='pass')status.textContent=`${event.stage}段目を突破しました。`;else if(event.type==='recover')status.textContent='発射から60秒経過、または計算異常のため玉を回収しました。';}if(now-lastUpdate>=100){lastUpdate=now;update();}}
  raf=requestAnimationFrame(frame);
 }
 raf=requestAnimationFrame(frame);
 return{node,destroy(){destroyed=true;stopHolding();cancelAnimationFrame(raf);abort.abort();audio.destroy();}};
}
