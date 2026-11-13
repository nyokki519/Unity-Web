import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,legalActions,applyAction,advanceTurn,MAX_HANDS} from '../src/mahjong/match.js';

const players=['a','b','c','d'];

test('a seeded match deals thirteen tiles to each seat and one extra to dealer',()=>{
  const match=createMatch({players,seed:1234,now:0});
  assert.equal(match.phase,'DISCARD');
  assert.equal(match.players.length,4);
  assert.equal(match.players.reduce((n,p)=>n+p.hand.length,0),53);
  assert.equal(match.activeSeat,match.dealer);
  assert.ok(legalActions(match,match.activeSeat).some(a=>a.type==='discard'));
});

test('dealer first-draw tsumo is scored as tenhou',()=>{
  const match=createMatch({players,seed:'tenhou',now:0}),hand=[0,1,2,9,10,11,18,19,20,27,27,27,31,31];
  match.players[0].hand=[...hand];match.drawnTile=31;
  assert.ok(legalActions(match,0).some(action=>action.type==='tsumo'));
  const result=applyAction(match,0,{type:'tsumo'},match.revision,1).result;
  assert.equal(result.yaku[0].id,'tenhou');assert.equal(result.han,13);assert.equal(result.deltas.reduce((sum,value)=>sum+value,0),0);
});

test('stacked double yakuman settle the full five-limit tsumo through the match path',()=>{
 const match=createMatch({players,seed:'stacked-double-yakuman',now:0});
 match.players[0].hand=[27,27,27,28,28,28,29,29,29,30,30,30,31,31];
 match.drawnTile=31;match.turnNumber=2;
 assert.ok(legalActions(match,0).some(action=>action.type==='tsumo'));
 const result=applyAction(match,0,{type:'tsumo'},match.revision,1).result;
 assert.equal(result.yaku.reduce((sum,yaku)=>sum+(yaku.yakuman||0),0),5);
 assert.equal(result.han,65);
 assert.deepEqual(result.deltas,[240000,-80000,-80000,-80000]);
 assert.equal(result.deltas.reduce((sum,value)=>sum+value,0),0);
});

