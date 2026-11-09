import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTierBoards,validateTierBoard} from '../public/js/events/tier.js';
import {readFile} from 'node:fs/promises';

const items=[{id:'a',label:'眉毛'},{id:'b',label:'靴'}];
const screen=await readFile(new URL('../public/js/events/screen.js',import.meta.url),'utf8');
test('board validation requires each item exactly once in a known tier',()=>{
 assert.equal(validateTierBoard(items,{a:'S',b:'D'}),true);
 assert.equal(validateTierBoard(items,{S:['a'],A:[],B:[],C:[],D:['b']}),true);
 assert.throws(()=>validateTierBoard(items,{S:['a','b'],A:[],B:[],C:[],D:['b']}),/duplicate/i);
 assert.throws(()=>validateTierBoard(items,{a:'S'}),/missing/i);
 assert.throws(()=>validateTierBoard(items,{a:'S',b:'S',extra:'A'}),/unknown|extra/i);
 assert.throws(()=>validateTierBoard(items,{a:'Z',b:'D'}),/tier/i);
});
test('summary reports a majority only when unique and measures pairwise agreement',()=>{
 const result=summarizeTierBoards(items,[
  {tiers:{a:'S',b:'B'}},{tiers:{a:'S',b:'A'}},{tiers:{a:'A',b:'D'}}
 ]);
 assert.equal(result.items.a.majority,'S');assert.equal(result.items.a.distribution.S,2);
 assert.equal(result.items.b.majority,null);assert.equal(result.items.b.distribution.D,1);
 assert.equal(result.agreement,17);
});
test('summary handles empty and single-player data without division errors',()=>{
 assert.deepEqual(summarizeTierBoards([],[]),{participantCount:0,agreement:0,items:{}});
 const result=summarizeTierBoards(items,[{tiers:{a:'C',b:'D'}}]);
 assert.equal(result.agreement,100);assert.equal(result.items.a.minorityCount,1);
});
test('server row-array tier answers are accepted and aggregated in the same public format',()=>{
 const answer={S:['a'],A:[],B:[],C:[],D:['b']};
 assert.equal(validateTierBoard(items,answer),true);
 const summary=summarizeTierBoards(items,[{playerId:'1',tiers:answer},{playerId:'2',tiers:{S:['a'],A:['b'],B:[],C:[],D:[]}}]);
 assert.equal(summary.items.a.majority,'S');assert.equal(summary.items.b.majority,null);
});

test('both interactive and already-submitted Tier screens mount the returned DOM element, not its controller object',()=>{
 assert.match(screen,/const board=createTierBoard\(\{items:e\.question\.items,onSubmit:value=>send\('event_answer',\{value\}\)\}\);screen\.tierBoardController=board;screen\.append\(board\.element\)/);
 assert.match(screen,/const board=createTierBoard\(\{items:e\.question\.items,initial:value\.tiers\|\|value,disabled:true\}\);screen\.tierBoardController=board;screen\.append\(board\.element\)/);
});
