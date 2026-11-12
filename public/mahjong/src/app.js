import { characters, getCharacter } from './characters.js';
import { createCpuGame } from './cpu-game.js';
import { createMahjongSound } from './sound.js';
import { renderTile, tileLabel } from './tile-art.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = { discard:'打牌', riichi:'リーチ', riichi_discard:'リーチ', nine_terminals:'九種九牌', ron:'ロン', tsumo:'ツモ', chi:'チー', pon:'ポン', kan:'カン', ankan:'暗槓', kakan:'加槓', pass:'見送り', next:'次の局へ', nextHand:'次の局へ' };
function tableStatus(view,players,selfSeat,actions){
  if(view.status)return view.status;
  if(view.phase==='HAND_RESULT')return view.result?.type==='win'?'和了':view.result?.type==='nagashi'?'流し満貫':'流局';
  if(view.phase==='DISCARD'){
    if(view.activeSeat===selfSeat)return 'あなたの一手';
    const active=players[view.activeSeat];
    return active?`${active.name}の番`:'相手の一手を見守りましょう';
  }
  if(view.phase==='REACTION'){
    const canRon=actions.some(action=>action.type==='ron');
    const calls=[...new Set(actions.filter(action=>['chi','pon','kan'].includes(action.type)).map(action=>({chi:'チー',pon:'ポン',kan:'カン'}[action.type])))];
    if(canRon&&calls.length)return `ロンまたは${calls.join('・')}できます`;
    if(canRon)return 'ロンできます';
    if(calls.length)return `${calls.join('・')}できます`;
    return 'ほかの人の応答を待っています';
  }
  return '対局中';
}
function legalActionButton(action,index){
  return `<button data-legal="${index}">${escape(labels[action.type]||action.label||action.type)}${action.tile!==undefined?` ${escape(tileLabel(action.tile))}`:''}${action.tiles?` ${action.tiles.map(tile=>escape(tileLabel(tile))).join(' ')}`:''}</button>`;
}
export function createApp({ cpu = createCpuGame(), online = null, sound = createMahjongSound(), onChange = () => {} } = {}) {
  const state = { screen:'character', characterId:null, mode:'cpu', view:null, onlineState:null, connection:online?.status||'idle', selectedTile:null, moment:'idle', muted:true, soundAvailable:sound.available, reducedMotion:false, tutorial:false, busy:false, error:'' };
  const changed = () => onChange(state);
  const updateMoment = view => {const previous=state.view,duplicate=previous&&previous.revision===view?.revision&&previous.phase===view?.phase;if(duplicate)return;state.moment=transitionMoment(previous,view,view?.selfSeat??0)||'idle';if(state.moment!=='idle'&&!state.muted){let cue=state.moment;if(['win','loss'].includes(cue))cue=view.result?.winType==='ron'?'ron':'tsumo';if(cue==='call'){const old=previous?.players||[],next=view?.players||[],meld=next.flatMap((player,index)=>(player.melds||[]).slice(old[index]?.melds?.length||0)).at(-1);cue=meld?.type==='chi'?'chi':['pon','kan','ankan','kakan'].includes(meld?.type)?meld.type:'call';}sound.cue(cue);}};
  const receive = view => { updateMoment(view);state.view = view; state.screen = view.phase === 'MATCH_RESULT' ? 'result' : view.phase === 'LOBBY' ? 'lobby' : 'table'; state.selectedTile = null; };
  async function perform(work) { if (state.busy) return; state.busy = true; state.error = ''; changed(); try { receive(await work()); } catch (error) { state.error = error.message; } finally { state.busy = false; changed(); } }
  const app = {
    state,
    selectCharacter(id) { if (!getCharacter(id)) throw new Error('キャラクターを選択してください。'); state.characterId = id; state.screen = 'mode'; state.error = ''; changed(); },
    async selectMode(mode) { if (!state.characterId) throw new Error('キャラクターを選択してください。'); state.mode=mode; if (mode === 'online') { state.screen = 'lobby'; state.view = null; state.onlineState=online?.state||null; state.connection=online?.status||'idle'; changed(); } else if (mode === 'cpu') await perform(() => cpu.startCpuMatch(state.characterId)); else throw new Error('モードを選択してください。'); },
    setOnlineState(view) { state.mode='online';state.characterId ||= 'moka';state.onlineState=view; state.connection=online?.status||'connected';updateMoment(view);state.view=view; state.screen=view.phase==='MATCH_RESULT'?'result':view.phase==='LOBBY'?'lobby':'table'; state.selectedTile=null; changed(); },
    setConnection(value) { state.connection=value; changed(); },
    setOnlineError(error) { state.error=String(error||'接続に失敗しました。'); changed(); },
    async createOnlineRoom(name) { if(!online)throw new Error('オンライン接続を準備しています。'); state.error='';state.connection='connecting';changed();await online.createRoom(name);state.connection=online.status;changed(); },
    async joinOnlineRoom(code,name) { if(!online)throw new Error('オンライン接続を準備しています。'); state.error='';state.connection='connecting';changed();await online.joinRoom(code,name);state.connection=online.status;changed(); },
    async setReady(ready) { if(!online)throw new Error('オンライン接続を準備しています。'); await perform(async()=>{await online.setReady(ready);return online.state;}); },
    async startOnlineMatch() { if(!online)throw new Error('オンライン接続を準備しています。'); await perform(async()=>{await online.start();return online.state;}); },
    async leaveRoom() { if(!online)throw new Error('オンライン接続を準備しています。'); await online.leaveRoom();state.onlineState=null;state.view=null;state.screen='mode';state.connection='idle';state.error='';changed(); },
    selectTile(tile) { state.selectedTile = tile;if(!state.muted)sound.cue('tile'); changed(); },
    async discard() { const action = state.view?.legalActions?.find(a => a.type === 'discard' && String(a.tile) === String(state.selectedTile)); if (!action) throw new Error('打牌できる手牌を選択してください。'); await app.dispatch(action); },
    async dispatch(action) { if(state.mode==='online'){if(!online)throw new Error('オンライン接続を準備しています。');await perform(async()=>{await online.send(action.type,action);return online.state||state.view;});}else await perform(() => cpu.dispatchCpuAction(action)); },
    async continueHand() { if(state.mode==='online'){if(!online)throw new Error('オンライン接続を準備しています。');await perform(async()=>{await online.send('next');return online.state||state.view;});}else await perform(()=>cpu.continueMatch()); },
    toggleMute() { if(state.muted){state.muted=!sound.enableFromGesture();state.soundAvailable=sound.available;if(state.muted)state.error='この端末では音声を有効にできません。';else state.error='';}else{sound.disable();state.muted=true;} changed(); },
    toggleReducedMotion() { state.reducedMotion = !state.reducedMotion; changed(); },
    toggleTutorial() { state.tutorial = !state.tutorial; changed(); },
    back() { state.screen = 'character'; state.view = null; state.error = ''; changed(); }
  };
  return app;
}
function portrait(c, compact = false, expression = 'neutral') { const source=c.expressions?.[expression]||c.portrait; return `<span class="portrait portrait-${c.id}${compact?' portrait-compact':''} expression-${expression}" aria-hidden="true"><img src="${source}" alt="" loading="eager"></span>`; }
export function transitionMoment(previous,next,selfSeat=next?.selfSeat??0){
  if(!previous||!next)return null;
  if(['HAND_RESULT','MATCH_RESULT'].includes(next.phase)&&!['HAND_RESULT','MATCH_RESULT'].includes(previous.phase)){
    if(next.result?.type==='win')return next.result.winner===selfSeat?'win':'loss';
    return 'result';
  }
  const oldPlayers=previous.players||[],newPlayers=next.players||[],oldOwn=oldPlayers[selfSeat],newOwn=newPlayers[selfSeat];
  if(!oldOwn||!newOwn)return null;
  if(!oldOwn.riichi&&newOwn.riichi)return 'riichi';
  if(newPlayers.some((player,index)=>(player?.melds?.length||0)>(oldPlayers[index]?.melds?.length||0)))return 'call';
  if((newOwn.discards?.length||0)>(oldOwn.discards?.length||0))return 'discard';
  if((newOwn.hand?.length||0)>(oldOwn.hand?.length||0))return 'draw';
  return null;
}
function tileRiver(discardList,label){return `<div class="tile-river" role="list" aria-label="${escape(label)}">${(discardList||[]).map(d=>{const entry=d&&typeof d==='object'?d:{tile:d},tile=entry.tile??entry,classes=['river-tile',entry.riichi?'riichi-discard':'',entry.called?'called-discard':''].filter(Boolean).join(' '),status=[entry.riichi?'リーチ宣言牌':'',entry.called?'鳴かれた牌':''].filter(Boolean).join('・'),accessibleLabel=`${tileLabel(tile)}${status?`・${status}`:''}`;return `<span class="${classes}" role="listitem" aria-label="${escape(accessibleLabel)}">${renderTile(tile,{compact:true})}</span>`;}).join('')}</div>`;}
function meldDisplay(melds,label='副露'){return `<div class="meld-tiles" aria-label="${escape(label)}">${(melds||[]).map(m=>`<span class="meld-set"><span class="meld-kind">${escape(labels[m.type]||m.type)}</span>${(m.tiles||[]).map(tile=>`<span class="river-tile">${renderTile(tile,{compact:true})}</span>`).join('')}</span>`).join('')}</div>`;}
export function renderApp(state) {
  const c = getCharacter(state.characterId), view = state.view || {};
  let content = '';
  if (state.screen === 'character') content = `<div class="intro"><p class="eyebrow">UNITY · COFFEE & MAHJONG</p><h1>珈琲と、ひと局。</h1><p>四人の物語と囲む、いつもの卓。</p></div><h2 id="screen-title">キャラクターを選ぶ</h2><div class="characters">${characters.map(c => `<button class="character-card" data-character="${c.id}" style="--ink:${c.colors[0]};--accent:${c.colors[1]}" aria-label="${c.name}（${c.reading}）、${c.role}を選ぶ">${portrait(c)}<span class="reading">${c.reading}</span><strong>${c.name}</strong><span>${c.role}</span></button>`).join('')}</div>`;
  else if (state.screen === 'mode') content = `<div class="mode-layout"><div class="selected-character" style="--ink:${c.colors[0]};--accent:${c.colors[1]}">${portrait(c)}<h1 id="screen-title">${c.name}</h1><p>${c.greetings[0]}</p></div><div><p class="eyebrow">ひと息ついて、はじめよう</p><h2>遊び方を選ぶ</h2><button class="mode-card" data-mode="cpu"><strong>CPUと対局</strong><span>ひとりで楽しむ、東風戦</span></button><button class="mode-card" data-mode="online"><strong>友だちと対局</strong><span>4人で集まる、合言葉の卓</span></button><p class="note">4人打ちリーチ麻雀 · 25,000点持ち · 東風戦は最大12局</p></div></div>`;
  else if (state.screen === 'lobby') {
    const room=state.onlineState,players=room?.players||[],self=room?.selfSeat??0,allReady=players.length===4&&players.every(p=>p?.ready);
    const hostSeat=room?.hostSeat??0;
    content = `<h1 id="screen-title">友だちの待合室</h1><p>4人そろって、同じ卓へ。</p><p role="status">${escape({connected:'接続中',connecting:'接続しています…',authenticating:'部屋へ戻っています…',reconnecting:'再接続しています…',offline:'接続が切れました。再接続します。',idle:'ニックネームとルームコードで参加できます。'}[state.connection]||state.connection)}</p>${room?`<section class="online-room"><p>ルームコード <strong class="room-code">${escape(room.code)}</strong></p><ol class="seat-list">${[0,1,2,3].map(seat=>{const p=players[seat];return `<li>${p?`${escape(p.name)}${seat===hostSeat?' · 作成者':''} · ${p.connected?'接続中':'切断中'} · ${p.ready?'準備OK':'準備中'}`:'参加者を待っています'}</li>`;}).join('')}</ol><button data-action="ready" aria-pressed="${!!players[self]?.ready}">${players[self]?.ready?'準備を取り消す':'準備できた'}</button>${self===hostSeat?`<button data-action="start-online" ${allReady?'':'disabled'}>4人で対局開始</button>`:''}<p class="note">開始には4人全員の準備が必要です。30秒操作がないとツモ切りし、ロン・鳴きは見送ります。ルームは6時間で期限切れになり、サーバー再起動時は消える場合があります。</p></section>`:`<div id="online-lobby"><label>表示名<input name="player-name" maxlength="20" autocomplete="nickname" value="${escape(c?.name)}"></label><label>ルームコード<input name="room-code" autocomplete="off" inputmode="numeric" maxlength="4" pattern="[0-9]{4}"></label><div class="actions"><button data-action="create-room">ルームを作る</button><button data-action="join-room">ルームに参加</button></div></div>`}`;
  }
  else if (state.screen === 'table') {
    const players = view.players || [], actions = view.legalActions || [],selfSeat=view.selfSeat??0,own=players[selfSeat],opponents=[...players.slice(selfSeat+1),...players.slice(0,selfSeat)],riichiActionIndex=actions.findIndex(action=>action.type==='riichi_discard'&&String(action.tile)===String(state.selectedTile));
    const result=view.result||{},deltas=Array.isArray(result.deltas)?result.deltas:[],settlement=deltas.length?`<section class="hand-settlement" aria-label="この局の点数"><h2>この局の点数</h2><ul>${players.map((p,seat)=>{const delta=Number(deltas[seat]||0);return `<li>${escape(p.name)} <strong>${delta>0?'+':delta<0?'−':''}${Math.abs(delta).toLocaleString('ja-JP')}点</strong></li>`;}).join('')}</ul></section>`:'',tenpai=result.type==='exhaustive'&&Array.isArray(result.tenpai)?`<p class="hand-tenpai">聴牌：${result.tenpai.length?result.tenpai.map(seat=>escape(players[seat]?.name||`席${seat+1}`)).join('、'):'なし'}</p>`:'';
    content = `<h1 id="screen-title" class="table-heading">${escape(view.round || `東${view.handNumber||1}局`)} <small>親：${escape(players[view.dealer]?.name || '確認中')}</small></h1><div class="table moment-${escape(state.moment||'idle')}"><div class="opponents">${opponents.map(p => {const count=Math.max(0,Math.min(14,Number.isInteger(Number(p.handCount))?Number(p.handCount):0)),seat=Number.isInteger(p.seat)?p.seat:players.indexOf(p),wind=['東','南','西','北'][((seat-(view.dealer??0)+4)%4)];return `<section class="opponent"><h2>${escape(p.name)} <span class="seat-wind">${wind}家</span></h2><p>${escape(p.points)}点 · 手牌 ${escape(p.handCount ?? '–')}枚 ${p.riichi?'· リーチ':''}</p><div class="hidden-tiles" aria-hidden="true">${renderTile(null,{back:true,compact:true}).repeat(count)}</div>${meldDisplay(p.melds,`${p.name}の副露`)}${tileRiver(p.discards,`${p.name}の河`)}</section>`;}).join('')}</div><div class="table-center"><p>東風戦 · ${escape(view.honba||0)}本場</p><strong role="status" aria-live="polite">${escape(tableStatus(view,players,selfSeat,actions))}</strong>${view.phase==='REACTION'&&actions.length?`<div class="reaction-actions" aria-label="捨て牌への応答">${actions.map(legalActionButton).join('')}</div>`:''}${view.remainingTiles !== undefined ? `<p>残り ${escape(view.remainingTiles)}枚</p>` : ''}${view.doraIndicators?.length?`<div class="dora-row" aria-label="ドラ表示牌">ドラ表示牌 ${view.doraIndicators.map(tile=>renderTile(tile,{compact:true})).join('')}</div>`:''}${tenpai}${settlement}${view.phase==='HAND_RESULT'?'<button class="hand-next" data-action="next-hand">次の局へ</button>':''}${(()=>{const win=view.phase==='HAND_RESULT'&&view.result?.type==='win'&&view.result?.winner===selfSeat,loss=view.phase==='HAND_RESULT'&&view.result?.type==='win'&&view.result?.winner!==selfSeat,active=view.phase==='DISCARD'&&view.activeSeat===selfSeat,expression=win?'win':loss?'down':active?'focus':'neutral',line=win?(c?.reactions.win||c?.reactions.result):loss?(c?.reactions.loss||c?.reactions.result):view.phase==='REACTION'?(c?.reactions.wait||c?.reactions.turn):view.phase==='DISCARD'&&!active?(c?.reactions.cpu||c?.reactions.turn):c?.reactions.turn;return `<div class="table-character">${c?portrait(c,true,expression):''}<p class="reaction">${escape(line)}</p></div>`;})()}${view.result?.type==='nagashi'?`<p class="nagashi-result">流し満貫：${(view.result.winners||[view.result.winner]).map(seat=>escape(players[seat]?.name||`席${seat+1}`)).join('、')}</p>`:''}${view.result?.winner!==undefined&&view.result?.type==='win'?`<p>${escape(players[view.result.winner]?.name)} ${view.result.winType==='tsumo'?'ツモ':'ロン'} · ${escape(view.result.han||0)}翻 ${escape(view.result.fu||0)}符</p>`:''}</div><section class="own-seat" aria-label="自分の手牌"><h2>${escape(own?.name || c?.name)} <span>${escape(own?.points)}点</span></h2>${tileRiver(own?.discards,'自分の河')}${meldDisplay(own?.melds,'自分の副露')}<p class="hand-scroll-hint">手牌は左右に動かせます</p><div class="hand" aria-label="自分の手牌。左右にスクロールできます">${(own?.hand || []).map(tile => { const value = typeof tile === 'object' ? (tile.tile??tile.id) : tile, drawn=String(value)===String(view.drawnTile)&&view.activeSeat===selfSeat; return `<button class="tile${drawn?' drawn':''}${String(state.selectedTile) === String(value) ? ' selected' : ''}" data-tile="${escape(value)}" aria-pressed="${String(state.selectedTile) === String(value)}" aria-label="${escape(tileLabel(tile))}を選択${drawn?'、ツモ牌':''}">${renderTile(tile)}</button>`; }).join('')}</div></section></div>${view.phase==='DISCARD'?`<div class="actions" aria-label="対局の操作"><button data-action="discard" ${!actions.some(a => a.type === 'discard' && String(a.tile) === String(state.selectedTile)) ? 'disabled' : ''}>選んだ牌を切る</button>${riichiActionIndex>=0?`<button data-legal="${riichiActionIndex}">リーチして切る</button>`:''}${actions.map((a,i) => ['discard','riichi_discard'].includes(a.type) ? '' : legalActionButton(a,i)).join('')}</div>`:''}`;
  } else if (state.screen === 'result') content = `<div class="result"><p class="eyebrow">また、この卓で。</p><h1 id="screen-title">${escape(view.result?.title || '対局終了')}</h1><ol>${(view.result?.rankings || []).map(p => `<li>${escape(p.name)} <strong>${escape(p.points)}点</strong></li>`).join('')}</ol><p>${escape(c?.reactions.result)}</p><button data-action="${state.mode==='online'?'leave-room':'back'}">${state.mode==='online'?'対局を終えてルームを退出':'もう一度遊ぶ'}</button></div>`;
  const canLeaveOnline=state.mode==='online'&&((state.screen==='lobby'&&state.onlineState?.phase==='LOBBY')||(state.screen==='result'&&state.onlineState?.phase==='MATCH_RESULT'));
  const canBack=state.screen!=='character'&&state.screen!=='result'&&(state.mode!=='online'||state.screen==='lobby'&&!state.onlineState);
  return `<div class="app ${state.reducedMotion ? 'reduce-motion' : ''}" ${state.busy ? 'aria-busy="true"' : ''}><header><a href="/">Unity</a><span>珈琲と麻雀</span><div class="settings"><button data-action="mute" aria-pressed="${!!state.muted}" ${state.soundAvailable?'':'disabled'}>${state.soundAvailable?`音声 ${state.muted ? 'オフ' : 'オン'}`:'音声なし'}</button><button data-action="motion" aria-pressed="${!!state.reducedMotion}">動きを抑える</button><button data-action="tutorial" aria-expanded="${!!state.tutorial}">遊び方</button></div></header><main id="main" tabindex="-1">${canLeaveOnline?'<button class="back" data-action="leave-room">待合室から退出</button>':canBack?'<button class="back" data-action="back">キャラクター選択へ</button>':''}${state.tutorial ? '<aside class="tutorial"><h2>最初の一局</h2><p>手牌を選び「選んだ牌を切る」で打牌します。鳴きや和了は、可能なときだけ操作が表示されます。まずは揃う形を探してみましょう。配牌直後に1・9牌と字牌が9種類以上あり、まだ誰も鳴いていなければ「九種九牌」で流局できます。</p></aside>' : ''}${state.error ? `<p role="alert" class="error">${escape(state.error)}</p>` : ''}${state.busy ? '<p role="status">対局を準備しています…</p>' : ''}${content}</main><footer>珈琲のように、自分のペースで。<span>キャラクターの反応は対局結果に影響しません。</span></footer></div>`;
}
export function mountApp(root, options = {}) {
  let lastScreen,lastHandIdentity=null,focusTileAfterRender=null;
  const app = createApp({ ...options, onChange: state => {
    const hand=root.querySelector('.hand');
    const view=state.view||{};
    const handIdentity=state.screen==='table'?`${view.roundWind??''}:${view.handNumber??view.round??''}:${view.dealer??''}:${view.honba??''}`:null;
    const preserveHandScroll=!!hand&&state.screen==='table'&&lastScreen==='table'&&handIdentity===lastHandIdentity;
    const handScrollLeft=preserveHandScroll?hand.scrollLeft:undefined;
    root.innerHTML = renderApp(state);
    if(preserveHandScroll&&Number.isFinite(handScrollLeft)){
      const nextHand=root.querySelector('.hand');
      if(nextHand)nextHand.scrollLeft=handScrollLeft;
    }
    if(focusTileAfterRender!==null){
      const focused=[...(root.querySelectorAll?.('.hand .tile')||[])].find(tile=>tile.dataset.tile===focusTileAfterRender);
      focused?.focus({preventScroll:true});
      focusTileAfterRender=null;
    }
    if (lastScreen && lastScreen !== state.screen) root.querySelector('#main')?.focus();
    lastScreen = state.screen;
    lastHandIdentity=handIdentity;
    options.onChange?.(state);
  }});
  root.addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button || button.disabled || app.state.busy) return;
    try {
      if (button.dataset.character) app.selectCharacter(button.dataset.character);
      else if (button.dataset.mode) await app.selectMode(button.dataset.mode);
      else if (button.dataset.tile) { focusTileAfterRender=button.dataset.tile;app.selectTile(button.dataset.tile); }
      else if (button.dataset.legal !== undefined) await app.dispatch(app.state.view.legalActions[Number(button.dataset.legal)]);
      else if(button.dataset.action==='create-room')await app.createOnlineRoom(root.querySelector('[name="player-name"]')?.value||'');
      else if(button.dataset.action==='join-room')await app.joinOnlineRoom(root.querySelector('[name="room-code"]')?.value||'',root.querySelector('[name="player-name"]')?.value||'');
      else if(button.dataset.action==='ready')await app.setReady(!app.state.onlineState?.players?.[app.state.onlineState.selfSeat]?.ready);
      else if(button.dataset.action==='leave-room')await app.leaveRoom();
      else if(button.dataset.action==='start-online')await app.startOnlineMatch();
      else if(button.dataset.action==='next-hand')await app.continueHand();
      else { const action = { mute:'toggleMute', motion:'toggleReducedMotion', tutorial:'toggleTutorial', back:'back', discard:'discard' }[button.dataset.action]; if (action) await app[action](); }
    } catch (error) { app.state.error = error.message; root.innerHTML = renderApp(app.state); }
  });
  root.addEventListener('keydown',event=>{
    const tile=event.target.closest('.hand .tile');if(!tile||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    const next=event.key==='ArrowRight'?tile.nextElementSibling:tile.previousElementSibling;
    if(next){event.preventDefault();next.focus();}
  });
  root.innerHTML = renderApp(app.state);
  lastScreen = app.state.screen;
  return app;
}