test('a non-dealer first-draw tsumo is chiihou only before any call',()=>{
  const match=createMatch({players,seed:'chiihou',now:0}),hand=[0,1,2,9,10,11,18,19,20,27,27,27,31,31];
  match.players[0].discards=[{tile:3,turn:1,called:false}];
  match.players[1].hand=[...hand];match.activeSeat=1;match.drawnTile=31;match.turnNumber=2;
  const result=applyAction(match,1,{type:'tsumo'},match.revision,1).result;
  assert.equal(result.yaku[0].id,'chiihou');assert.equal(result.han,13);

  const afterCall=structuredClone(match);afterCall.players[0].melds=[{type:'chi',tiles:[0,1,2],open:true}];
  assert.equal(legalActions(afterCall,1).some(action=>action.type==='tsumo'),true,'the hand still has its ordinary yakuhai win');
  const ordinary=applyAction(afterCall,1,{type:'tsumo'},afterCall.revision,1).result;
  assert.equal(ordinary.yaku.some(yaku=>yaku.id==='chiihou'),false);
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

test('a riichi player may declare ankan only when the drawn fourth tile preserves the wait',()=>{
 let match=createMatch({players,seed:314,now:0});const player=match.players[0];
 player.hand=[0,0,0,0,9,10,11,18,19,20,27,27,3,4];player.riichi=true;match.drawnTile=0;match.revision++;
 const action=legalActions(match,0).find(a=>a.type==='ankan');assert.ok(action,'the same 2m/5m wait remains after the concealed kan');
 match=applyAction(match,0,action,match.revision,1);assert.equal(match.players[0].melds[0].open,false);assert.equal(match.players[0].melds[0].tiles.length,4);assert.equal(match.rinshanSeat,0);
 match=createMatch({players,seed:315,now:0});match.players[0].hand=[0,0,0,0,9,10,11,18,19,20,27,27,3,4];match.players[0].riichi=true;match.drawnTile=4;match.revision++;
 assert.equal(legalActions(match,0).some(a=>a.type==='ankan'),false,'a kan not formed by the current draw is not allowed after riichi');
 match=createMatch({players,seed:316,now:0});match.players[0].hand=[5,5,5,5,33,13,12,18,33,3,11,33,18,4];match.players[0].riichi=true;match.drawnTile=5;match.revision++;
 assert.equal(legalActions(match,0).some(a=>a.type==='ankan'),false,'a concealed kan that removes a wait is not allowed after riichi');
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
  assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.winner,1);assert.equal(match.result.chankan,true);assert.equal(match.players[0].melds[0].type,'pon');assert.equal(match.pendingKan,null);
});

test('kokushi may rob a concealed kan while ordinary waits cannot',()=>{
 let match=createMatch({players,seed:516,now:0});match.players[0].hand=[0,0,0,0,1,2,3,4,5,6,7,8,9,10];match.drawnTile=0;match.revision++;
 match.players[1].hand=[0,8,9,17,18,26,27,28,29,30,31,32,33];match.players[1].hand.sort((a,b)=>a-b);match.revision++;
 const action=legalActions(match,0).find(a=>a.type==='ankan');assert.ok(action);match=applyAction(match,0,action,match.revision,1);
 assert.equal(match.phase,'REACTION');assert.ok(legalActions(match,1).some(a=>a.type==='ron'));
 match=applyAction(match,1,{type:'ron'},match.revision,2);assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.winner,1);assert.equal(match.result.chankan,true);assert.equal(match.players[0].melds.length,0);assert.equal(match.pendingKan,null);
 match=createMatch({players,seed:517,now:0});match.players[0].hand=[0,0,0,0,1,2,3,4,5,6,7,8,9,10];match.drawnTile=0;match.revision++;
 match.players[1].hand=[1,2,9,10,11,18,19,20,12,13,14,27,27];match.players[1].hand.sort((a,b)=>a-b);match.revision++;
 const nextAnkan=legalActions(match,0).find(a=>a.type==='ankan');match=applyAction(match,0,nextAnkan,match.revision,1);
 assert.equal(match.phase,'DISCARD','non-kokushi waits pass the concealed kan automatically');assert.equal(match.players[0].melds[0].type,'kan');
});

test('four kans abort only when more than one player declared them',()=>{
 for(const [owners,want] of [[[0,0,0,0],'DISCARD'],[[0,1,1,0],'HAND_RESULT']]){
  let match=createMatch({players,seed:518,now:0});match.players[0].melds=[0,1,2].map(type=>({type:'kan',tiles:Array(4).fill(type),open:false}));match.players[0].hand=[3,4,4,4,4];match.drawnTile=3;match.kanCount=3;match.kanOwners=owners.slice(0,3);match.revision++;
  const action=legalActions(match,0).find(a=>a.type==='ankan');assert.ok(action);match=applyAction(match,0,action,match.revision,1);
  assert.equal(match.phase,want);if(want==='HAND_RESULT')assert.equal(match.result.reason,'four-kans');else assert.deepEqual(match.kanOwners,owners);
 }
});

test('a fifth kan cannot be declared after four kans by the same player',()=>{
 let match=createMatch({players,seed:5151,now:0});match.kanCount=4;match.kanOwners=[0,0,0,0];
 match.players[0].melds=[0,1,2,3].map(type=>({type:'kan',tiles:Array(4).fill(type),open:false}));
 match.phase='DISCARD';match.activeSeat=1;match.players[1].hand=[27,27,27,27,0,1,2,9,10,11,18,19,20,21];match.drawnTile=21;
 assert.equal(legalActions(match,1).some(action=>action.type==='ankan'),false);
 match.players[1].melds=[{type:'pon',tiles:[28,28,28],open:true}];match.players[1].hand=[28,0,1,2,9,10,11,18,19,20,23,24,25,26];
 assert.equal(legalActions(match,1).some(action=>action.type==='kakan'),false);
 match.phase='REACTION';match.activeSeat=null;match.reactionSeats=[1];match.responses={};match.lastDiscard={tile:29,seat:0,riverIndex:0};match.players[0].discards=[{tile:29,called:false}];match.players[1].melds=[];match.players[1].hand=[29,29,29,0,1,2,9,10,11,18,19,20,21];
 assert.equal(legalActions(match,1).some(action=>action.type==='kan'),false);
});

