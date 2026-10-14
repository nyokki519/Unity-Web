import test from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './events-helper.js';import {eventQuestions,games} from '../src/events/catalog.js';
test('each game has 15 ready prompts and quest has five per difficulty',()=>{
 for(const game of Object.keys(games))assert.ok(eventQuestions.filter(q=>q.game===game).length>=15);
 for(const d of ['気軽','ひと工夫','じっくり'])assert.ok(eventQuestions.filter(q=>q.game==='QUEST'&&q.difficulty===d).length>=5);
});
test('host question edits stay in their room and live questions are immutable',()=>{
 const f=fixture(6,'VALUES');try{
 const q=f.room.event.questions.find(q=>q.game==='VALUES');
 f.cmd('event_question',{question:{...q,prompt:'編集済みのお題'}});assert.equal(f.room.event.questions.find(v=>v.id===q.id).prompt,'編集済みのお題');assert.notEqual(eventQuestions.find(v=>v.id===q.id).prompt,'編集済みのお題');
 f.cmd('event_begin',{questionId:q.id});assert.equal(f.room.event.question.prompt,'編集済みのお題');
 assert.throws(()=>f.cmd('event_question',{question:q}),e=>e.code==='BAD_PHASE');
 const ids=q.choices.map(c=>c.id);assert.throws(()=>f.cmd('event_answer',{value:[ids[0],ids[0],ids[0],ids[0]]}),e=>e.code==='INVALID_ANSWER');
 f.cmd('event_answer',{value:ids});f.cmd('event_answer',{value:[...ids].reverse()},f.sessions[1]);f.cmd('event_close');f.cmd('event_reveal');
 const result=f.engine.view(f.room,f.sessions[2].playerId).event.result;assert.equal(result.ranking[0].distribution.length,4);assert.ok(!JSON.stringify(result).includes(f.host.playerId));
 }finally{f.store.close();}
});
