import {difficultyLabel,formatSetting,shipVisual,missionPanel,updateMissionPanel,quickControls,manual,settingsPanel,pauseAudioSettings,updateSettingPreview} from './menu-ui.js';
import {ITEM_UI} from './feedback.js';
import {FlightUI,itemGuide} from './flight-ui.js';
import {touchAnchor} from './input.js';
import {Game,GAME_VERSION} from './core.js';
import {ShootingRenderer} from './renderer.js';
import * as D from './data.js';
import * as S from './save.js';
import {AudioEngine} from './audio.js';
const $=s=>document.querySelector(s), menu=$('#menu'),flight=$('#flight'),overlay=$('#overlay');
let overlayReturnFocus=null;
let canvas=$('#canvas');
const flightUI=new FlightUI();
const modeLabels={campaign:'ストーリー',score:'スコア',daily:'今日の挑戦',bossrush:'ボスと連戦',time:'タイム'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let profile;try{profile=S.loadProfile()}catch{profile=S.createProfile();profile.storageError=true}if(!profile)profile=S.createProfile();
const checkpointState=S.loadCheckpointState();let resumeCheckpoint=checkpointState.checkpoint,retiredCheckpoint=checkpointState.retired;
const audio=new AudioEngine();Object.assign(audio,{bgm:profile.settings.bgm,se:profile.settings.se});
let renderer=null,rendererError='',graphicsLost=false,graphicsRetrying=false,forceAutofire=false;
function graphicsReady(){return !!renderer&&!graphicsLost;}
function initializeGraphics(){
 try{renderer=new ShootingRenderer(canvas,{quality:profile.settings.quality,reduced:profile.settings.reduced});renderer.setEffects(profile.settings);rendererError='';graphicsLost=false;return true;}
 catch(error){renderer=null;rendererError='ゲーム画面を起動できませんでした。';return false;}
}
initializeGraphics();

let game=null,paused=false,replaying=false,resumingCheckpoint=false,resumeTarget=0,recording=null,replayIndex=0,replayInput={},lastInput='',acc=0,last=0,lastHud=0,lastCheckpointSave=0,checkpointWarning=false,lastRunReward=null,currentPage='title',rankMode='all',tab='ship',selection={ship:0,weapon:0,support:0,difficulty:'normal',mode:'campaign',stage:0},runId='',awarded=new Set(),keys=new Set(),pulses={},touch={focus:false},pointer=null;
const catalogs={ship:D.SHIPS,weapon:D.WEAPONS,support:D.SUPPORTS};
const codexCatalogs={enemies:D.ENEMIES,weapons:D.WEAPONS,items:D.ITEMS,patterns:D.PATTERNS,ships:D.SHIPS,supports:D.SUPPORTS,bosses:[...D.STAGES.map(s=>({id:s.id,name:s.bossName,description:`${s.name}の守護機。中ボス：${s.midName}。部位を破壊すると射撃間隔が広がります。`})),{id:6,name:'真核・アカツキ零式',description:'最終航路で無被弾、または累計12部位破壊を達成して現れる真の守護者。'}],materials:[{id:'common',name:'通常素材 / COMMON',description:'敵撃破とC回収で入手。恒久強化・兵装開発に使います。'},{id:'uncommon',name:'良質素材 / UNCOMMON',description:'航路突破で入手。兵装・支援機のLv2以降の開発に使用。'},{id:'rare',name:'希少素材 / RARE',description:'部位破壊とR回収で入手。秘密機体とLv3以降の開発に使用。'},{id:'epic',name:'特級素材 / EPIC',description:'ボス撃破・X回収で入手。秘密支援とLv5開発に使用。'},{id:'legendary',name:'伝説素材 / LEGENDARY',description:'真の守護者を倒すと入手。融合主砲の永久開発に使用。'}]};

try{const saved=JSON.parse(localStorage.getItem('unity-shooting-equipment')||'null');for(const [k,list] of [['ship','unlockedShips'],['weapon','unlockedWeapons'],['support','unlockedSupports']])if(profile[list].includes(saved?.[k]))selection[k]=saved[k]}catch{}
function saveEquipment(){try{localStorage.setItem('unity-shooting-equipment',JSON.stringify({ship:selection.ship,weapon:selection.weapon,support:selection.support}))}catch{toast('装備の選択を保存できませんでした。')}}
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3500)}
function persist(){let ok=false;try{ok=S.saveProfile(profile)}catch{}if(!ok)toast('保存できません。ブラウザの保存容量・設定を確認してください。');return ok}
function saveCheckpoint(advanceAfterStageClear=false){
 if(!game||replaying||!recording||!['play','stageclear'].includes(game.phase))return false;
 const replay=structuredClone(recording);
 if(advanceAfterStageClear&&game.phase==='play'){
  const safe={dx:0,dy:0,focus:false,bomb:false,special:false,overdrive:false,fire:profile.settings.autofire||forceAutofire};
  const last=replay.inputs.at(-1);if(!last||last[0]<game.tick)replay.inputs.push([game.tick,safe]);else if(last[0]===game.tick)last[1]=safe;
  replay.endTick=game.tick+1;lastInput=JSON.stringify(safe);
 }else replay.endTick=game.tick;
 const checkpoint={version:1,gameVersion:GAME_VERSION,savedAt:Date.now(),stage:game.stage,forceAutofire,replay,...(lastRunReward?{reward:structuredClone(lastRunReward)}:{})};
 if(!S.saveCheckpoint(checkpoint)){if(!checkpointWarning){toast('中断データを保存できませんでした。ブラウザの保存容量を確認してください。');checkpointWarning=true;}return false;}
 resumeCheckpoint=checkpoint;checkpointWarning=false;lastCheckpointSave=performance.now();return true;
}
function clearCheckpoint(){S.clearCheckpoint();resumeCheckpoint=null;retiredCheckpoint=false;checkpointWarning=false;}
function unlockGoal(){
 const groups=[['機体',D.SHIPS,profile.unlockedShips],['主兵装',D.WEAPONS,profile.unlockedWeapons],['支援機',D.SUPPORTS,profile.unlockedSupports]];
 const choices=groups.flatMap(([kind,rows,owned])=>rows.filter(row=>!owned.includes(row.id)&&!(row.secret&&!profile.secret)&&!((kind==='機体'&&row.id===7||kind==='主兵装'&&row.id===19||kind==='支援機'&&row.id===14)&&!profile.secret)).map(row=>({kind,row})));
 choices.sort((a,b)=>a.row.cost-b.row.cost);const next=choices[0];if(!next)return 'すべての機体と武器が使えます。';
 const left=Math.max(0,next.row.cost-profile.credits);return left?`次に使える機体：${next.row.name}（あと ${left.toLocaleString()}コイン）`:`次の目標：${next.row.name}（パワーアップで解放）`;
}
function button(label,action,cls=''){return `<button class="${cls}" data-do="${action}" ${['owned','locked'].includes(action)||(['launch','quickstart','replay','resume','resume-checkpoint'].includes(action)&&!graphicsReady())?'disabled':''}>${label}</button>`}
function top(title){const showFunds=['hangar','workshop'].includes(currentPage);return `<div class="toolbar"><div><div class="eyebrow">ゲームの準備</div><h2>${title}</h2></div><div>${showFunds?`<div class="balance">● ${Number(profile.credits||0).toLocaleString()} コイン<br><span class="muted">パーツ ${profile.materials.common}　良質 ${profile.materials.uncommon}　レア ${profile.materials.rare}　特別 ${profile.materials.epic}　伝説 ${profile.materials.legendary}</span></div>`:''}${button('もどる','title')}</div></div>`}
function renderGraphicsNotice(){
 const notice=$('#graphics-notice');if(!rendererError){notice.innerHTML='';return;}
 notice.innerHTML=`<section class="graphics-error" role="alert"><h2>${graphicsLost?'ゲーム画面の描画が停止しました':'ゲーム画面を起動できませんでした'}</h2><p>${graphicsLost?'プレイは一時停止しています。再試行して画面を復旧すると、続きから再開できます。':'発進を停止しています。再試行するか、対処方法を確認してください。進行データは削除しません。'}</p><button data-do="retry-graphics" ${graphicsRetrying?'disabled aria-busy="true"':''}>${graphicsRetrying?'画面を再準備しています…':'再試行'}</button><details><summary>対処方法を見る</summary><ul><li>ほかのタブやアプリを閉じてから再試行してください。</li><li>Safariなどのブラウザを最新版に更新し、ページを再読み込みしてください。</li><li>アプリ内ブラウザの場合は、SafariやChromeで直接開いてください。</li><li>PCではブラウザのハードウェアアクセラレーションが有効か確認してください。</li><li>改善しない場合は別のWebGL対応端末でお試しください。端末間でセーブは同期されません。</li></ul></details></section>`;
}
async function retryGraphics(){
 if(graphicsRetrying)return;graphicsRetrying=true;renderGraphicsNotice();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 try{renderer?.destroy();}catch{}renderer=null;
 const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);canvas=fresh;bindCanvasInput(canvas);
 initializeGraphics();graphicsRetrying=false;renderGraphicsNotice();
 if(game&&!flight.hidden){if(graphicsReady()&&game.phase!=='play'){finish();return;}showOverlay(graphicsReady()?'描画が復旧しました':'描画を復旧できませんでした','<p>出撃中の状態は保持しています。</p>',graphicsReady()?button('再開','resume','primary'):button('再試行','retry-graphics')+button('撤退（報酬なし）','abandon'));}
 else renderPage();
}

