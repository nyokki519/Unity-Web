import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './events-helper.js';
import {validateEventQuestion,optionsFor} from '../src/events/catalog.js';
import {eventQuestions} from '../src/events/catalog.js';

test('RATING question schema and room options validate original A/B assets and bounded rounds',()=>{
 const q=eventQuestions.find(row=>row.game==='RATING');assert.ok(q);
 assert.equal(validateEventQuestion(q).correct,q.correct);assert.equal(optionsFor('RATING',{}).roundLimit,3);
 assert.throws(()=>optionsFor('RATING',{roundLimit:13}),/BAD_SETTINGS/);
 assert.throws(()=>optionsFor('RATING',{category:'不明'}),/BAD_SETTINGS/);
 assert.throws(()=>validateEventQuestion({...q,correct:'C'}),/BAD_SETTINGS/);
 const unsafe={...q,choices:{...q.choices,A:{...q.choices.A,asset:'https://example.test/fake.svg'}}};assert.throws(()=>validateEventQuestion(unsafe),/BAD_SETTINGS/);
});

test('RATING keeps answer key private through CLOSED and synchronized REVEAL, then scores and ranks at TALK',()=>{
 const f=fixture(3,'RATING');try{
  let view=f.engine.view(f.room,f.host.playerId).event;assert.ok(view.questions.length);assert.ok(view.questions.every(row=>row.correct===undefined&&row.explanation===undefined&&row.source===undefined),'host question picker must not disclose answer keys');
  f.cmd('event_begin');view=f.engine.view(f.room,f.host.playerId).event;const q=f.room.event.question;
  assert.equal(view.phase,'ANSWER');assert.equal(view.question.correct,undefined);assert.equal(view.question.explanation,undefined);assert.equal(view.question.source,undefined);assert.equal(view.question.provenance,undefined);if(q.source.kind==='original-created')assert.ok(view.question.practiceNotice,'original practice art must be clearly labeled before answering');
  const verified=eventQuestions.find(row=>row.game==='RATING'&&row.source.kind==='verified-comparison');if(verified){f.room.event.question=verified;const verifiedView=f.engine.view(f.room,f.host.playerId).event.question;assert.equal(verifiedView.practiceNotice,undefined);assert.equal(verifiedView.source,undefined);f.room.event.question=q;}
  const choices=['A','B','A'];for(let i=0;i<3;i++)f.cmd('event_answer',{value:{choice:choices[i]}},f.sessions[i]);
  assert.equal(f.room.event.phase,'CLOSED');view=f.engine.view(f.room,f.host.playerId).event;
  assert.deepEqual(view.distribution,{A:2,B:1});assert.deepEqual(view.waitingRooms.A,['司会','参加者2']);assert.equal(view.question.correct,undefined);
  f.cmd('event_reveal');view=f.engine.view(f.room,f.sessions[1].playerId).event;
  assert.equal(view.phase,'REVEAL');assert.equal(view.revealAt>view.serverTime,true);assert.equal(view.result,null);assert.equal(view.question.correct,undefined);
  f.advance(6499);assert.equal(f.room.event.phase,'REVEAL');f.advance(1);assert.equal(f.room.event.phase,'TALK');
  view=f.engine.view(f.room,f.sessions[1].playerId).event;assert.equal(view.question.correct,q.correct);assert.equal(view.result.correctChoice,q.correct);assert.ok(view.result.explanation);
  assert.equal(view.result.standings.length,3);const wrong=f.sessions.find((session,index)=>choices[index]!==q.correct);assert.ok(f.room.event.ratingStandings[wrong.playerId].rankIndex>=1);
 }finally{f.store.close();}
});

test('RATING rejects duplicate/invalid picks, does not penalize unanswered players, and caps rooms at ten',()=>{
 const f=fixture(2,'RATING');try{
  f.cmd('event_begin');assert.throws(()=>f.cmd('event_answer',{value:{choice:'C'}},f.sessions[0]),e=>e.code==='INVALID_ANSWER');
  f.cmd('event_answer',{value:{choice:'A'}},f.sessions[0]);assert.throws(()=>f.cmd('event_answer',{value:{choice:'B'}},f.sessions[0]),e=>e.code==='ALREADY_ANSWERED');
  f.cmd('event_close');f.cmd('event_reveal');f.advance(6500);assert.equal(f.room.event.ratingStandings[f.sessions[1].playerId].total,0);assert.equal(f.room.event.ratingStandings[f.sessions[1].playerId].rankIndex,0);
  for(let index=2;index<10;index++)f.engine.join(f.host.code,`参加者${index}`);assert.throws(()=>f.engine.join(f.host.code,'11人目'),e=>e.code==='ROOM_FULL');
 }finally{f.store.close();}
});
