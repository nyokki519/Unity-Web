import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,legalActions,applyAction} from '../src/mahjong/match.js';
import {chooseAction} from '../src/mahjong/ai.js';
import {referenceDiscardAction} from '../src/mahjong/reference-ai.js';

const players=['Self','CPU 1','CPU 2','CPU 3'];

test('Kobalab recommendation maps to one current legal discard or riichi action',()=>{
 const match=createMatch({players,seed:'reference-ai-legal',now:0});
 const choices=legalActions(match,0).filter(action=>['discard','riichi_discard'].includes(action.type));
 const recommendation=referenceDiscardAction(match,0,choices);
 assert.ok(recommendation,'reference AI should produce a discard recommendation');
 assert.ok(choices.some(action=>JSON.stringify(action)===JSON.stringify(recommendation)));
 assert.deepEqual(chooseAction(match,0,()=>.25),recommendation);
});
test('reference CPU decision does not depend on hidden hands or wall order',()=>{
 const match=createMatch({players,seed:'reference-ai-public-only',now:0});
 const first=referenceDiscardAction(match,0,legalActions(match,0));
 const changed=structuredClone(match);
 changed.liveWall.reverse();changed.deadWall.reverse();changed.rinshanTiles.reverse();
 for(const [seat,player] of changed.players.entries())if(seat!==0)player.hand=Array(player.hand.length).fill(33);
 const second=referenceDiscardAction(changed,0,legalActions(changed,0));
 assert.deepEqual(second,first);
});

test('reference state adapter supports exposed melds and red fives without leaking them',()=>{
 const match=createMatch({players,seed:'reference-ai-meld',now:0}),player=match.players[1];
 player.melds=[{type:'pon',tiles:[0,0,0],open:true}];
 player.discards=[{tile:34,called:false},{tile:6,called:true}];
 const actions=legalActions(match,0),recommendation=referenceDiscardAction(match,0,actions);
 assert.ok(actions.some(action=>JSON.stringify(action)===JSON.stringify(recommendation)));
});

test('reference CPU weighs open-call value and returns only a matching legal meld',()=>{
 const match=createMatch({players,seed:'reference-ai-call',now:0}),tile=29;
 match.players[0].hand=[tile,0,2,3,4,5,6,7,8,9,10,11,12,13];
 match.players[1].hand=[tile,tile,0,1,2,9,10,11,18,19,20,27,28];
 match.drawnTile=13;
 const reacted=applyAction(match,0,{type:'discard',tile},match.revision,1);
 const actions=legalActions(reacted,1),action=chooseAction(reacted,1);
 assert.deepEqual(action,{type:'pon',tiles:[tile,tile]});
 assert.ok(actions.some(candidate=>JSON.stringify(candidate)===JSON.stringify(action)));
 const hiddenChanged=structuredClone(reacted);hiddenChanged.liveWall.reverse();
 for(let seat=0;seat<4;seat++)if(seat!==1)hiddenChanged.players[seat].hand=Array(hiddenChanged.players[seat].hand.length).fill(33);
 assert.deepEqual(chooseAction(hiddenChanged,1),action,'open-call advice must not depend on opponents’ concealed tiles or wall order');
});
