import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './events-helper.js';
import {GameEngine} from '../src/engine.js';
import {RoomStore} from '../src/store.js';

const board=(items,tier='S')=>{const tiers={S:[],A:[],B:[],C:[],D:[]};tiers[tier]=items.map(item=>item.id);return{tiers};};

test('a participant cannot submit twice and failed retry leaves the accepted ballot unchanged',()=>{
 const f=fixture(2,'TIER');try{
  f.cmd('event_begin');const q=f.room.event.question,accepted=board(q.items,'A');
  f.cmd('event_answer',{value:accepted},f.sessions[0]);const snapshot=structuredClone(f.room.event.answers[f.sessions[0].playerId]);
  assert.throws(()=>f.cmd('event_answer',{value:board(q.items,'D')},f.sessions[0]),error=>error.code==='ALREADY_ANSWERED');
  assert.deepEqual(f.room.event.answers[f.sessions[0].playerId],snapshot);
 }finally{f.store.close();}
});

test('deadline closes Tier submissions and late ballots cannot appear in final comparison',()=>{
 const f=fixture(2,'TIER');try{
  f.cmd('event_begin');const q=f.room.event.question;f.cmd('event_answer',{value:board(q.items)},f.sessions[0]);
  f.advance(600000);assert.equal(f.room.event.phase,'CLOSED');
  assert.throws(()=>f.cmd('event_answer',{value:board(q.items,'B')},f.sessions[1]),error=>error.code==='NOT_ANSWERING');
  f.cmd('event_reveal');const result=f.engine.view(f.room,f.sessions[1].playerId).event.result;
  assert.equal(result.participantCount,1);assert.equal(result.boards.length,1);assert.equal(result.agreementPct,null);
 }finally{f.store.close();}
});

test('all participants may pass without leaking boards or crashing the comparison phase',()=>{
 const f=fixture(2,'TIER');try{
  f.cmd('event_begin');f.cmd('event_answer',{skip:true},f.sessions[0]);f.cmd('event_answer',{skip:true},f.sessions[1]);
  assert.equal(f.room.event.phase,'CLOSED','all passes should close the ballot window while keeping the result private');assert.equal(f.engine.view(f.room,f.sessions[0].playerId).event.result,null);
  f.cmd('event_reveal');const view=f.engine.view(f.room,f.sessions[0].playerId).event;
  assert.equal(view.result.participantCount,0);assert.equal(view.result.boards.length,0);assert.equal(view.result.agreementPct,null);
 }finally{f.store.close();}
});

test('eleven online players cannot start a Tier room',()=>{
 let now=1000;const store=new RoomStore(':memory:'),engine=new GameEngine(store,{now:()=>now});
 try{
  const sessions=[engine.create('Host',{eventGame:'TIER'})];for(let i=1;i<11;i++)sessions.push(engine.join(sessions[0].code,`Player ${i}`));
  for(const session of sessions){engine.connect(session.code,session.playerId);engine.command(session.code,session.playerId,{action:'ready',ready:true});}
  assert.throws(()=>engine.command(sessions[0].code,sessions[0].playerId,{action:'start'}),error=>error.code==='ROOM_FULL');
 }finally{store.close();}
});