test('kan actions are unavailable when the live wall is empty',()=>{
 let match=createMatch({players,seed:519,now:0});match.players[0].hand=[4,4,4,4,0,1,2,9,10,11,18,19,20,21];match.drawnTile=21;match.liveWall=[];match.revision++;
 assert.equal(legalActions(match,0).some(action=>['ankan','kakan'].includes(action.type)),false,'a concealed or added kan needs a live-wall replacement draw');
 match=createMatch({players,seed:520,now:0});match.phase='REACTION';match.lastDiscard={tile:27,seat:0,riverIndex:0};match.reactionSeats=[1];match.players[1].hand=[27,27,27,0,1,2,9,10,11,18,19,20,21];match.liveWall=[];match.revision++;
 assert.equal(legalActions(match,1).some(action=>action.type==='kan'),false,'a daiminkan also needs a live-wall tile to replenish the dead wall');
});

test('east-only match has a 12-hand ceiling even when the dealer keeps winning',()=>{
 let match=createMatch({players,seed:521,now:0});match.phase='HAND_RESULT';match.handNumber=4;match.handsPlayed=MAX_HANDS-1;match.result={type:'win',winner:match.dealer};
 match=advanceTurn(match,1);assert.equal(match.phase,'MATCH_RESULT');assert.equal(match.handsPlayed,MAX_HANDS);assert.equal(match.result.reason,'hand-limit');assert.match(match.result.title,/最大12局/);assert.equal(match.result.rankings.length,4);
 match=createMatch({players,seed:522,now:0});match.phase='HAND_RESULT';delete match.handsPlayed;match.handNumber=4;match.history=Array.from({length:MAX_HANDS-1},()=>({type:'exhaustive'}));match.result={type:'win',winner:match.dealer};
 match=advanceTurn(match,1);assert.equal(match.handsPlayed,MAX_HANDS,'an older saved match derives played hands from its history');assert.equal(match.phase,'MATCH_RESULT');
});

test('new hands clear riichi and furiten restrictions so a former riichi seat may choose any discard',()=>{
 let match=createMatch({players,seed:601,now:0});
 for(const player of match.players)Object.assign(player,{riichi:true,doubleRiichi:true,ippatsu:true,furiten:true,temporaryFuriten:true,riichiFuriten:true});
 match.phase='HAND_RESULT';match.result={type:'abortive',reason:'four-riichi'};match.riichiDeclarations=4;
 match=advanceTurn(match,1);
 assert.equal(match.phase,'DISCARD');
 for(const player of match.players)for(const flag of ['riichi','doubleRiichi','ippatsu','furiten','temporaryFuriten','riichiFuriten'])assert.equal(player[flag],false,`${flag} belongs to the previous hand`);
 assert.equal(match.riichiDeclarations,0);
 assert.deepEqual(new Set(legalActions(match,match.dealer).filter(action=>action.type==='discard').map(action=>action.tile)),new Set(match.players[match.dealer].hand));
});

test('a previous hand cannot contribute kan owners to the next hand four-kan abort check',()=>{
 let match=createMatch({players,seed:602,now:0});
 match.kanOwners=[1,2,1,2];match.kanCount=4;match.phase='HAND_RESULT';match.result={type:'abortive',reason:'four-kans'};
 match=advanceTurn(match,1);
 assert.equal(match.kanCount,0);
 assert.deepEqual(match.kanOwners,[]);
 match.players[0].melds=[0,1,2].map(type=>({type:'kan',tiles:Array(4).fill(type),open:false}));match.players[0].hand=[3,4,4,4,4];match.drawnTile=3;match.kanCount=3;match.kanOwners.push(0,0,0);
 const action=legalActions(match,0).find(candidate=>candidate.type==='ankan');assert.ok(action);
 match=applyAction(match,0,action,match.revision,2);
 assert.equal(match.phase,'DISCARD','four kans by the same player in this hand do not abort');
 assert.deepEqual(match.kanOwners,[0,0,0,0]);
});

