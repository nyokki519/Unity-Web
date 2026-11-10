import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Removing selection, legal-action delegation, or privacy filtering breaks these tests.
const load = () => Promise.all([import('../public/mahjong/src/characters.js'), import('../public/mahjong/src/app.js'), import('../public/mahjong/src/cpu-game.js')]);
const fixtureEngine = () => ({
  createMatch: ({ players }) => ({ players, revision: 0, phase: 'DISCARD', seat: 0 }),
  legalActions: state => state.phase === 'DISCARD' ? [{ type: 'discard', tile: 'm1' }] : [],
  applyAction: (state, seat, action, revision) => {
    assert.equal(seat, 0); assert.equal(revision, state.revision); assert.equal(action.tile, 'm1');
    return { ...state, revision: 1, phase: 'MATCH_RESULT' };
  },
  advanceTurn: state => state,
  chooseAction: () => { throw new Error('fixture has no CPU turn'); },
  view: state => ({ phase: state.phase, revision: state.revision, activeSeat: 0, round: '東一局', dealer: 0,
    players: state.players.map((player, seat) => ({ name: player.name, points: 25000, handCount: 13, discards: [], ...(seat === 0 ? { hand: ['m1', 'p2'] } : {}) })),
    legalActions: state.phase === 'DISCARD' ? [{ type: 'discard', tile: 'm1' }] : [],
    ...(state.phase === 'MATCH_RESULT' ? { result: { title: '対局終了', rankings: [{ name: '星乃 モカ', points: 25000 }] } } : {}) })
});

