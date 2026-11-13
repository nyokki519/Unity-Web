import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,legalActions,applyAction} from '../src/mahjong/match.js';
import {chooseAction} from '../src/mahjong/ai.js';
import {referenceDiscardAction,referenceReactionAction,configureReferenceAI} from '../src/mahjong/reference-ai.js';
import MajiangAI from '@kobalab/majiang-ai';
import MajiangCore from '@kobalab/majiang-core';

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

test('reference state adapter encodes chi, red pon and daiminkan in Kobalab notation',()=>{
 const match=createMatch({players,seed:'reference-ai-open-chi-notation',now:0});
 match.players[0].hand=[0,1,2,3,4];
 match.players[0].melds=[
  {type:'chi',tiles:[18,19,20],open:true},
  {type:'pon',tiles:[34,4,4],open:true},
  {type:'kan',tiles:[27,27,27,27],open:true}
 ];
 match.drawnTile=4;
 let serialized;
 class ChiNotationProbe {
  action(message){
   if(message.kaiju)this._model={shoupai:Array.from({length:4},()=>({_lizhi:false}))};
   if(message.qipai){serialized=message.qipai.shoupai[0];this._suanpai={_n_zimo:0,_dapai:Array.from({length:4},()=>({})),_lizhi:[],decrease(){}};}
  }
  select_dapai(){return 'm5';}
 }
 configureReferenceAI(ChiNotationProbe);
 try{assert.deepEqual(referenceDiscardAction(match,0,[{type:'discard',tile:4}]),{type:'discard',tile:4});}
 finally{configureReferenceAI(MajiangAI,MajiangCore.rule);}
 const parsed=MajiangCore.Shoupai.fromString(serialized);
 assert.deepEqual(parsed._fulou,['s123-','m505+','z1111+'],`Kobalab must parse every open meld from ${serialized}`);
 assert.equal(parsed.menqian,false);
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

test('upstream reaction adapter passes the discard object and accepts an embedded chi marker',()=>{
 const match=createMatch({players,seed:'reference-ai-chi-adapter',now:0});
 match.phase='REACTION';match.lastDiscard={seat:0,tile:1};
 const actions=[{type:'chi',tiles:[0,2]},{type:'pass'}];let observed;
 class AdapterProbe {
  action(message){
   if(message.kaiju)this._model={shoupai:Array.from({length:4},()=>({_lizhi:false}))};
   if(message.qipai)this._suanpai={_n_zimo:0,decrease(){}};
  }
  select_fulou(discard){observed=discard;return 'm12-3';}
 }
 configureReferenceAI(AdapterProbe);
 try{
  const chosen=referenceReactionAction(match,1,actions);
  assert.deepEqual(observed,{l:0,p:'m2'},'the pinned engine API receives {l,p}, not a notation string');
  assert.deepEqual(chosen,actions[0],'the marker belongs to the middle tile of the called sequence');
 }finally{configureReferenceAI(MajiangAI,MajiangCore.rule);}
});

test('reference advisor exposes public riichi danger and all genbutsu to the safety model',()=>{
 const match=createMatch({players,seed:'reference-ai-riichi-safety',now:0});
 match.players[2].riichi=true;
 match.players[2].discards=[{tile:34,called:false},{tile:2,called:true}];
 match.players[1].melds=[{type:'chi',tiles:[0,1,2],open:true}];
 const actions=legalActions(match,0);let observed;
 class SafetyProbe {
  action(message){
   if(message.kaiju)this._model={shoupai:Array.from({length:4},()=>({_lizhi:false}))};
   if(message.qipai)this._suanpai={_n_zimo:0,_dapai:Array.from({length:4},()=>({})),_lizhi:[],decrease(){}};
  }
  select_dapai(){
   const wind=(2-match.dealer+4)%4;
   observed={modelRiichi:this._model.shoupai[wind]._lizhi,suanpaiRiichi:this._suanpai._lizhi[wind],redFive:this._suanpai._dapai[wind].m5,calledDiscard:this._suanpai._dapai[wind].m3};
   return 'm1';
  }
 }
 configureReferenceAI(SafetyProbe);
 try{referenceDiscardAction(match,0,actions);}
 finally{configureReferenceAI(MajiangAI,MajiangCore.rule);}
 assert.deepEqual(observed,{modelRiichi:true,suanpaiRiichi:true,redFive:true,calledDiscard:true});
});

test('real reference AI can recommend a legal chi when the called tile sits inside the sequence',()=>{
 const match=createMatch({players,seed:'real-chi',now:0});
 match.players[0].hand=[1,0,2,3,4,5,6,7,8,9,10,11,12,13];
 match.players[1].hand=[0,2,9,10,11,18,19,20,22,23,24,27,28];match.drawnTile=13;
 const reacted=applyAction(match,0,{type:'discard',tile:1},match.revision,1),actions=legalActions(reacted,1);
 const recommendation=referenceReactionAction(reacted,1,actions);
 assert.deepEqual(recommendation,{type:'chi',tiles:[0,2]});
 assert.ok(actions.some(action=>JSON.stringify(action)===JSON.stringify(recommendation)));
});
