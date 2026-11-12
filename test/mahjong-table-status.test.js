import test from 'node:test';
import assert from 'node:assert/strict';
import {renderApp} from '../public/mahjong/src/app.js';

const players=[
  {name:'自分',points:25000,hand:[1],discards:[],melds:[]},
  {name:'モカ',points:25000,handCount:13,discards:[],melds:[]},
  {name:'すみれ',points:25000,handCount:13,discards:[],melds:[]},
  {name:'ほうま',points:25000,handCount:13,discards:[],melds:[]}
];

test('online turn status names the opponent whose discard is active',()=>{
  const markup=renderApp({screen:'table',characterId:'moka',view:{phase:'DISCARD',selfSeat:0,activeSeat:2,players,legalActions:[]}});
  assert.match(markup,/<strong role="status" aria-live="polite">すみれの番<\/strong>/);
});

test('riichi discard action uses its Japanese action label',()=>{
  const markup=renderApp({screen:'table',characterId:'moka',selectedTile:'1',view:{phase:'DISCARD',selfSeat:0,activeSeat:0,players,legalActions:[{type:'discard',tile:1},{type:'riichi_discard',tile:1}]}});
  const actionButton=markup.match(/<button data-legal="1">([^<]+)<\/button>/)?.[1];
  assert.match(actionButton||'',/^リーチして切る$/);
  assert.doesNotMatch(actionButton||'',/riichi_discard/);
});

test('riichi choices are shown only for the selected discard instead of flooding the action tray',()=>{
  const legalActions=[{type:'discard',tile:1},...Array.from({length:13},(_,i)=>({type:'riichi_discard',tile:i}))];
  const unselected=renderApp({screen:'table',characterId:'moka',view:{phase:'DISCARD',selfSeat:0,activeSeat:0,players,legalActions}});
  assert.equal((unselected.match(/リーチして切る/g)||[]).length,0);
  assert.doesNotMatch(unselected,/riichi_discard/);
  const selected=renderApp({screen:'table',characterId:'moka',selectedTile:'1',view:{phase:'DISCARD',selfSeat:0,activeSeat:0,players,legalActions}});
  assert.equal((selected.match(/リーチして切る/g)||[]).length,1);
});

test('reaction status names only the actions currently available to the player',()=>{
  const markup=renderApp({screen:'table',characterId:'moka',view:{phase:'REACTION',selfSeat:0,players,legalActions:[{type:'pass'},{type:'chi',tiles:[0,1]}]}});
  assert.match(markup,/<strong role="status" aria-live="polite">チーできます<\/strong>/);
  assert.match(markup,/<div class="reaction-actions" aria-label="捨て牌への応答">[\s\S]*data-legal="1"/);
  assert.doesNotMatch(markup,/<div class="actions" aria-label="対局の操作">/);
});
