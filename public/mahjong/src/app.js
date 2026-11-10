import { characters, getCharacter } from './characters.js';
import { createCpuGame } from './cpu-game.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = { discard:'打牌', riichi:'リーチ', ron:'ロン', tsumo:'ツモ', chi:'チー', pon:'ポン', kan:'カン', ankan:'暗槓', kakan:'加槓', pass:'見送り', next:'次の局へ', nextHand:'次の局へ' };
export function createApp({ cpu = createCpuGame(), online = null, onChange = () => {} } = {}) {
  const state = { screen:'character', characterId:null, mode:'cpu', view:null, onlineState:null, connection:online?.status||'idle', selectedTile:null, muted:true, reducedMotion:false, tutorial:false, busy:false, error:'' };
  const changed = () => onChange(state);
  const receive = view => { state.view = view; state.screen = view.phase === 'MATCH_RESULT' ? 'result' : 'table'; state.selectedTile = null; };
  async function perform(work) { if (state.busy) return; state.busy = true; state.error = ''; changed(); try { receive(await work()); } catch (error) { state.error = error.message; } finally { state.busy = false; changed(); } }
  const app = {
    state,
    selectCharacter(id) { if (!getCharacter(id)) throw new Error('キャラクターを選択してください。'); state.characterId = id; state.screen = 'mode'; state.error = ''; changed(); },
    async selectMode(mode) { if (!state.characterId) throw new Error('キャラクターを選択してください。'); state.mode=mode; if (mode === 'online') { state.screen = 'lobby'; state.view = null; state.onlineState=online?.state||null; state.connection=online?.status||'idle'; changed(); } else if (mode === 'cpu') await perform(() => cpu.startCpuMatch(state.characterId)); else throw new Error('モードを選択してください。'); },
    setOnlineState(view) { state.mode='online';state.characterId ||= 'moka';state.onlineState=view; state.connection=online?.status||'connected'; state.view=view; state.screen=view.phase==='MATCH_RESULT'?'result':view.phase==='LOBBY'?'lobby':'table'; state.selectedTile=null; changed(); },
    setConnection(value) { state.connection=value; changed(); },
    setOnlineError(error) { state.error=String(error||'接続に失敗しました。'); changed(); },
    async createOnlineRoom(name) { if(!online)throw new Error('オンライン接続を準備しています。'); state.error='';state.connection='connecting';changed();await online.createRoom(name);state.connection=online.status;changed(); },
    async joinOnlineRoom(code,name) { if(!online)throw new Error('オンライン接続を準備しています。'); state.error='';state.connection='connecting';changed();await online.joinRoom(code,name);state.connection=online.status;changed(); },
    async setReady(ready) { if(!online)throw new Error('オンライン接続を準備しています。'); await perform(async()=>{await online.setReady(ready);return online.state;}); },
    async startOnlineMatch() { if(!online)throw new Error('オンライン接続を準備しています。'); await perform(async()=>{await online.start();return online.state;}); },
    async leaveRoom() { if(!online)throw new Error('オンライン接続を準備しています。'); await online.leaveRoom();state.onlineState=null;state.view=null;state.screen='mode';state.connection='idle';state.error='';changed(); },
    selectTile(tile) { state.selectedTile = tile; changed(); },
    async discard() { const action = state.view?.legalActions?.find(a => a.type === 'discard' && String(a.tile) === String(state.selectedTile)); if (!action) throw new Error('打牌できる手牌を選択してください。'); await app.dispatch(action); },
    async dispatch(action) { if(state.mode==='online'){if(!online)throw new Error('オンライン接続を準備しています。');await perform(()=>online.send(action.type,action));}else await perform(() => cpu.dispatchCpuAction(action)); },
    toggleMute() { state.muted = !state.muted; changed(); },
    toggleReducedMotion() { state.reducedMotion = !state.reducedMotion; changed(); },
    toggleTutorial() { state.tutorial = !state.tutorial; changed(); },
    back() { state.screen = 'character'; state.view = null; state.error = ''; changed(); }
  };
  return app;
}
function portrait(c, compact = false, expression = 'neutral') { const source=c.expressions?.[expression]||c.portrait; return `<span class="portrait portrait-${c.id}${compact?' portrait-compact':''} expression-${expression}" aria-hidden="true"><img src="${source}" alt="" loading="eager"></span>`; }
function tileLabel(tile) {
  const value = typeof tile === 'object' ? (tile.tile ?? tile.label ?? tile.id ?? tile.type) : tile;
  if(Number.isInteger(Number(value))&&String(value).trim()!==''){
    const n=Number(value),type=n>=34&&n<=36?[4,13,22][n-34]:n;
    if(type>=0&&type<27)return `${n>=34?'赤5':type%9+1}${['萬','筒','索'][Math.floor(type/9)]}`;
    if(type>=27&&type<34)return ['東','南','西','北','白','發','中'][type-27];
  }
  const match = String(value).match(/^([mps])([0-9])$/);
  return match ? `${match[2] === '0' ? '赤5' : match[2]}${{m:'萬',p:'筒',s:'索'}[match[1]]}` : escape(value);
}
export function renderApp(state) {
  const c = getCharacter(state.characterId), view = state.view || {};
  let content = '';
  if (state.screen === 'character') content = `<div class="intro"><p class="eyebrow">UNITY · COFFEE & MAHJONG</p><h1>珈琲と、ひと局。</h1><p>四人の物語と囲む、いつもの卓。</p></div><h2 id="screen-title">キャラクターを選ぶ</h2><div class="characters">${characters.map(c => `<button class="character-card" data-character="${c.id}" style="--ink:${c.colors[0]};--accent:${c.colors[1]}" aria-label="${c.name}（${c.reading}）、${c.role}を選ぶ">${portrait(c)}<span class="reading">${c.reading}</span><strong>${c.name}</strong><span>${c.role}</span></button>`).join('')}</div>`;
  else if (state.screen === 'mode') content = `<div class="mode-layout"><div class="selected-character" style="--ink:${c.colors[0]};--accent:${c.colors[1]}">${portrait(c)}<h1 id="screen-title">${c.name}</h1><p>${c.greetings[0]}</p></div><div><p class="eyebrow">ひと息ついて、はじめよう</p><h2>遊び方を選ぶ</h2><button class="mode-card" data-mode="cpu"><strong>CPUと対局</strong><span>ひとりで楽しむ、東風戦</span></button><button class="mode-card" data-mode="online"><strong>友だちと対局</strong><span>4人で集まる、合言葉の卓</span></button><p class="note">4人打ちリーチ麻雀 · 25,000点持ち</p></div></div>`;
  else if (state.screen === 'lobby') {
    const room=state.onlineState,players=room?.players||[],self=room?.selfSeat??0,allReady=players.length===4&&players.every(p=>p?.ready);
    const hostSeat=room?.hostSeat??0;
    content = `<h1 id="screen-title">友だちの待合室</h1><p>4人そろって、同じ卓へ。</p><p role="status">${escape({connected:'接続中',connecting:'接続しています…',authenticating:'部屋へ戻っています…',reconnecting:'再接続しています…',offline:'接続が切れました。再接続します。',idle:'ニックネームとルームコードで参加できます。'}[state.connection]||state.connection)}</p>${room?`<section class="online-room"><p>ルームコード <strong class="room-code">${escape(room.code)}</strong></p><ol class="seat-list">${[0,1,2,3].map(seat=>{const p=players[seat];return `<li>${p?`${escape(p.name)}${seat===hostSeat?' · 作成者':''} · ${p.connected?'接続中':'切断中'} · ${p.ready?'準備OK':'準備中'}`:'参加者を待っています'}</li>`;}).join('')}</ol><button data-action="ready" aria-pressed="${!!players[self]?.ready}">${players[self]?.ready?'準備を取り消す':'準備できた'}</button>${self===hostSeat?`<button data-action="start-online" ${allReady?'':'disabled'}>4人で対局開始</button>`:''}<p class="note">開始には4人全員の準備が必要です。30秒操作がないとツモ切りし、ロン・鳴きは見送ります。ルームは6時間で期限切れになり、サーバー再起動時は消える場合があります。</p></section>`:`<div id="online-lobby"><label>表示名<input name="player-name" maxlength="20" autocomplete="nickname" value="${escape(c?.name)}"></label><label>ルームコード<input name="room-code" autocomplete="off" inputmode="numeric" maxlength="4" pattern="[0-9]{4}"></label><div class="actions"><button data-action="create-room">ルームを作る</button><button data-action="join-room">ルームに参加</button></div></div>`}`;
  }
  else if (state.screen === 'table') {
    const players = view.players || [], actions = view.legalActions || [],selfSeat=view.selfSeat??0,own=players[selfSeat],opponents=[...players.slice(selfSeat+1),...players.slice(0,selfSeat)];
    content = `<h1 id="screen-title" class="table-heading">${escape(view.round || `東${view.handNumber||1}局`)} <small>親：${escape(players[view.dealer]?.name || '確認中')}</small></h1><div class="table"><div class="opponents">${opponents.map(p => `<section class="opponent"><h2>${escape(p.name)}</h2><p>${escape(p.points)}点 · 手牌 ${escape(p.handCount ?? '–')}枚 ${p.riichi?'· リーチ':''}</p><div class="hidden-tiles" aria-hidden="true">▥ ▥ ▥ ▥ ▥</div><p class="melds" aria-label="${escape(p.name)}の副露">${(p.melds||[]).map(m=>`${escape(labels[m.type]||m.type)} ${m.tiles.map(tileLabel).join(' ')}`).join(' · ')}</p><p class="discards" aria-label="${escape(p.name)}の河">${(p.discards || []).map(d=>tileLabel(d.tile??d)).join(' ')}</p></section>`).join('')}</div><div class="table-center"><p>東風戦 · ${escape(view.honba||0)}本場</p><strong>${escape(view.status || (view.phase === 'HAND_RESULT' ? view.result?.type==='win'?'和了':'流局':'あなたの一手'))}</strong>${view.remainingTiles !== undefined ? `<p>残り ${escape(view.remainingTiles)}枚</p>` : ''}${view.doraIndicators?.length?`<p>ドラ表示牌 ${view.doraIndicators.map(tileLabel).join(' ')}</p>`:''}${(()=>{const win=view.phase==='HAND_RESULT'&&view.result?.type==='win'&&view.result?.winner===selfSeat,loss=view.phase==='HAND_RESULT'&&view.result?.type==='win'&&view.result?.winner!==selfSeat,active=view.phase==='DISCARD'&&view.activeSeat===selfSeat,expression=win?'win':loss?'down':active?'focus':'neutral',line=win?(c?.reactions.win||c?.reactions.result):loss?(c?.reactions.loss||c?.reactions.result):view.phase==='REACTION'?(c?.reactions.wait||c?.reactions.turn):view.phase==='DISCARD'&&!active?(c?.reactions.cpu||c?.reactions.turn):c?.reactions.turn;return `<div class="table-character">${c?portrait(c,true,expression):''}<p class="reaction">${escape(line)}</p></div>`})()}${view.result?.winner!==undefined?`<p>${escape(players[view.result.winner]?.name)} ${view.result.winType==='tsumo'?'ツモ':'ロン'} · ${escape(view.result.han||0)}翻 ${escape(view.result.fu||0)}符</p>`:''}</div><section class="own-seat" aria-label="自分の手牌"><h2>${escape(own?.name || c?.name)} <span>${escape(own?.points)}点</span></h2><p class="discards" aria-label="自分の河">${(own?.discards || []).map(d=>tileLabel(d.tile??d)).join(' ')}</p><p class="melds">${(own?.melds||[]).map(m=>`${escape(labels[m.type]||m.type)} ${m.tiles.map(tileLabel).join(' ')}`).join(' · ')}</p><p class="hand-scroll-hint">手牌は左右に動かせます</p><div class="hand" aria-label="自分の手牌。左右にスクロールできます">${(own?.hand || []).map(tile => { const value = typeof tile === 'object' ? (tile.tile??tile.id) : tile; return `<button class="tile${String(state.selectedTile) === String(value) ? ' selected' : ''}" data-tile="${escape(value)}" aria-pressed="${String(state.selectedTile) === String(value)}" aria-label="${tileLabel(tile)}を選択">${tileLabel(tile)}</button>`; }).join('')}</div></section></div><div class="actions" aria-label="対局の操作"><button data-action="discard" ${!actions.some(a => a.type === 'discard' && String(a.tile) === String(state.selectedTile)) ? 'disabled' : ''}>選んだ牌を切る</button>${actions.map((a,i) => a.type === 'discard' ? '' : `<button data-legal="${i}">${escape(labels[a.type] || a.label || a.type)}${a.tile!==undefined?` ${tileLabel(a.tile)}`:''}${a.tiles?` ${a.tiles.map(tileLabel).join(' ')}`:''}</button>`).join('')}${view.phase==='HAND_RESULT'&&state.mode==='online'?'<button data-action="next-hand">次の局へ</button>':''}</div>`;
  } else if (state.screen === 'result') content = `<div class="result"><p class="eyebrow">また、この卓で。</p><h1 id="screen-title">${escape(view.result?.title || '対局終了')}</h1><ol>${(view.result?.rankings || []).map(p => `<li>${escape(p.name)} <strong>${escape(p.points)}点</strong></li>`).join('')}</ol><p>${escape(c?.reactions.result)}</p><button data-action="${state.mode==='online'?'leave-room':'back'}">${state.mode==='online'?'対局を終えてルームを退出':'もう一度遊ぶ'}</button></div>`;
  const canLeaveOnline=state.mode==='online'&&((state.screen==='lobby'&&state.onlineState?.phase==='LOBBY')||(state.screen==='result'&&state.onlineState?.phase==='MATCH_RESULT'));
  const canBack=state.screen!=='character'&&state.screen!=='result'&&(state.mode!=='online'||state.screen==='lobby'&&!state.onlineState);
  return `<div class="app ${state.reducedMotion ? 'reduce-motion' : ''}" ${state.busy ? 'aria-busy="true"' : ''}><header><a href="/">Unity</a><span>珈琲と麻雀</span><div class="settings"><button data-action="mute" aria-pressed="${!!state.muted}">音声 ${state.muted ? 'オフ' : 'オン'}</button><button data-action="motion" aria-pressed="${!!state.reducedMotion}">動きを抑える</button><button data-action="tutorial" aria-expanded="${!!state.tutorial}">遊び方</button></div></header><main id="main" tabindex="-1">${canLeaveOnline?'<button class="back" data-action="leave-room">待合室から退出</button>':canBack?'<button class="back" data-action="back">キャラクター選択へ</button>':''}${state.tutorial ? '<aside class="tutorial"><h2>最初の一局</h2><p>手牌を選び「選んだ牌を切る」で打牌します。鳴きや和了は、可能なときだけ操作が表示されます。まずは揃う形を探してみましょう。</p></aside>' : ''}${state.error ? `<p role="alert" class="error">${escape(state.error)}</p>` : ''}${state.busy ? '<p role="status">対局を準備しています…</p>' : ''}${content}</main><footer>珈琲のように、自分のペースで。<span>キャラクターの反応は対局結果に影響しません。</span></footer></div>`;
}
export function mountApp(root, options = {}) {
  let lastScreen;
  const app = createApp({ ...options, onChange: state => {
    root.innerHTML = renderApp(state);
    if (lastScreen && lastScreen !== state.screen) root.querySelector('#main')?.focus();
    lastScreen = state.screen;
    options.onChange?.(state);
  }});
  root.addEventListener('click', async event => {
    const button = event.target.closest('button'); if (!button || button.disabled || app.state.busy) return;
    try {
      if (button.dataset.character) app.selectCharacter(button.dataset.character);
      else if (button.dataset.mode) await app.selectMode(button.dataset.mode);
      else if (button.dataset.tile) app.selectTile(button.dataset.tile);
      else if (button.dataset.legal !== undefined) await app.dispatch(app.state.view.legalActions[Number(button.dataset.legal)]);
      else if(button.dataset.action==='create-room')await app.createOnlineRoom(root.querySelector('[name="player-name"]')?.value||'');
      else if(button.dataset.action==='join-room')await app.joinOnlineRoom(root.querySelector('[name="room-code"]')?.value||'',root.querySelector('[name="player-name"]')?.value||'');
      else if(button.dataset.action==='ready')await app.setReady(!app.state.onlineState?.players?.[app.state.onlineState.selfSeat]?.ready);
      else if(button.dataset.action==='leave-room')await app.leaveRoom();
      else if(button.dataset.action==='start-online')await app.startOnlineMatch();
      else if(button.dataset.action==='next-hand')await app.dispatch({type:'next'});
      else { const action = { mute:'toggleMute', motion:'toggleReducedMotion', tutorial:'toggleTutorial', back:'back', discard:'discard' }[button.dataset.action]; if (action) await app[action](); }
    } catch (error) { app.state.error = error.message; root.innerHTML = renderApp(app.state); }
  });
  root.innerHTML = renderApp(app.state);
  lastScreen = app.state.screen;
  return app;
}