test('a kan robbed by triple ron leaves no pending declaration in the next hand',()=>{
 let match=createMatch({players,seed:603,now:0});
 match.pendingKan={kind:'kakan',seat:0,tile:0,meldIndex:0};match.phase='HAND_RESULT';match.result={type:'abortive',reason:'triple-ron'};
 match=advanceTurn(match,1);
 assert.equal(match.pendingKan,null);
});

test('a later seat can declare double-riichi on its first discard after uninterrupted earlier discards',()=>{
 let match=createMatch({players,seed:604,now:0});
 match.activeSeat=2;match.players[0].discards=[{tile:27,called:false}];match.players[1].discards=[{tile:28,called:false}];
 match.players[2].hand=[0,1,2,3,4,5,10,11,12,23,24,25,13,33];match.drawnTile=33;
 assert.ok(legalActions(match,2).some(action=>action.type==='riichi_discard'&&action.tile===33));
 match=applyAction(match,2,{type:'riichi_discard',tile:33},match.revision,1);
 assert.equal(match.players[2].doubleRiichi,true);
});

test('a previous own discard or any earlier call prevents double-riichi',()=>{
 for(const interruption of ['own-discard','open-call','concealed-kan']){
  let match=createMatch({players,seed:605,now:0});match.activeSeat=2;
  match.players[2].hand=[0,1,2,3,4,5,10,11,12,23,24,25,13,33];match.drawnTile=33;
  if(interruption==='own-discard')match.players[2].discards=[{tile:28,called:false}];
  else match.players[1].melds=[interruption==='open-call'?{type:'pon',tiles:[27,27,27],open:true}:{type:'kan',tiles:[27,27,27,27],open:false}];
  match=applyAction(match,2,{type:'riichi_discard',tile:33},match.revision,1);
  assert.equal(match.players[2].riichi,true);
  assert.equal(match.players[2].doubleRiichi,false,interruption);
 }
});

test('exhaustive draws increment honba even when a noten dealer rotates',()=>{
 for(const [tenpai,wantDealer,wantHand] of [[[1],1,2],[[0],0,1]]){
  let match=createMatch({players,seed:606,now:0});match.honba=2;match.phase='HAND_RESULT';match.result={type:'exhaustive',tenpai};
  match=advanceTurn(match,1);
  assert.equal(match.dealer,wantDealer);assert.equal(match.handNumber,wantHand);assert.equal(match.honba,3);
 }
 let match=createMatch({players,seed:607,now:0});match.honba=2;match.phase='HAND_RESULT';match.result={type:'win',winner:1};
 match=advanceTurn(match,1);assert.equal(match.honba,0,'a nondealer win still resets honba');
});

test('consecutive dealer continuations use unique walls while replaying the same seed remains deterministic',()=>{
 const sequences=[];
 for(let replay=0;replay<2;replay++){
  let match=createMatch({players,seed:'continuation-regression',now:0});const walls=[];
  for(let hand=0;hand<3;hand++){
   match.phase='HAND_RESULT';match.result={type:'abortive',reason:'nine-terminals'};match=advanceTurn(match,hand+1);
   assert.equal(match.dealer,0);assert.equal(match.handNumber,1);
   walls.push({hands:match.players.map(player=>player.hand),liveWall:match.liveWall,deadWall:match.deadWall});
  }
  assert.notDeepEqual(walls[0],walls[1],'the second and third dealt hands must not repeat a wall');
  assert.notDeepEqual(walls[1],walls[2]);sequences.push(walls);
 }
 assert.deepEqual(sequences[0],sequences[1]);
});

function fourRiichiFixture(ronOnFourth=false){
 const match=createMatch({players,seed:701,now:0});
 const waiting=[0,1,2,3,4,5,9,10,11,18,19,20];
 for(let seat=0;seat<4;seat++)match.players[seat].hand=[...waiting,ronOnFourth&&seat===0?32:27];
 match.players[0].hand.push(33);match.drawnTile=33;match.liveWall=[33,33,ronOnFourth?32:33,30];
 return match;
}

