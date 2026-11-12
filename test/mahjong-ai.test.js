import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch, legalActions, applyAction} from '../src/mahjong/match.js';
import {chooseAction, countPublicTiles, rankDiscardCandidates, runCpuTurn} from '../src/mahjong/ai.js';

const players = ['a', 'b', 'c', 'd'];
const readyHand = [0,1,2,9,10,11,18,19,20,27,27,27,31,33];
function discardMatch(hand) {
  const match = createMatch({players, seed: 'ai-policy', now: 0});
  match.players[0].hand = [...hand];
  match.drawnTile = hand.at(-1);
  return match;
}
function reactionMatch(hand, tile = 1) {
  const match = discardMatch([tile,0,2,3,4,5,6,7,8,9,10,11,12,13]);
  // The discarded tile offers a real claim to the next seat.
  match.players[1].hand = [...hand];
  return applyAction(match, 0, {type: 'discard', tile}, match.revision, 1);
}

test('CPU takes a legal tsumo before riichi or discarding', () => {
  const match = discardMatch([0,1,2,9,10,11,18,19,20,27,27,27,31,31]);
  assert.deepEqual(chooseAction(match, 0, () => 0), {type: 'tsumo'});
});

test('CPU may take nine-terminals when its nine-type opening hand has no workable shape',()=>{
 const match=discardMatch([0,8,9,27,28,29,30,31,32,1,3,5,10,12]);
 assert.ok(legalActions(match,0).some(action=>action.type==='nine_terminals'));
 assert.deepEqual(chooseAction(match,0,()=>0),{type:'nine_terminals'});
 const kokushi=discardMatch([0,8,9,17,18,26,27,28,29,30,31,32,33,1]);
 assert.ok(legalActions(kokushi,0).some(action=>action.type==='nine_terminals'));
 assert.notEqual(chooseAction(kokushi,0,()=>0).type,'nine_terminals','the CPU should keep a promising kokushi-shaped hand');
});

test('CPU takes a legal ron before a meld claim', () => {
  const match = reactionMatch([0,1,2,9,10,11,18,19,20,27,27,27,31], 31);
  assert.deepEqual(chooseAction(match, 1, () => 0), {type: 'ron'});
});

test('Kobalab evaluation chooses a legal riichi discard deterministically', () => {
  const match = discardMatch(readyHand);
  const before = structuredClone(match);
  const action=chooseAction(match,0,()=>0);
  assert.deepEqual(action,{type:'riichi_discard',tile:33});
  assert.deepEqual(chooseAction(match,0,()=>0.999),action);
  assert.ok(legalActions(match,0).some(candidate=>JSON.stringify(candidate)===JSON.stringify(action)));
  assert.deepEqual(match, before);
});

test('ordinary discards minimize shanten instead of choosing an arbitrary legal tile', () => {
  const match = discardMatch([0,1,2,9,10,11,18,19,20,27,27,27,31,33]);
  match.players[0].points = 0;
  assert.deepEqual(chooseAction(match, 0, () => 0), {type: 'discard', tile: 33});
  assert.deepEqual(chooseAction(match, 0, () => 0.999), {type: 'discard', tile: 33});
});

test('equally efficient discards prefer tiles already discarded by a riichi opponent', () => {
  const match = discardMatch(readyHand);
  match.players[0].points = 0;
  match.players[2].riichi = true;
  match.players[2].discards = [{tile: 33}];
  assert.deepEqual(chooseAction(match, 0, () => 0), {type: 'discard', tile: 33});
});

test('a discard made before riichi remains genbutsu against that riichi player', () => {
  const match = discardMatch(readyHand);
  const actions = legalActions(match, 0).filter(action => action.type === 'discard');
  match.players[2].riichi = true;
  match.players[2].discards = [{tile: 33}, {tile: 30, riichi: true}];
  const ranked = rankDiscardCandidates(match, 0, actions);
  assert.equal(ranked.find(row => row.action.tile === 33).danger, 0);
});

test('called river tiles are counted once through the public meld, not twice',()=>{
 const match=discardMatch([0,1,2,9,10,11,18,19,20,27,27,31,33,34]);
 match.players[1].discards=[{tile:5,called:true}];match.players[2].melds=[{type:'pon',tiles:[5,5,5],open:true}];
 assert.equal(countPublicTiles(match,0)[5],3);
});

test('a seven-pairs hand preserves its six pairs when discarding', () => {
  const match = discardMatch([0,0,3,3,9,9,12,12,18,18,21,21,30,33]);
  match.players[0].points = 0;
  assert.deepEqual(chooseAction(match, 0, () => 0), {type: 'discard', tile: 30});
});