test('four original characters have exact Japanese names, readings and presentation', async () => {
  const [{ characters }] = await load();
  assert.deepEqual(characters.map(c => [c.name, c.reading, c.genderPresentation]), [
    ['星乃 モカ', 'ほしの・もか', 'female'], ['琥珀 すみれ', 'こはく・すみれ', 'female'],
    ['深山 焙真', 'みやま・ほうま', 'male'], ['小野 コナ', 'おの・こな', 'male']]);
  for (const c of characters) { assert.equal(c.colors.length, 2); assert.ok(c.role); assert.ok(c.greetings.length); assert.ok(c.reactions.result); assert.match(c.portrait,/^\.\/assets\/.+\.webp$/); const art=await readFile(new URL(`../public/mahjong/${c.portrait.slice(2)}`,import.meta.url)); assert.equal(art.toString('ascii',0,4),'RIFF'); assert.equal(art.toString('ascii',8,12),'WEBP'); assert.equal(art.toString('ascii',12,16),'VP8 '); assert.equal((art.readUInt16LE(26)&0x3fff),768); assert.equal((art.readUInt16LE(28)&0x3fff),960); assert.ok(c.reactions.win); assert.ok(c.reactions.loss); }
});
test('selection opens Japanese CPU and friend mode choices', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp();
  assert.match(renderApp(app.state), /キャラクターを選ぶ/);
  app.selectCharacter('moka'); assert.equal(app.state.screen, 'mode');
  assert.match(renderApp(app.state), /CPUと対局/); assert.match(renderApp(app.state), /友だちと対局/); assert.match(renderApp(app.state), /assets\/moka\.webp/);assert.match(renderApp(app.state),/東風戦は最大12局/);
  assert.throws(() => app.selectCharacter('unknown'), /キャラクター/);
});
test('friend mode opens a room lobby shell without claiming a connection', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp(); app.selectCharacter('kona'); await app.selectMode('online');
  assert.equal(app.state.screen, 'lobby'); assert.match(renderApp(app.state), /ルーム/); assert.equal(app.state.view, null);
});
test('CPU match and legal tile dispatch use supplied engine and reach its result', async () => {
  const [, { createApp, renderApp }, { createCpuGame }] = await load();
  const app = createApp({ cpu: createCpuGame(fixtureEngine()) }); app.selectCharacter('moka'); await app.selectMode('cpu');
  assert.equal(app.state.screen, 'table'); assert.match(renderApp(app.state), /東一局/); assert.match(renderApp(app.state), /table-character/); assert.match(renderApp(app.state), /assets\/moka\.webp/); assert.match(renderApp(app.state), /expression-focus/);
  app.selectTile('p2'); await assert.rejects(() => app.discard(), /選択/);
  app.selectTile('m1'); await app.discard(); assert.equal(app.state.screen, 'result');
  assert.match(renderApp(app.state), /対局終了/);
});
test('adapter rejects illegal actions without invoking rules or changing revision', async () => {
  const [, , { createCpuGame }] = await load(); const game = createCpuGame(fixtureEngine()); await game.startCpuMatch('moka', 7);
  await assert.rejects(() => game.dispatchCpuAction({ type: 'discard', tile: 'p2' }), /合法/);
  assert.equal(game.getView().revision, 0);
});
test('missing engine is an explicit unavailable state, never a fabricated game', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp(); app.selectCharacter('moka'); await app.selectMode('cpu');
  assert.equal(app.state.screen, 'mode'); assert.equal(app.state.view, null); assert.match(renderApp(app.state), /接続|準備/);
});
test('table hides opponents concealed hands even if adapter view contains them', async () => {
  const [, { renderApp }] = await load(); const markup = renderApp({ screen: 'table', characterId: 'moka', view: { phase: 'DISCARD', players: [{name:'自分',hand:['m1']},{name:'相手',hand:['SECRET'],handCount:13}], legalActions: [] } });
  assert.doesNotMatch(markup, /SECRET/); assert.match(markup, /13枚/);
});
test('settings and tutorial are user controlled and markup escapes names', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp(); app.toggleMute(); app.toggleReducedMotion(); app.toggleTutorial();
  assert.equal(app.state.muted, false); assert.equal(app.state.reducedMotion, true); assert.equal(app.state.tutorial, true);
  assert.match(renderApp(app.state), /手牌/);
  assert.doesNotMatch(renderApp({ ...app.state, screen:'result', view:{result:{title:'<script>',rankings:[]}} }), /<script>/);
});
test('page and styles provide accessible Japanese local UI and motion opt out', async () => {
  const html = await readFile(new URL('../public/mahjong/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/mahjong/style.css', import.meta.url), 'utf8');
  assert.match(html, /lang="ja"/); assert.match(html, /type="module"/); assert.match(html, /aria-live/);
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /44px/); assert.match(css, /overflow-x:auto/); assert.match(css, /flex-wrap:nowrap/); assert.match(css,/portrait-compact>img\{position:absolute;left:-40%;top:-15%;width:180%;height:180%/); assert.match(css,/expression-focus>img/); assert.match(css,/expression-down>img/); assert.match(css,/mahjong-cheer/); assert.doesNotMatch(html, /https?:\/\//);
});

test('mounted controls navigate and preserve selected-tile state through rerenders', async () => {
  const [, { mountApp }, { createCpuGame }] = await load();
  let handler; let focuses = 0;
  const root = { innerHTML:'', addEventListener(type, callback) { assert.equal(type, 'click'); handler = callback; }, querySelector() { return { focus() { focuses++; } }; } };
  const app = mountApp(root, { cpu: createCpuGame(fixtureEngine()) });
  const click = dataset => handler({ target:{ closest: () => ({ dataset, disabled:false }) } });
  await click({ character:'moka' }); assert.match(root.innerHTML, /CPUと対局/);
  await click({ mode:'cpu' }); assert.match(root.innerHTML, /自分の手牌/);
  await click({ tile:'m1' }); assert.equal(app.state.selectedTile, 'm1'); assert.match(root.innerHTML, /tile selected/);
  await click({ action:'discard' }); assert.equal(app.state.screen, 'result'); assert.ok(focuses >= 3);
});

test('CPU adapter advances CPU seats through engine decisions rather than inventing moves', async () => {
  const [, , { createCpuGame }] = await load(); const api = fixtureEngine(); const turns = [];
  api.createMatch = () => ({ revision:0, phase:'DISCARD', seat:2 });
  api.legalActions = (state, seat) => seat === state.seat ? [{type:'discard',tile:'m1'}] : [];
  api.chooseAction = (state, seat) => { turns.push(seat); return {type:'discard',tile:'m1'}; };
  api.applyAction = (state, seat, action, revision) => { assert.equal(revision, 0); assert.equal(action.tile, 'm1'); return {...state, seat:0, revision:1}; };
  api.view = state => ({ phase:state.phase, revision:state.revision, activeSeat:state.seat, players:[], legalActions:state.seat === 0 ? [{type:'discard',tile:'m1'}] : [] });
  const game = createCpuGame(api); const view = await game.startCpuMatch('houma', 19);
  assert.deepEqual(turns, [2]); assert.equal(view.activeSeat, 0); assert.equal(view.revision, 1);
});

test('online app exposes room creation and waits on server state instead of faking a room', async () => {
  const [, {createApp,renderApp}] = await load();
  const online={status:'connected',state:null,async createRoom(name){assert.equal(name,'Player');this.state={code:'0421',selfSeat:0,phase:'LOBBY',revision:1,players:[{seat:0,name:'Player',ready:false,connected:true}]};app.setOnlineState(this.state);},async joinRoom(){},async setReady(){},async start(){}};
  const app=createApp({online});app.selectCharacter('moka');await app.selectMode('online');
  await app.createOnlineRoom('Player');
  assert.equal(app.state.screen,'lobby');assert.equal(app.state.onlineState.code,'0421');
  assert.match(renderApp(app.state),/0421/);assert.match(renderApp(app.state),/参加者を待っています/);assert.match(renderApp(app.state),/data-action="start-online" disabled/);
});

test('online lobby only enables the host start action after four players are ready', async () => {
  const [, {renderApp}] = await load();
  const state={screen:'lobby',characterId:'moka',connection:'connected',onlineState:{code:'1234',selfSeat:0,phase:'LOBBY',players:[0,1,2,3].map(seat=>({seat,name:`P${seat}`,ready:seat<3,connected:true}))}};
  assert.match(renderApp(state),/4人で対局開始/);
  assert.match(renderApp(state),/disabled/);
  state.onlineState.players[3].ready=true;
  assert.doesNotMatch(renderApp(state),/4人で対局開始" disabled/);
});

test('online table uses own seat for hand display and never renders other hands', async () => {
  const [, {renderApp}] = await load();
  const state={screen:'table',characterId:'moka',mode:'online',view:{selfSeat:2,phase:'DISCARD',dealer:0,players:[0,1,2,3].map(seat=>({name:`P${seat}`,points:25000,handCount:13,hand:seat===2?[0,1,2]:'PRIVATE-HAND',discards:[]})),legalActions:[]}};
  const html=renderApp(state);
  assert.doesNotMatch(html,/PRIVATE-HAND/);
  assert.match(html,/P2/);
});

test('table portrait and character line change for own turn, CPU turn, win and loss', async () => {
  const [, { renderApp }] = await load();
  const base={screen:'table',characterId:'moka',mode:'cpu',view:{selfSeat:0,activeSeat:0,phase:'DISCARD',players:[{name:'自分',points:25000,hand:[],discards:[]},{name:'CPU',points:25000,handCount:13,discards:[]}],legalActions:[]}};
  assert.match(renderApp(base),/expression-focus/); assert.match(renderApp(base),/assets\/moka\.webp/);
  assert.match(renderApp({...base,view:{...base.view,activeSeat:1}}),/相手の一手を見守りましょう/);
  assert.match(renderApp({...base,view:{...base.view,phase:'HAND_RESULT',result:{type:'win',winner:0}}}),/expression-win/);
  assert.match(renderApp({...base,view:{...base.view,phase:'HAND_RESULT',result:{type:'win',winner:1}}}),/expression-down/);
});