function firstWindDiscardFixture(wind=27){
 const match=createMatch({players,seed:702,now:0});
 const hand=[0,2,4,6,8,9,11,13,15,17,18,20,22];
 for(const player of match.players)player.hand=[...hand];
 match.players[0].hand.push(wind);match.drawnTile=wind;match.liveWall=[wind,wind,wind,31];
 return match;
}

test('four riichi abort only after all declaration discards resolve without ron and carry all sticks',()=>{
 let match=fourRiichiFixture();
 for(let seat=0;seat<4;seat++){
  assert.equal(match.activeSeat,seat);
  match=applyAction(match,seat,{type:'riichi_discard',tile:33},match.revision,seat+1);
  if(seat<3)assert.equal(match.phase,'DISCARD','three declarations do not abort');
 }
 assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.type,'abortive');assert.equal(match.result.reason,'four-riichi');
 assert.equal(match.riichiPot,4000);assert.deepEqual(match.players.map(player=>player.points),[24000,24000,24000,24000]);
 assert.equal(match.liveWall.length,1,'the hand ends before the next draw');
 match=advanceTurn(match,5);assert.equal(match.dealer,0);assert.equal(match.honba,1);assert.equal(match.riichiPot,4000);
});

test('ron on the fourth riichi declaration wins before the abortive-draw check',()=>{
 let match=fourRiichiFixture(true);
 for(let seat=0;seat<4;seat++)match=applyAction(match,seat,{type:'riichi_discard',tile:seat===3?32:33},match.revision,seat+1);
 assert.equal(match.phase,'REACTION');assert.equal(match.result,null);
 assert.ok(legalActions(match,0).some(action=>action.type==='ron'));
 match=applyAction(match,0,{type:'ron'},match.revision,5);
 assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.type,'win');assert.equal(match.result.winner,0);assert.equal(match.result.winType,'ron');
});

test('passing ron on the fourth riichi declaration then resolves four-riichi',()=>{
 let match=fourRiichiFixture(true);
 for(let seat=0;seat<4;seat++)match=applyAction(match,seat,{type:'riichi_discard',tile:seat===3?32:33},match.revision,seat+1);
 assert.equal(match.phase,'REACTION');
 match=applyAction(match,0,{type:'pass'},match.revision,5);
 assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.reason,'four-riichi');assert.equal(match.riichiPot,4000);
});

test('four uninterrupted first identical wind discards abort before the next draw',()=>{
 for(const wind of [27,28,29,30]){
  let match=firstWindDiscardFixture(wind);
  for(let seat=0;seat<4;seat++){
   match=applyAction(match,seat,{type:'discard',tile:wind},match.revision,seat+1);
   if(seat<3)assert.equal(match.phase,'DISCARD');
  }
  assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.type,'abortive');assert.equal(match.result.reason,'four-winds');
  assert.equal(match.liveWall.length,1);assert.deepEqual(match.players.map(player=>player.points),[25000,25000,25000,25000]);
 }
});

test('dragons, differing winds and a second discard cannot trigger four-winds',()=>{
 for(const invalid of ['dragon','different-wind','second-discard']){
  const wind=invalid==='dragon'?31:27;let match=firstWindDiscardFixture(wind);
  if(invalid==='different-wind')match.players[0].hand[match.players[0].hand.length-1]=28;
  if(invalid==='second-discard')match.players[0].discards=[{tile:27,called:false}];
  for(let seat=0;seat<4;seat++)match=applyAction(match,seat,{type:'discard',tile:invalid==='different-wind'&&seat===0?28:wind},match.revision,seat+1);
  assert.equal(match.phase,'DISCARD',invalid);assert.equal(match.result,null,invalid);
 }
});