test('equal-shanten discards use visible ukeire before a seeded tie break',()=>{
 const match=discardMatch([0,0,3,3,9,9,12,12,18,18,21,21,30,33]);match.players[0].points=0;
 const actions=legalActions(match,0).filter(action=>action.type==='discard'),ranked=rankDiscardCandidates(match,0,actions);
 assert.ok(ranked.length>=2);assert.ok(ranked[0].ukeire>=ranked.at(-1).ukeire);
 assert.deepEqual(chooseAction(match,0,()=>0),ranked[0].action);
});

test('CPU choice does not inspect hidden opponents or wall contents',()=>{
 const match=discardMatch(readyHand);match.players[0].points=0;match.players[2].riichi=true;match.players[2].discards=[{tile:33,turn:4,riichi:true}];
 const actions=legalActions(match,0).filter(action=>action.type==='discard'),ranking=rankDiscardCandidates(match,0,actions),first=chooseAction(match,0,()=>.37);
 match.players[1].hand=[...Array(13).fill(0)];match.liveWall.fill(33);match.deadWall.fill(0);match.kanDoraIndicators=[32,0,9,27];
 assert.deepEqual(rankDiscardCandidates(match,0,actions),ranking,'unrevealed future dora indicators are not part of the public information set');
 assert.deepEqual(chooseAction(match,0,()=>.37),first);
});

test('a thirteen-orphans hand discards its unrelated tile', () => {
  const match = discardMatch([0,8,9,17,18,26,27,28,29,30,31,32,33,4]);
  match.players[0].points = 0;
  assert.deepEqual(chooseAction(match, 0, () => 0), {type: 'discard', tile: 4});
});

test('CPU calls only when a meld improves shanten', () => {
  const improving = reactionMatch([0,2,9,10,11,18,19,20,27,27,31,32,33]);
  assert.deepEqual(chooseAction(improving, 1, () => 0), {type: 'chi', tiles: [0,2]});
  const ready = reactionMatch([0,1,2,9,10,11,18,19,20,27,27,27,31]);
  assert.ok(legalActions(ready, 1).some(action => action.type === 'chi'));
  assert.deepEqual(chooseAction(ready, 1, () => 0), {type: 'pass'});
});

test('CPU declines an open call that reaches tenpai with no legal yaku waits', () => {
  // After the chi, two sequences, a pair, and a 2-sided sequence wait make
  // tenpai. The open hand has no tanyao, flush, yakuhai, or sanshoku route.
  const match = reactionMatch([0,2,10,11,12,18,19,20,24,25,27,27,33], 1);
  const action = chooseAction(match, 1, () => 0);
  assert.deepEqual(action, {type: 'pass'});
});

test('runCpuTurn advances one legal action without mutating state or hidden draws', () => {
  const match = discardMatch(readyHand);
  const before = structuredClone(match);
  const next = runCpuTurn(match, 0, () => 0, 42);
  assert.equal(next.revision, match.revision + 1);
  assert.equal(next.players[0].discards.at(-1).tile, 33);
  assert.equal(next.players[0].riichi, true);
  assert.deepEqual(match, before);
  assert.deepEqual(next.deadWall, before.deadWall);
  assert.ok(next.liveWall.length === before.liveWall.length || next.liveWall.length === before.liveWall.length - 1);
});

test('an inactive CPU has no action and leaves the match unchanged', () => {
  const match = discardMatch(readyHand);
  assert.equal(chooseAction(match, 1, () => 0), undefined);
  assert.equal(runCpuTurn(match, 1, () => 0, 1), match);
});

test('four CPUs complete an East-only match through legal transitions', {timeout: 60000}, () => {
  let match = createMatch({players, seed: 'cpu-complete-match', now: 0});
  let steps = 0;
  while (match.phase !== 'MATCH_RESULT' && steps < 12000) {
    const beforeRevision = match.revision;
    if (match.phase === 'HAND_RESULT') {
      match = runCpuTurn(match, 0, () => 0.25, steps);
    } else {
      const seat = [0,1,2,3].find(candidate => legalActions(match, candidate).length);
      assert.notEqual(seat, undefined, `no legal actions in ${match.phase}`);
      const action = chooseAction(match, seat, () => 0.25);
      assert.ok(legalActions(match, seat).some(candidate => JSON.stringify(candidate) === JSON.stringify(action)));
      match = runCpuTurn(match, seat, () => 0.25, steps);
    }
    assert.equal(match.revision, beforeRevision + 1);
    steps++;
  }
  assert.equal(match.phase, 'MATCH_RESULT', 'CPU loop must terminate');
  assert.ok(match.history.length >= 4, 'all East rounds must finish');
  assert.equal(match.players.reduce((total, player) => total + player.points, match.riichiPot), 100000);
});