function navigate(page){renderer?.clearPresentation();currentPage=page;menu.hidden=false;flight.hidden=true;document.body.classList.remove('playing');audio.theme='title';renderPage();window.scrollTo(0,0)}
function renderPage(){let html='';if(currentPage==='title'){const savedName=D.STAGES[resumeCheckpoint?.stage??0]?.name||'航路';html=`<div class="hero"><div class="eyebrow">スマホで遊べる縦スクロールゲーム</div><h1>翠星航路</h1><p class="lead">指で機体を動かして、敵をよけよう。<br>弾は自動で出るから、まずは気軽に遊んでみて。</p>${quickControls()}<div class="start-choices">${resumeCheckpoint?button(`つづきから遊ぶ · ${esc(savedName)}`,'resume-checkpoint','primary'):''}${button('すぐ遊ぶ（おすすめ）','quickstart',resumeCheckpoint?'':'primary')}${button('機体や強さを選ぶ','hangar')}</div>${retiredCheckpoint?'<p class="muted recommended-caption">ゲーム更新により古い中断データとリプレイは再生できません。機体・強化・記録は引き継がれています。</p>':resumeCheckpoint?'<p class="muted recommended-caption">前回の続きはこのスマホに保存されています。</p>':'<p class="muted recommended-caption"><span>おすすめ：はじめての人向け設定</span><span>かんたん・弾は自動</span></p>'}</div><div class="nav">${[['workshop','パワーアップ'],['stages','ステージを選ぶ'],['ranking','記録'],['achievements','チャレンジ'],['codex','ずかん'],['settings','設定'],['help','遊び方']].map(([a,l])=>button(l,a)).join('')}</div><div class="panel row"><span class="eyebrow">これまでの記録</span><span>プレイ ${profile.stats.runs||0}回</span><span>敵 ${(profile.stats.kills||0).toLocaleString()}体</span><span>クリア ${profile.stats.clears||0}回</span>${button('リプレイを見る','replay')}</div>`}
else if(['hangar','workshop'].includes(currentPage)){const shop=currentPage==='workshop';html=top(shop?'パワーアップ':'あそび方と機体');if(!shop)html+=missionPanel(selection,button);html+=`<div class="tabs">${[['ship','機体'],['weapon','メイン武器'],['support','おたすけ'],...(shop?[['upgrade','ずっと強くする']]:[])].map(([v,l])=>button(l,'tab:'+v,tab===v?'active':'')).join('')}</div>${tab==='ship'?'<p class="muted">この機体の得意なところがメーターでわかります。</p>':''}<div class="grid">`;if(tab==='upgrade'){html+=Object.entries({armor:'装甲',energy:'エネルギー',magnet:'回収磁場',power:'火力'}).map(([id,name])=>`<div class="card"><div class="number">パワーアップ</div><h3>${name}</h3><p class="upgrade-benefit">${({armor:"2段階ごとに最大耐久 +1",energy:"1段階ごとに最大エネルギー +12",magnet:"1段階ごとに補給の回収半径 +12",power:"1段階ごとに主砲威力 +5%"})[id]}</p><p>強化 ${profile.upgrades[id]||0} / 5<br>${[500,1200,2400,4200,6800][profile.upgrades[id]||0]||'—'} コイン + パーツ ${2+(profile.upgrades[id]||0)*3}<br>持っているパーツ ${profile.materials.common}</p>${button('強化する','upgrade:'+id)}</div>`).join('')}else{html+=catalogs[tab].map((d,i)=>{const unlocked=profile['unlocked'+({ship:'Ships',weapon:'Weapons',support:'Supports'}[tab])]?.includes(d.id);return `<div class="card ${selection[tab]===d.id?'selected':''} ${!unlocked?'locked':''}"><div class="number">${({ship:'機体',weapon:'武器',support:'おたすけ'})[tab]} ${i+1}</div>${tab==='ship'?shipVisual(d):`<div class="shipmark">${tab==='weapon'?'⌁':'◈'}</div>`}${tab==='ship'?'':`<h3>${esc(d.name)}</h3>`}<p>${esc(d.description)}</p>${shop?(unlocked&&tab!=='ship'?`<span class="badge">開発 Lv.${profile[tab+'Levels']?.[d.id]||0} / 5</span><p>${(profile[tab+'Levels']?.[d.id]||0)>=5?'最大開発':`${[400,800,1600,2800,4400][profile[tab+'Levels']?.[d.id]||0]}コイン · パーツ ${3+(profile[tab+'Levels']?.[d.id]||0)*3}${(profile[tab+'Levels']?.[d.id]||0)>=1?' · 良質パーツ 2':''}${(profile[tab+'Levels']?.[d.id]||0)>=2?' · レアパーツ 1':''}${(profile[tab+'Levels']?.[d.id]||0)>=4?' · 特別パーツ 1':''}`}</p>${button((profile[tab+'Levels']?.[d.id]||0)>=5?'最大開発':'開発する',(profile[tab+'Levels']?.[d.id]||0)>=5?'owned':'develop:'+tab+':'+d.id)}`:button(unlocked?'持っています':`${d.cost.toLocaleString()}コイン${tab==='ship'&&d.id===7?'＋レアパーツ1':tab==='support'&&d.id===14?'＋特別パーツ1':tab==='weapon'&&d.id===19?'＋伝説パーツ1':''}${(tab==='ship'&&d.id===7||tab==='support'&&d.id===14||tab==='weapon'&&d.id===19)?'（全ステージクリア後）':''} · 買う`,unlocked?'owned':'buy:'+tab+':'+d.id)):button(unlocked?(selection[tab]===d.id?'使用中':'これにする'):'パワーアップで解放',unlocked?'equip:'+tab+':'+d.id:'workshop')}</div>`}).join('')}html+='</div>'}
else if(currentPage==='stages'){html=top('ステージを選ぶ')+`<div class="grid">${D.STAGES.map((s,i)=>{let open=profile.stages.includes(s.id)||(i===5&&profile.secret);return `<div class="card"><div class="number">ステージ ${i+1}</div><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p>${button(open?'このステージで遊ぶ':'まだ選べません · 前のステージをクリアしよう',open?'stage:'+s.id:'locked')}</div>`}).join('')}</div>`}
else if(currentPage==='settings'){html=top('設定')+settingsPanel(profile)}
else if(currentPage==='achievements'){const list=S.getAchievements(profile);html=top('チャレンジ')+`<p class="muted">${profile.achievements.length} 個の実績を獲得</p><div class="grid">${(list?.length?list:D.ACHIEVEMENTS).map(a=>`<div class="card"><div class="number">${a.unlocked||profile.achievements.includes(a.id)?'◆ 達成':'◇ これから'}</div><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><span class="badge">${a.progress??0} / ${a.target??1}</span></div>`).join('')}</div>`}
else if(currentPage==='codex'){html=top('ずかん')+`<div class="tabs">${[['enemies','敵機'],['weapons','兵装'],['items','アイテム'],['patterns','弾幕'],['ships','機体'],['supports','支援機'],['bosses','ボス'],['materials','素材']].map(([v,l])=>button(l,'codex:'+v,tab===v?'active':'')).join('')}</div><div class="grid">${(codexCatalogs[tab]||D.ENEMIES).map(d=>`<div class="card"><span class="number">${esc(d.id)}</span><h3>${esc(d.name)}</h3>${tab==='items'&&ITEM_UI[d.id]?`<span class="item-chip" style="--item:${ITEM_UI[d.id].color}">${ITEM_UI[d.id].symbol} ${ITEM_UI[d.id].label}</span>`:''}<span class="badge">${profile.seen[tab]?.includes(d.id)?'観測済み':'資料'}</span><p>${esc(tab==='items'&&ITEM_UI[d.id]?ITEM_UI[d.id].hint:d.description||d.behavior||'実戦で挙動を観測し、回避の航路を見極めよう。')}</p></div>`).join('')}</div>`}
else if(currentPage==='ranking'){html=top('記録')+`<p class="muted">このスマホに保存された記録です。</p><label>あそび方 <select id="rankmode">${[['all','すべて'],['campaign','ストーリー'],['score','スコア'],['daily','今日の挑戦'],['bossrush','ボスと連戦'],['time','タイム']].map(([v,l])=>`<option value="${v}" ${rankMode===v?'selected':''}>${l}</option>`).join('')}</select></label><div class="panel"><table><thead><tr><th>順位</th><th>スコア</th><th>あそび方 / 強さ</th></tr></thead><tbody>${[...(profile.scores||[])].filter(s=>rankMode==='all'||s.mode===rankMode).sort((a,b)=>rankMode==='time'?(a.duration||Infinity)-(b.duration||Infinity):b.score-a.score).slice(0,30).map((s,i)=>`<tr><td>${i+1}</td><td>${Number(s.score).toLocaleString()}${s.mode==='time'?' / '+Number(s.duration||0).toFixed(1)+' 秒':''}</td><td>${esc(modeLabels[s.mode]||'作戦')} / ${difficultyLabel(s.difficulty)}</td></tr>`).join('')}</tbody></table>${!profile.scores.length?'<p class="empty">まだ記録がありません。最初の航路へ。</p>':''}</div>${button('保存リプレイを再生','replay')}`}
else html=top('遊び方')+manual(itemGuide);
menu.innerHTML=html;renderGraphicsNotice();if(profile.storageError)toast('保存領域が利用できません。今回の進行は保存されない場合があります。')}
function seed(){if(selection.mode==='daily'){let n=2166136261;for(const c of new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}return crypto.getRandomValues(new Uint32Array(1))[0]}
function start(options={},replay=null,recommendedAuto=false,resuming=false){
 if(!graphicsReady()){renderGraphicsNotice();return null;}
 if(!resuming&&!replay)clearCheckpoint();
 forceAutofire=recommendedAuto;audio.resume();replaying=!!replay;resumingCheckpoint=!!resuming;
 const opts=replay?.options||{...selection,seed:seed(),upgrades:{...profile.upgrades},weaponLevels:{...profile.weaponLevels},supportLevels:{...profile.supportLevels},...options,runId:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`};
 if(!replay&&opts.mode==='score'){opts.difficulty='normal';opts.stage=0;}if(!replay&&opts.mode==='daily'){opts.difficulty='hard';opts.stage=opts.seed%5;}
 renderer?.clearPresentation();game=new Game(opts);flightUI.reset();runId=opts.runId;
 recording=replay?structuredClone(replay):{version:1,gameVersion:GAME_VERSION,options:JSON.parse(JSON.stringify(game.options||opts)),inputs:[],endTick:0};
 resumeTarget=resuming?recording.endTick:0;lastInput='';replayIndex=0;replayInput={};paused=false;acc=0;keys.clear();pulses={};touch={focus:false};document.querySelector('[data-action=focus]').setAttribute('aria-pressed','false');pointer=null;overlay.hidden=true;menu.hidden=true;flight.hidden=false;document.body.classList.add('playing');flightUI.update(game,{replaying,autofire:profile.settings.autofire||forceAutofire});renderer?.resize();audio.theme='stage';last=performance.now();canvas.focus({preventScroll:true});
 if(resuming){lastRunReward=resumeCheckpoint?.reward||null;showOverlay('中断地点を復元しています',`<p class="muted">前回の入力履歴から出撃状態を戻しています。</p><p id="resume-progress" class="muted">0%</p>`,'');}
 return game;
}
function capture(){let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}let input={dx,dy,focus:keys.has('Shift')||touch.focus,bomb:!!pulses.bomb,special:!!pulses.special,overdrive:!!pulses.overdrive,fire:profile.settings.autofire||forceAutofire||touch.fire||keys.has(' ')||keys.has('z')};if(pointer){input.targetX=Math.round(pointer.tx*10)/10;input.targetY=Math.round(pointer.ty*10)/10}pulses={};return input}
function finish(){
 if(replaying&&!resumingCheckpoint){paused=true;showOverlay('リプレイ終了',`<p class="resultscore">${game.stats.score.toLocaleString()}</p>`,button('ハンガーへ','exit'));return;}
 const id=runId+':'+game.stage;
 if(!awarded.has(id)){
  const creditsBefore=profile.credits,materialsBefore={...profile.materials},result={...game.result,runId:id};
  try{const reward=S.recordResult(profile,result,{...game.options,mode:game.options.mode,difficulty:game.options.difficulty,ship:game.options.ship,weapon:game.options.weapon,stage:game.stage});if(!reward?.ok)toast(reward?.message||'戦績の記録に失敗しました。');persist();lastRunReward={credits:Math.max(0,profile.credits-creditsBefore),materials:Object.fromEntries(Object.keys(profile.materials).map(k=>[k,Math.max(0,profile.materials[k]-(materialsBefore[k]||0))]))};}
  catch(e){console.error(e);toast('戦績を保存できませんでした。');lastRunReward={credits:0,materials:{}};}
  awarded.add(id);recording.endTick=game.tick;try{if(S.saveReplay(recording)===false)toast('リプレイを保存できませんでした。')}catch{toast('リプレイを保存できませんでした。')}
 }
 resumingCheckpoint=false;replaying=false;paused=true;const clear=game.phase==='stageclear';
 if(clear)saveCheckpoint();else clearCheckpoint();
 const resultBody=`<div class="eyebrow">${esc(({true:'真の中枢を解放',perfect:'無傷の航路',clear:'作戦成功',retry:game.result?.reason||'再挑戦'})[game.result?.ending]||game.result?.reason||'戦闘報告')}</div><div class="resultscore">${Number(game.result?.score??game.stats.score).toLocaleString()}</div><p>敵を倒した数 ${game.stats.kills}　かすり ${game.stats.graze}<br>ダメージを受けた回数 ${game.stats.misses}　プレイ時間 ${Number(game.result?.duration||0).toFixed(1)} 秒</p><section class="result-rewards"><h3>今回の報酬</h3><p><b>+${(lastRunReward?.credits||0).toLocaleString()} コイン</b>　現在 ${profile.credits.toLocaleString()}コイン</p><p>素材 ${Object.entries(lastRunReward?.materials||{}).filter(([,v])=>v>0).map(([k,v])=>({common:'パーツ',uncommon:'良質パーツ',rare:'レアパーツ',epic:'特別パーツ',legendary:'伝説パーツ'}[k]||k)+' +'+v).join(' / ')||'追加獲得なし'}</p><p class="muted">${esc(unlockGoal())}</p></section>`;
 const title=clear?'ステージクリア！':game.result?.clear?(game.options.mode==='campaign'&&game.stage===4?'全航路クリア':'クリア！'):'ゲーム終了';
 const actions=clear?button(`次のステージへ進む →`,'next','primary')+button('パワーアップ','result-workshop')+button('装備を変更','result-hangar'):button('再出撃','launch','primary')+button('パワーアップ','result-workshop')+button('装備を変更','result-hangar');
 showOverlay(title,resultBody,actions);
}
function nextReplayInput(){while(replayIndex<recording.inputs.length&&recording.inputs[replayIndex][0]<=game.tick)replayInput=recording.inputs[replayIndex++][1];return replayInput;}
function completeCheckpointResume(){
 const checkpoint=resumeCheckpoint;resumingCheckpoint=false;replaying=false;
 if(game.phase!=='play'){
  lastRunReward=checkpoint?.reward||lastRunReward;
  if(profile.recordedRuns.includes(`${runId}:${game.stage}`))awarded.add(`${runId}:${game.stage}`);
  recording.endTick=game.tick;finish();return;
 }
 recording.endTick=0;lastInput=JSON.stringify(replayInput||{});paused=false;acc=0;last=performance.now();overlay.hidden=true;
 saveCheckpoint();audio.resume();toast('中断した出撃を再開しました。');
}
function restoreCheckpointFrame(now){
 let steps=0;
 while(steps<180&&game.tick<resumeTarget&&game.phase==='play'){
  const input=nextReplayInput();game.update(1/120,input);game.drainEvents();steps++;
 }
 if(game.phase==='stageclear'&&game.tick<resumeTarget){game.nextStage();renderer?.clearPresentation();}
 if(game.tick>=resumeTarget||game.phase!=='play'){completeCheckpointResume();return;}
 const progress=resumeTarget?Math.min(99,Math.floor(game.tick/resumeTarget*100)):100,indicator=$('#resume-progress');if(indicator)indicator.textContent=`${progress}%`;
 if(graphicsReady())renderer.render(game,0);if(now-lastHud>100){lastHud=now;flightUI.update(game,{replaying:true,autofire:profile.settings.autofire||forceAutofire,paused:true});}
}
function overlayControls(){return [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href],[tabindex="0"]')].filter(control=>control.getClientRects().length>0);}
function showOverlay(title,body,buttons){if(overlay.hidden)overlayReturnFocus=document.activeElement;overlay.classList.toggle('victory-reveal',!!game?.result?.clear&&!profile.settings.reduced);overlay.classList.toggle('stage-clear-actions',game?.phase==='stageclear'&&buttons.includes('data-do="next"'));overlay.innerHTML=`<div class="modal"><div class="report-body"><div class="eyebrow">SEISEI KŌRO</div><h2 id="overlay-title">${title}</h2>${body}</div><div class="report-actions">${buttons}</div></div>`;overlay.hidden=false;(overlay.querySelector('button.primary:not(:disabled)')||overlayControls()[0]||overlay).focus({preventScroll:true});}
function openSoundSettings(){if(game&&!flight.hidden){if(game.phase==='play')pause();if(overlay.hidden)return;let settings=overlay.querySelector('.pause-audio');if(!settings){overlay.querySelector('.report-body').insertAdjacentHTML('beforeend',pauseAudioSettings(profile.settings));settings=overlay.querySelector('.pause-audio');}settings.open=true;settings.scrollIntoView({block:'nearest'});settings.querySelector('input').focus({preventScroll:true});}else navigate('settings');}

function pause(){if(!game||replaying||game.phase!=='play')return;saveCheckpoint();if(paused)return;paused=true;keys.clear();pulses={};pointer=null;touch.focus=false;touch.fire=false;document.querySelector('[data-action=focus]').setAttribute('aria-pressed','false');audio.suspend();showOverlay('一時停止',`<p class="muted">再開するまで敵も補給も止まります。</p>${flightUI.summary(game)}${pauseAudioSettings(profile.settings)}`,button('再開','resume','primary')+button('撤退（報酬なし）','abandon'))}
function resume(){if(!graphicsReady()){renderGraphicsNotice();return}if(!game||game.phase!=='play')return;paused=false;pulses={};keys.clear();touch.fire=false;pointer=null;acc=0;last=performance.now();overlay.hidden=true;audio.resume();const target=overlayReturnFocus?.isConnected&&overlayReturnFocus.getClientRects().length?overlayReturnFocus:canvas;target.focus({preventScroll:true})}
function loop(now){
 requestAnimationFrame(loop);if(!game||flight.hidden){last=now;return;}
 if(resumingCheckpoint){restoreCheckpointFrame(now);return;}
 const elapsed=Math.max(0,(now-last)/1000);last=now;
 if(!paused){acc+=elapsed;let steps=0;while(acc>=1/120&&steps<60&&!paused){let input;if(replaying)input=nextReplayInput();else{input=capture();const encoded=JSON.stringify(input);if(encoded!==lastInput){const lastTransition=recording.inputs.at(-1);if(lastTransition?.[0]===game.tick)lastTransition[1]=input;else recording.inputs.push([game.tick,input]);lastInput=encoded;}}
   game.update(1/120,input);for(const e of game.drainEvents()){renderer?.event(e);audio.event(e);flightUI.event(e,game.time);}acc-=1/120;steps++;
   if(game.phase!=='play'){if(replaying&&game.phase==='stageclear'&&game.tick<recording.endTick){game.nextStage();renderer?.clearPresentation();audio.theme='stage';}else finish();}
   else if(replaying&&game.tick>=recording.endTick)finish();
  }}
 if(!paused&&!replaying&&game.phase==='play'&&now-lastCheckpointSave>=10000)saveCheckpoint();
 audio.theme=game.phase!=='play'?'title':game.player.driveTime>0?'overdrive':game.boss?(game.stage>=4?'final':'boss'):'stage';if(graphicsReady())renderer.render(game,Math.min(1,acc*120));if(now-lastHud>100){lastHud=now;flightUI.update(game,{replaying,autofire:profile.settings.autofire||forceAutofire,paused});}
}
async function action(a){audio.resume();const [cmd,v,w]=a.split(':');switch(cmd){case'retry-graphics':await retryGraphics();break;case'quickstart':start({ship:0,weapon:0,support:0,difficulty:'easy',mode:'campaign',stage:0},null,true);break;case'resume-checkpoint':{const checkpoint=resumeCheckpoint||S.loadCheckpoint();if(!checkpoint){resumeCheckpoint=null;toast('再開できる中断データがありません。');renderPage();break;}start({},checkpoint.replay,checkpoint.forceAutofire,true);break;}case'title':case'hangar':case'workshop':case'stages':case'settings':case'achievements':case'ranking':case'help':if(cmd==='hangar'||cmd==='workshop')tab='ship';navigate(cmd);break;case'result-workshop':tab='upgrade';navigate('workshop');break;case'result-hangar':tab='ship';navigate('hangar');break;case'codex':tab=v||'enemies';navigate('codex');break;case'tab':tab=v;renderPage();break;case'equip':selection[v]=Number(w);saveEquipment();renderPage();break;case'buy':{const r=S.purchase(profile,v,Number(w));toast(r.message);persist();renderPage();break}case'develop':{const r=S.develop(profile,v,Number(w));toast(r.message);persist();renderPage();break}case'upgrade':{const r=S.upgrade(profile,v);toast(r.message);persist();renderPage();break}case'stage':selection.stage=Number(v);navigate('hangar');break;case'launch':start();break;case'pause':pause();break;case'resume':resume();break;case'next':game.nextStage();renderer?.clearPresentation();paused=false;acc=0;last=performance.now();overlay.hidden=true;canvas.focus({preventScroll:true});audio.theme='stage';saveCheckpoint(true);break;case'exit':case'abandon':if(cmd==='abandon'){clearCheckpoint();recording.endTick=game.tick;if(!replaying)try{if(!S.saveReplay(recording))toast('リプレイを保存できませんでした。')}catch{toast('リプレイを保存できませんでした。')}}game=null;audio.resume();navigate('hangar');break;case'replay':try{const r=S.loadReplay();if(!r||!Array.isArray(r.inputs))toast('現在の版で再生できるリプレイがありません。新しい出撃を記録してください。');else start({},r)}catch{toast('リプレイを読み込めませんでした。')}break;}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-do]');if(b)action(b.dataset.do)});$('#sound').onclick=openSoundSettings;$('#pause').onclick=pause;
menu.addEventListener('change',e=>{if(e.target.id==='rankmode'){rankMode=e.target.value;renderPage()}if(e.target.id==='mode'){selection.mode=e.target.value;updateMissionPanel(selection)}if(e.target.id==='difficulty'){selection.difficulty=e.target.value;updateMissionPanel(selection)}});
function updateSetting(e){const id=e.target.dataset.setting;if(!id)return;profile.settings[id]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'||id==='particleAmount'?Number(e.target.value):e.target.value;if(e.target.nextElementSibling?.tagName==='OUTPUT')e.target.nextElementSibling.value=formatSetting(id,profile.settings[id]);updateSettingPreview(profile);audio.volumes(profile.settings.bgm,profile.settings.se);renderer?.setQuality(profile.settings.quality);renderer?.setReduced(profile.settings.reduced);renderer?.setEffects(profile.settings);persist()}
menu.addEventListener('input',updateSetting);overlay.addEventListener('input',updateSetting);
document.addEventListener('keydown',e=>{if(overlay.hidden||flight.hidden)return;if(e.key==='Escape'&&game?.phase==='play'){e.preventDefault();e.stopPropagation();if(!e.repeat)resume();return;}if(e.key!=='Tab')return;const controls=overlayControls(),index=controls.indexOf(document.activeElement);if(!controls.length){e.preventDefault();overlay.focus();return;}if(e.shiftKey?index<=0:index<0||index===controls.length-1){e.preventDefault();controls[e.shiftKey?controls.length-1:0].focus();}});
window.addEventListener('keydown',e=>{if(!game||flight.hidden||e.target.matches('input,select,textarea'))return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(!overlay.hidden&&k!=='Escape'&&k!=='p')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift'].includes(k))e.preventDefault();if((k==='Escape'||k==='p')&&!e.repeat){paused?resume():pause();return}if(paused||replaying)return;if(!keys.has(k)){if(k==='x')pulses.bomb=true;if(k==='c')pulses.special=true;if(k==='v')pulses.overdrive=true}keys.add(k)});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
function activateControl(b){if(!game||paused||replaying||b.disabled)return;if(b.dataset.action==='focus'){touch.focus=!touch.focus;b.setAttribute('aria-pressed',String(touch.focus))}else if(b.dataset.action==='fire')touch.fire=true;else pulses[b.dataset.action]=true;}
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('pointerdown',e=>{if(!game||paused||replaying||b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);activateControl(b)});
 b.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();if(!e.repeat)activateControl(b)});
 b.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(b.dataset.action==='fire')touch.fire=false;}});
 b.addEventListener('click',e=>{if(e.detail===0)activateControl(b)});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{if(b.dataset.action==='fire')touch.fire=false});
}
function bindCanvasInput(canvas){
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!game||flight.hidden){graphicsLost=true;rendererError='描画が停止しました。';renderPage();return;}pause();graphicsLost=true;rendererError='描画が停止しました。';renderGraphicsNotice();showOverlay('描画が停止しました','<p>状態を保持して一時停止しています。再試行してください。</p>',button('再試行','retry-graphics'));});
 canvas.addEventListener('pointerdown',e=>{if(!game||paused||replaying)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect(),anchor=touchAnchor(game.player,e.clientY,r,profile.settings.offset);pointer={id:e.pointerId,x:e.clientX,y:e.clientY,tx:anchor.x,ty:anchor.y};audio.start()});canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId||paused)return;const r=canvas.getBoundingClientRect(),s=Number(profile.settings.sensitivity);pointer.tx=Math.max(10,Math.min(470,pointer.tx+(e.clientX-pointer.x)*480/r.width*s));pointer.ty=Math.max(15,Math.min(705,pointer.ty+(e.clientY-pointer.y)*720/r.height*s));pointer.x=e.clientX;pointer.y=e.clientY});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>pointer=null);
}
bindCanvasInput(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.suspend();pause()}});window.addEventListener('pagehide',()=>saveCheckpoint());window.addEventListener('blur',pause);window.addEventListener('resize',()=>renderer?.resize());window.SHOOTING={get game(){return game},profile,get renderer(){return renderer},start,pause,resume,navigate,get paused(){return paused},get replaying(){return replaying}};navigate('title');requestAnimationFrame(loop);
