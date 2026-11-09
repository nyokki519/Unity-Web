import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,legalActions,applyAction,advanceTurn} from '../src/mahjong/match.js';

const players=['a','b','c','d'];

test('a seeded match deals thirteen tiles to each seat and one extra to dealer',()=>{
  const match=createMatch({players,seed:1234,now:0});
  assert.equal(match.phase,'DISCARD');
  assert.equal(match.players.length,4);
  assert.equal(match.players.reduce((n,p)=>n+p.hand.length,0),53);
  assert.equal(match.activeSeat,match.dealer);
  assert.ok(legalActions(match,match.activeSeat).some(a=>a.type==='discard'));
});

test('discard plus universal pass advances exactly one draw and never double-advances',()=>{
  let match=createMatch({players,seed:55,now:0});
  const seat=match.activeSeat,tile=match.players[seat].hand[0];
  match=applyAction(match,seat,{type:'discard',tile},match.revision,1);
  if(match.phase==='REACTION')for(let s=0;s<4&&match.phase==='REACTION';s++)if(s!==seat&&legalActions(match,s).some(a=>a.type==='pass'))match=applyAction(match,s,{type:'pass'},match.revision,2);
  assert.equal(match.phase,'DISCARD');
  assert.equal(match.activeSeat,(seat+1)%4);
  assert.equal(match.players[match.activeSeat].hand.length,14);
  const revision=match.revision;
  assert.throws(()=>advanceTurn(match,3),/phase|turn|advance/i);
  assert.equal(match.revision,revision);
});

test('an out-of-turn discard is rejected without mutating state',()=>{
  const match=createMatch({players,seed:7,now:0});
  const before=structuredClone(match);
  assert.throws(()=>applyAction(match,(match.activeSeat+1)%4,{type:'discard',tile:0},match.revision,1));
  assert.deepEqual(match,before);
});

test('stale revisions are rejected before applying a repeated action',()=>{
  const match=createMatch({players,seed:91,now:0});
  const seat=match.activeSeat,tile=match.players[seat].hand[0];
  const next=applyAction(match,seat,{type:'discard',tile},match.revision,1);
  assert.throws(()=>applyAction(next,seat,{type:'discard',tile},match.revision,2),/stale|revision/i);
  assert.equal(next.players[seat].discards.length,1);
});

test('an open kan takes a replacement draw, reveals the next dora and tracks rinshan seat',()=>{
  let match=createMatch({players,seed:111,now:0});
  match.players[0].hand=[27,0,1,2,3,4,5,6,7,8,9,10,11,12];match.drawnTile=12;
  match.players[1].hand=[27,27,27,0,1,2,3,4,5,6,7,8,9];
  match.players[1].hand.sort((a,b)=>a-b);
  match.revision++;
  match=applyAction(match,0,{type:'discard',tile:27},match.revision,1);
  assert.ok(legalActions(match,1).some(a=>a.type==='kan'));
  for(const seat of [2,3])if(match.phase==='REACTION'&&legalActions(match,seat).some(a=>a.type==='pass'))match=applyAction(match,seat,{type:'pass'},match.revision,2);
  const wallLength=match.liveWall.length;
  match=applyAction(match,1,{type:'kan',tiles:[27,27,27]},match.revision,3);
  assert.equal(match.phase,'DISCARD');assert.equal(match.activeSeat,1);assert.equal(match.rinshanSeat,1);
  assert.equal(match.players[1].melds[0].type,'kan');assert.equal(match.doraIndicators.length,2);
  assert.equal(match.players[1].hand.length,11);assert.equal(match.liveWall.length,wallLength-1);
});

test('concealed kan is declared on the table turn and receives a rinshan tile',()=>{
  let match=createMatch({players,seed:313,now:0});const player=match.players[0];player.hand=[4,4,4,4,0,1,2,9,10,11,18,19,20,21];match.drawnTile=21;match.revision++;
  const action=legalActions(match,0).find(a=>a.type==='ankan');assert.ok(action);match=applyAction(match,0,action,match.revision,1);
  assert.equal(match.players[0].melds[0].type,'kan');assert.equal(match.players[0].melds[0].open,false);assert.equal(match.players[0].hand.length,11);assert.equal(match.rinshanSeat,0);assert.equal(match.doraIndicators.length,2);
});

test('added kan opens chankan reaction and commits only after all ron passes',()=>{
  let match=createMatch({players,seed:514,now:0});match.players[0].hand=[0,2,3,4,5,6,7,8,9,10,11,12,13,33];match.players[0].melds=[{type:'pon',tiles:[0,0,0],open:true}];
  match.players[1].hand=[1,2,9,10,11,18,19,20,21,22,23,15,15];match.players[1].hand.sort((a,b)=>a-b);match.drawnTile=33;match.revision++;
  const action=legalActions(match,0).find(a=>a.type==='kakan');assert.ok(action);match=applyAction(match,0,action,match.revision,1);assert.equal(match.phase,'REACTION');assert.ok(legalActions(match,1).some(a=>a.type==='ron'));
  for(const seat of [1,2,3])if(match.phase==='REACTION'&&legalActions(match,seat).some(a=>a.type==='pass'))match=applyAction(match,seat,{type:'pass'},match.revision,2);
  assert.equal(match.players[0].melds[0].type,'kan');assert.equal(match.players[0].melds[0].tiles.length,4);assert.equal(match.rinshanSeat,0);
});

test('chankan wins on the added tile before the kan commits',()=>{
  let match=createMatch({players,seed:515,now:0});match.players[0].hand=[0,2,3,4,5,6,7,8,9,10,11,12,13,33];match.players[0].melds=[{type:'pon',tiles:[0,0,0],open:true}];
  match.players[1].hand=[1,2,9,10,11,18,19,20,21,22,23,15,15];match.players[1].hand.sort((a,b)=>a-b);match.drawnTile=33;match.revision++;
  const action=legalActions(match,0).find(a=>a.type==='kakan');match=applyAction(match,0,action,match.revision,1);match=applyAction(match,1,{type:'ron'},match.revision,2);
  assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.winner,1);assert.equal(match.result.chankan,true);assert.equal(match.players[0].melds[0].type,'pon');
});
