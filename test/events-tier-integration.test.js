import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './events-helper.js';

const ballot=(items,tierOffset=0)=>{const tiers={S:[],A:[],B:[],C:[],D:[]};items.forEach((item,i)=>tiers[['S','A','B','C','D'][(i+tierOffset)%5]].push(item.id));return{tiers};};

test('Tier event privately collects complete boards then reveals comparison only after host publish',()=>{
 const f=fixture(3,'TIER');try{
  f.cmd('event_begin');const question=f.room.event.question;assert.equal(question.game,'TIER');assert.ok(question.items.length>=5);
  f.cmd('event_answer',{value:ballot(question.items)},f.sessions[0]);
  assert.equal(f.engine.view(f.room,f.sessions[1].playerId).event.ownAnswer,null);
  f.cmd('event_answer',{value:ballot(question.items)},f.sessions[1]);f.cmd('event_answer',{value:ballot(question.items)},f.sessions[2]);
  assert.equal(f.room.event.phase,'CLOSED','all submitted boards should open host review without a redundant close tap');assert.equal(f.engine.view(f.room,f.sessions[1].playerId).event.result,null);
  f.cmd('event_reveal');const result=f.engine.view(f.room,f.sessions[1].playerId).event.result;
  assert.equal(result.participantCount,3);assert.equal(result.boards.length,3);assert.ok(result.items.every(item=>item.majorityTier==='S'||item.majorityTier==='A'||item.majorityTier==='B'||item.majorityTier==='C'||item.majorityTier==='D'));
 }finally{f.store.close();}
});

test('Tier event rejects incomplete boards and permits a skipped player without leaking other boards',()=>{
 const f=fixture(2,'TIER');try{
  f.cmd('event_begin');const q=f.room.event.question,tiers={S:[q.items[0].id],A:[],B:[],C:[],D:[]};
  assert.throws(()=>f.cmd('event_answer',{value:{tiers}}),e=>e.code==='INVALID_ANSWER');
  f.cmd('event_answer',{skip:true},f.sessions[0]);f.cmd('event_answer',{value:ballot(q.items)},f.sessions[1]);
  assert.equal(f.engine.view(f.room,f.sessions[0].playerId).event.ownAnswer.skip,true);assert.equal(f.engine.view(f.room,f.sessions[0].playerId).event.answeredCount,2);
  assert.equal(f.room.event.phase,'CLOSED','a skip counts as a submitted ballot but is excluded from the comparison');f.cmd('event_reveal');const result=f.room.event.result;assert.equal(result.boards.length,1);assert.equal(result.participantCount,1);
 }finally{f.store.close();}
});

test('Tier meeting enforces the ten-person maximum when the room starts',()=>{
 const f=fixture(10,'TIER');try{f.cmd('event_begin');assert.equal(f.room.event.participants.length,10);}finally{f.store.close();}
});
