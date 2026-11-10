import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {createMatch} from '../src/mahjong/match.js';
import {view as localMatchView} from '../src/mahjong/client-view.js';

// Removing selection, legal-action delegation, or privacy filtering breaks these tests.
const load = () => Promise.all([import('../public/mahjong/src/characters.js'), import('../public/mahjong/src/app.js'), import('../public/mahjong/src/cpu-game.js'), import('../public/mahjong/src/sound.js')]);
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
  for (const c of characters) { assert.equal(c.colors.length, 2); assert.ok(c.role); assert.ok(c.greetings.length); assert.ok(c.reactions.result); assert.match(c.portrait,/^\.\/assets\/.+\.webp$/); const art=await readFile(new URL(`../public/mahjong/${c.portrait.slice(2)}`,import.meta.url)); assert.equal(art.toString('ascii',0,4),'RIFF'); assert.equal(art.toString('ascii',8,12),'WEBP'); assert.equal(art.toString('ascii',12,16),'VP8 '); assert.equal((art.readUInt16LE(26)&0x3fff),768); assert.equal((art.readUInt16LE(28)&0x3fff),1152); assert.ok(c.reactions.win); assert.ok(c.reactions.loss); }
});
test('selection opens Japanese CPU and friend mode choices', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp();
  assert.match(renderApp(app.state), /キャラクターを選ぶ/);
  app.selectCharacter('moka'); assert.equal(app.state.screen, 'mode');
  assert.match(renderApp(app.state), /CPUと対局/); assert.match(renderApp(app.state), /友だちと対局/); assert.match(renderApp(app.state), /assets\/moka-portrait\.webp/);assert.match(renderApp(app.state),/東風戦は最大12局/);
  assert.throws(() => app.selectCharacter('unknown'), /キャラクター/);
});
test('friend mode opens a room lobby shell without claiming a connection', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp(); app.selectCharacter('kona'); await app.selectMode('online');
  assert.equal(app.state.screen, 'lobby'); assert.match(renderApp(app.state), /ルーム/); assert.equal(app.state.view, null);
});
test('CPU match and legal tile dispatch use supplied engine and reach its result', async () => {
  const [, { createApp, renderApp }, { createCpuGame }] = await load();
  const app = createApp({ cpu: createCpuGame(fixtureEngine()) }); app.selectCharacter('moka'); await app.selectMode('cpu');
  assert.equal(app.state.screen, 'table'); assert.match(renderApp(app.state), /東一局/); assert.match(renderApp(app.state), /table-character/); assert.match(renderApp(app.state), /assets\/moka-portrait\.webp/); assert.match(renderApp(app.state), /expression-focus/);
  app.selectTile('p2'); await assert.rejects(() => app.discard(), /選択/);
  app.selectTile('m1'); await app.discard(); assert.equal(app.state.screen, 'result');
  assert.match(renderApp(app.state), /対局終了/);
});
test('adapter rejects illegal actions without invoking rules or changing revision', async () => {
  const [, , { createCpuGame }] = await load(); const game = createCpuGame(fixtureEngine()); await game.startCpuMatch('moka', 7);
  await assert.rejects(() => game.dispatchCpuAction({ type: 'discard', tile: 'p2' }), /合法/);
  assert.equal(game.getView().revision, 0);
});
test('CPU adapter pauses on a hand result before advancing to the next round', async () => {
  const [, , { createCpuGame }] = await load(); let advances=0;
  const api={createMatch:({players})=>({players,revision:0,phase:'DISCARD'}),legalActions:m=>m.phase==='DISCARD'?[{type:'discard',tile:'m1'}]:[],applyAction:m=>({...m,revision:m.revision+1,phase:'HAND_RESULT',result:{type:'exhaustive',tenpai:[0],deltas:[3000,-1000,-1000,-1000]}}),advanceTurn:m=>{advances++;return{...m,revision:m.revision+1,phase:'MATCH_RESULT'};},chooseAction:()=>undefined,view:m=>({phase:m.phase,revision:m.revision,players:m.players.map(p=>({name:p.name,points:25000,handCount:13})),legalActions:m.phase==='DISCARD'?[{type:'discard',tile:'m1'}]:[],result:m.result})};
  const game=createCpuGame(api);await game.startCpuMatch('moka',1);const result=await game.dispatchCpuAction({type:'discard',tile:'m1'});assert.equal(result.phase,'HAND_RESULT');assert.equal(advances,0);assert.equal((await game.continueMatch()).phase,'MATCH_RESULT');assert.equal(advances,1);
});
test('missing engine is an explicit unavailable state, never a fabricated game', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp(); app.selectCharacter('moka'); await app.selectMode('cpu');
  assert.equal(app.state.screen, 'mode'); assert.equal(app.state.view, null); assert.match(renderApp(app.state), /接続|準備/);
});
test('table hides opponents concealed hands while showing one tile back per real concealed tile', async () => {
  const [, { renderApp }] = await load(); const markup = renderApp({ screen: 'table', characterId: 'moka', view: { phase: 'DISCARD', players: [{name:'自分',hand:['m1']},{name:'相手',hand:['SECRET'],handCount:13}], legalActions: [] } });
  assert.doesNotMatch(markup, /SECRET/); assert.match(markup, /13枚/); assert.equal((markup.match(/class="tile-back"/g)||[]).length,13);
});
test('drawn tile is sent only to the active seat while concealed hands remain private',()=>{
 const match=createMatch({players:['a','b','c','d'],seed:'draw-tile-view',now:0});
 const active=localMatchView(match,0),other=localMatchView(match,1);
 assert.equal(active.drawnTile,match.drawnTile);assert.equal(other.drawnTile,undefined);
 assert.equal(other.players[0].hand,undefined);assert.equal(active.players[1].hand,undefined);
});
test('table renders original tile faces in the hand, public rivers, melds and dora display',async()=>{
 const [,{renderApp}]=await load();const markup=renderApp({screen:'table',characterId:'moka',view:{phase:'DISCARD',selfSeat:0,dealer:0,remainingTiles:50,doraIndicators:[31],players:[{name:'自分',points:25000,hand:[34,9],discards:[{tile:0}],melds:[]},{name:'南さん',points:25000,handCount:13,discards:[{tile:27}],melds:[{type:'pon',tiles:[27,27,27],open:true}]}],legalActions:[]}});
 assert.match(markup,/class="mj-tile-svg/);assert.match(markup,/aria-label="赤5萬を選択"/);assert.match(markup,/class="tile-river/);assert.match(markup,/class="meld-tiles/);assert.match(markup,/aria-label="白"/);
});
test('malformed tile labels remain escaped in button and assistive labels',async()=>{
 const [,{renderApp}]=await load();const payload='\"><img data-pwn="tile">';
 const markup=renderApp({screen:'table',characterId:'moka',view:{phase:'DISCARD',activeSeat:0,selfSeat:0,players:[{name:'自分',hand:[payload],discards:[],melds:[]},{name:'相手',handCount:13,discards:[],melds:[]}],legalActions:[{type:'discard',tile:payload}]}});
 assert.doesNotMatch(markup,/<img data-pwn=/);assert.match(markup,/&lt;img data-pwn=/);
});
test('the current draw is highlighted and state transitions identify major mahjong moments',async()=>{
 const [,{renderApp,transitionMoment}]=await load();
 const markup=renderApp({screen:'table',characterId:'moka',moment:'draw',view:{phase:'DISCARD',activeSeat:0,selfSeat:0,drawnTile:34,players:[{name:'自分',hand:[4,34],handCount:2,discards:[],melds:[]},{name:'相手',handCount:13,discards:[],melds:[]}]}});
 assert.match(markup,/class="tile drawn" data-tile="34"/);assert.match(markup,/class="table moment-draw"/);
 const before={phase:'DISCARD',selfSeat:0,players:[{hand:[1,2],discards:[],melds:[],riichi:false},{handCount:13,discards:[],melds:[],riichi:false}]};
 assert.equal(transitionMoment(before,{...before,players:[{hand:[1,2,3],discards:[],melds:[],riichi:false},before.players[1]],drawnTile:3}), 'draw');
 assert.equal(transitionMoment(before,{...before,players:[{hand:[1],discards:[{tile:2}],melds:[],riichi:true},before.players[1]]}), 'riichi');
});
test('duplicate synchronized revision keeps its animation moment and never replays its cue',async()=>{
 const [,{createApp}]=await load();const cues=[],sound={available:true,enableFromGesture:()=>true,disable(){},cue(name){cues.push(name);return true;}};
 const app=createApp({sound});app.state.muted=false;
 const first={phase:'DISCARD',revision:1,selfSeat:0,activeSeat:0,players:[{hand:[1,2],discards:[],melds:[]}]};
 const next={...first,revision:2,players:[{hand:[1,2,3],discards:[],melds:[]}]};
 app.setOnlineState(first);app.setOnlineState(next);assert.equal(app.state.moment,'draw');assert.deepEqual(cues,['draw']);
 app.setOnlineState({...next});assert.equal(app.state.moment,'draw');assert.deepEqual(cues,['draw']);
});
test('settings and tutorial are user controlled and markup escapes names', async () => {
  const [, { createApp, renderApp }] = await load(); const app = createApp({sound:{available:true,enableFromGesture:()=>true,disable(){},cue(){}}}); app.toggleMute(); app.toggleReducedMotion(); app.toggleTutorial();
  assert.equal(app.state.muted, false); assert.equal(app.state.reducedMotion, true); assert.equal(app.state.tutorial, true);
  assert.match(renderApp(app.state), /手牌/);
  assert.doesNotMatch(renderApp({ ...app.state, screen:'result', view:{result:{title:'<script>',rankings:[]}} }), /<script>/);
});

test('unmuting unlocks audio from the gesture and plays subtle tile and result cues', async()=>{
  const [,{createApp},{createCpuGame}]=await load();const events=[];
  const sound={available:true,enableFromGesture(){events.push('unlock');return true;},disable(){events.push('disable');},cue(name){events.push(name);}};
  const app=createApp({cpu:createCpuGame(fixtureEngine()),sound});app.selectCharacter('moka');await app.selectMode('cpu');app.toggleMute();app.selectTile('m1');await app.discard();
  assert.deepEqual(events,['unlock','tile','result']);
  app.toggleMute();assert.equal(events.at(-1),'disable');
});

test('original WebAudio cues are gated until an explicit user gesture and handle unsupported browsers',async()=>{
  const [,,, {createMahjongSound}]=await load();
  const unsupported=createMahjongSound({audioContextFactory:()=>null});assert.equal(unsupported.enableFromGesture(),false);assert.equal(unsupported.available,false);
  const made=[];const fake={state:'running',currentTime:1,destination:{},resume(){return Promise.resolve();},createOscillator(){const o={frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},type:'',connect(){},start(){},stop(){}};made.push(o);return o;},createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}};
  const sound=createMahjongSound({audioContextFactory:()=>fake});assert.equal(sound.available,true);assert.equal(sound.cue('tile'),false);assert.equal(sound.enableFromGesture(),true);assert.equal(sound.cue('tile'),true);assert.equal(sound.cue('result'),true);assert.equal(made.length,4);sound.disable();assert.equal(sound.cue('tile'),false);
});
test('page and styles provide accessible Japanese local UI and motion opt out', async () => {
  const html = await readFile(new URL('../public/mahjong/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/mahjong/style.css', import.meta.url), 'utf8');
  assert.match(html, /lang="ja"/); assert.match(html, /type="module"/); assert.match(html, /aria-live/);
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /44px/); assert.match(css, /overflow-x:auto/); assert.match(css, /flex-wrap:nowrap/); assert.match(css,/portrait-compact>img\{position:absolute;left:-40%;top:-15%;width:180%;height:180%/); assert.match(css,/expression-focus>img/); assert.match(css,/expression-down>img/); assert.match(css,/mahjong-cheer/); assert.doesNotMatch(html, /https?:\/\//);
});

test('mounted controls navigate and preserve selected-tile state through rerenders', async () => {
  const [, { mountApp }, { createCpuGame }] = await load();
  const handlers={};let focuses = 0;
  const root = { innerHTML:'', addEventListener(type, callback) { handlers[type] = callback; }, querySelector() { return { focus() { focuses++; } }; } };
  const app = mountApp(root, { cpu: createCpuGame(fixtureEngine()) });
  const click = dataset => handlers.click({ target:{ closest: () => ({ dataset, disabled:false }) } });
  await click({ character:'moka' }); assert.match(root.innerHTML, /CPUと対局/);
  await click({ mode:'cpu' }); assert.match(root.innerHTML, /自分の手牌/);
  await click({ tile:'m1' }); assert.equal(app.state.selectedTile, 'm1'); assert.match(root.innerHTML, /tile selected/);
  await click({ action:'discard' }); assert.equal(app.state.screen, 'result'); assert.ok(focuses >= 3);
});

test('hand keyboard arrows move focus to neighboring tiles without triggering a discard',async()=>{
 const [,{mountApp},{createCpuGame}]=await load();let focused=0,prevented=0;
 const target={nextElementSibling:{focus(){focused=1;}},previousElementSibling:{focus(){focused=-1;}}};
 const handlers={},root={innerHTML:'',addEventListener(type,fn){handlers[type]=fn;},querySelector(){return{focus(){}};}};
 const app=mountApp(root,{cpu:createCpuGame(fixtureEngine())});
 await handlers.click({target:{closest:()=>({dataset:{character:'moka'},disabled:false})}});await handlers.click({target:{closest:()=>({dataset:{mode:'cpu'},disabled:false})}});
 handlers.keydown({target:{closest:selector=>selector==='.hand .tile'?target:null},key:'ArrowRight',preventDefault(){prevented++;}});
 assert.equal(focused,1);assert.equal(prevented,1);assert.equal(app.state.selectedTile,null);
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
  assert.match(renderApp(base),/expression-focus/); assert.match(renderApp(base),/assets\/moka-portrait\.webp/);
  assert.match(renderApp({...base,view:{...base.view,activeSeat:1}}),/相手の一手を見守りましょう/);
  assert.match(renderApp({...base,view:{...base.view,phase:'HAND_RESULT',result:{type:'win',winner:0}}}),/expression-win/);
  assert.match(renderApp({...base,view:{...base.view,phase:'HAND_RESULT',result:{type:'win',winner:1}}}),/expression-down/);
});
test('exhaustive hand result explains tenpai and point settlement and offers next hand',async()=>{
 const [,{renderApp}]=await load();const html=renderApp({screen:'table',mode:'cpu',characterId:'moka',view:{phase:'HAND_RESULT',selfSeat:0,players:[{name:'自分',points:28000,hand:[]},{name:'南さん',points:24000},{name:'西さん',points:24000},{name:'北さん',points:24000}],legalActions:[{type:'next'}],result:{type:'exhaustive',tenpai:[0],deltas:[3000,-1000,-1000,-1000]}}});
 assert.match(html,/聴牌：自分/);assert.match(html,/\+3,000点/);assert.match(html,/−1,000点/);const center=html.slice(html.indexOf('<div class="table-center">'),html.indexOf('<section class="own-seat"'));assert.match(center,/data-action="next-hand"/,'the next-hand action stays close to the result on phones');
});
