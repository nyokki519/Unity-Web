import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch} from '../src/mahjong/match.js';
import {view} from '../src/mahjong/view.js';
import {renderApp} from '../public/mahjong/src/app.js';

test('online hand results preserve tsumo and ron for the displayed winning method',()=>{
  for(const winType of ['tsumo','ron']){
    const match=createMatch({players:['A','B','C','D'],seed:1,now:0});
    match.phase='HAND_RESULT';
    match.result={type:'win',winner:0,winType,han:2,fu:30,deltas:[3000,-1000,-1000,-1000]};
    const room={code:'1234',players:match.players,match,revision:1};
    for(let seat=0;seat<4;seat++){
      const state=view(room,seat);
      assert.equal(state.result.winType,winType);
      const html=renderApp({screen:'table',characterId:'moka',mode:'online',view:state,soundAvailable:false,muted:true});
      assert.ok(html.includes(`A ${winType==='tsumo'?'ツモ':'ロン'} · 2翻 30符`));
    }
  }
});

test('online nagashi result publishes every winner and renders the shared mangan outcome',()=>{
  const match=createMatch({players:['A','B','C','D'],seed:2,now:0});match.phase='HAND_RESULT';
  match.result={type:'nagashi',winner:1,winners:[1,3],deltas:[-8000,6000,-4000,6000]};
  const room={code:'5678',players:match.players,match,revision:1};
  for(let seat=0;seat<4;seat++){
    const state=view(room,seat);assert.deepEqual(state.result.winners,[1,3]);
    const html=renderApp({screen:'table',characterId:'moka',mode:'online',view:state,soundAvailable:false,muted:true});
    assert.match(html,/流し満貫：B、D/);
  }
});