test('nine-terminals abort is available on an uninterrupted first draw and ends the hand without payment',()=>{
 let match=createMatch({players,seed:808,now:0});
 match.activeSeat=1;match.players[0].discards=[{tile:27,called:false}];
 match.players[1].hand=[0,8,9,17,18,26,27,28,29,30,31,32,33,1];match.drawnTile=1;match.revision++;
 assert.ok(legalActions(match,1).some(action=>action.type==='nine_terminals'));
 match=applyAction(match,1,{type:'nine_terminals'},match.revision,1);
 assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.type,'abortive');assert.equal(match.result.reason,'nine-terminals');
 assert.deepEqual(match.players.map(player=>player.points),[25000,25000,25000,25000]);
});

test('nine-terminals requires nine distinct terminal or honor types and an uncalled closed first turn',()=>{
 for(const invalid of ['eight-types','own-discard','call']){
  const match=createMatch({players,seed:809,now:0});match.players[0].hand=[0,8,9,17,18,26,27,28,29,30,31,32,1,2];match.drawnTile=2;
  if(invalid==='eight-types')match.players[0].hand=[0,8,9,17,18,26,27,28,1,2,3,4,5,6];
  if(invalid==='own-discard')match.players[0].discards=[{tile:27,called:false}];
  if(invalid==='call')match.players[2].melds=[{type:'pon',tiles:[31,31,31],open:true}];
  assert.equal(legalActions(match,0).some(action=>action.type==='nine_terminals'),false,invalid);
  assert.throws(()=>applyAction(match,0,{type:'nine_terminals'},match.revision,1),/illegal/i,invalid);
 }
});

function lastDiscardNagashiFixture(rivers){
 const match=createMatch({players,seed:810,now:0});match.activeSeat=3;match.liveWall=[];match.players.forEach((player,seat)=>{player.discards=(rivers[seat]||[]).map(tile=>({tile,called:false}));});
 for(const player of match.players.slice(0,3))player.hand=[0,1,2,3,4,5,6,7,8,9,10,11,12];
 match.players[3].hand=[0,1,2,3,4,5,6,7,8,9,10,11,12,27];match.drawnTile=27;match.revision++;return match;
}

test('exhaustive draw recognizes one or multiple uncalled terminal-only rivers as nagashi mangan',()=>{
 let match=lastDiscardNagashiFixture([[27],[28],[4],[4]]);
 match=applyAction(match,3,{type:'discard',tile:27},match.revision,1);
 assert.equal(match.phase,'HAND_RESULT');assert.equal(match.result.type,'nagashi');assert.deepEqual(match.result.winners,[0,1]);
 assert.equal(match.players.reduce((sum,player)=>sum+player.points,0),100000);
 assert.ok(match.result.deltas.some(delta=>delta>0));
});

test('nagashi mangan requires no call anywhere, only uncalled terminal or honor discards, and a closed hand',()=>{
 for(const invalid of ['called','simple','meld','other-meld']){
  let match=lastDiscardNagashiFixture([[27],[4],[4],[4]]);
  if(invalid==='called')match.players[0].discards[0].called=true;
  if(invalid==='simple')match.players[0].discards[0].tile=4;
  if(invalid==='meld'||invalid==='other-meld')match.players[invalid==='meld'?0:2].melds=[{type:'kan',tiles:[31,31,31,31],open:invalid==='other-meld'}];
  match=applyAction(match,3,{type:'discard',tile:27},match.revision,1);
  assert.equal(match.result.type,'exhaustive',invalid);
 }
});

test('a called discard or any earlier meld interrupts four-winds',()=>{
 for(const interruption of ['called-discard','open-meld','concealed-kan']){
  let match=firstWindDiscardFixture();
  for(let seat=0;seat<3;seat++)match=applyAction(match,seat,{type:'discard',tile:27},match.revision,seat+1);
  if(interruption==='called-discard')match.players[0].discards[0].called=true;
  else {match.players[0].melds=[interruption==='open-meld'?{type:'chi',tiles:[0,1,2],open:true}:{type:'kan',tiles:[31,31,31,31],open:false}];match.players[0].hand=match.players[0].hand.slice(0,10);}
  match=applyAction(match,3,{type:'discard',tile:27},match.revision,4);
  assert.equal(match.phase,'DISCARD',interruption);assert.equal(match.result,null,interruption);
 }
});
