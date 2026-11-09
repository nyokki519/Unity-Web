import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTierQuestion,validateTierAnswer,tierResult,TIER_ORDER} from '../src/events/tier.js';

const question={id:'theme-1',game:'TIER',prompt:'カッコよくなるコスパTier',talkPrompt:'意外だった項目は？',items:[{id:'shoes',label:'靴'},{id:'brows',label:'眉毛'},{id:'glasses',label:'メガネ'}]};
const answer=(tiers)=>({tiers});

test('Tier rank order is stable and themes require 2-10 distinct readable items',()=>{
  assert.deepEqual(TIER_ORDER,['S','A','B','C','D']);
  assert.deepEqual(validateTierQuestion(question).items.map(x=>x.id),['shoes','brows','glasses']);
  assert.throws(()=>validateTierQuestion({...question,items:[{id:'x',label:'x'}]}));
  assert.throws(()=>validateTierQuestion({...question,items:[...question.items,{id:'shoes',label:'duplicate'}]}));
  assert.throws(()=>validateTierQuestion({...question,items:[{id:'__proto__',label:'a'},{id:'constructor',label:'b'}]}));
  assert.throws(()=>validateTierQuestion({...question,items:Array.from({length:16},(_,i)=>({id:`i${i}`,label:`項目${i}`}))}));
});

test('answer requires each known item exactly once in one of five tiers',()=>{
  const q=validateTierQuestion(question);
  const valid=answer({S:['shoes'],A:['brows'],B:[],C:['glasses'],D:[]});
  assert.deepEqual(validateTierAnswer(q,valid),valid);
  assert.throws(()=>validateTierAnswer(q,answer({S:['shoes','shoes'],A:['brows'],B:[],C:['glasses'],D:[]})));
  assert.throws(()=>validateTierAnswer(q,answer({S:['shoes','unknown'],A:['brows'],B:[],C:[],D:[]})));
  assert.throws(()=>validateTierAnswer(q,answer({S:['shoes'],A:['brows'],B:[],C:[],D:[]})));
  assert.throws(()=>validateTierAnswer(q,answer({S:['shoes'],A:['brows'],B:[],C:['glasses'],D:[],X:['x']})));
});

test('result compares each item, resolves majority/minority and reports tied tiers without false majority',()=>{
  const q=validateTierQuestion(question);
  const result=tierResult(q,{
    p1:answer({S:['shoes'],A:['brows'],B:[],C:['glasses'],D:[]}),
    p2:answer({S:['shoes'],A:[],B:['brows'],C:['glasses'],D:[]}),
    p3:answer({S:[],A:['shoes'],B:[],C:['glasses'],D:['brows']}),
    p4:answer({S:[],A:['shoes'],B:['brows'],C:['glasses'],D:[]})
  });
  assert.equal(result.participantCount,4);
  assert.deepEqual(result.items.find(x=>x.id==='glasses').majorityTiers,['C']);
  assert.equal(result.items.find(x=>x.id==='glasses').agreementPct,100);
  assert.deepEqual(result.items.find(x=>x.id==='shoes').majorityTiers,['S','A']);
  assert.equal(result.items.find(x=>x.id==='shoes').majorityTier,null);
  assert.deepEqual(result.items.find(x=>x.id==='shoes').minorityTiers,[]);
  assert.ok(result.agreementPct>0&&result.agreementPct<100);
});

test('aggregation rejects fewer than two or more than ten participants and malformed answers',()=>{
  const q=validateTierQuestion(question),a=answer({S:['shoes'],A:['brows'],B:[],C:['glasses'],D:[]});
  assert.throws(()=>tierResult(q,{p1:a}));
  assert.throws(()=>tierResult(q,Object.fromEntries(Array.from({length:11},(_,i)=>[`p${i}`,a]))));
  assert.throws(()=>tierResult(q,{p1:a,p2:{tiers:{S:['not-an-item']}}}));
});
