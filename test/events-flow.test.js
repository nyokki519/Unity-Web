import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/engine.js';
import {RoomStore} from '../src/store.js';
export function fixture(n=6,game='BOUNDARY'){
 let now=Date.now();const store=new RoomStore(':memory:'),engine=new GameEngine(store,{now:()=>now});
 const host=engine.create('司会',{eventGame:game,eventOptions:{roundLimit:2}}),sessions=[host];
 for(let i=1;i<n;i++)sessions.push(engine.join(host.code,`参加者${i}`));
 for(const s of sessions){engine.connect(s.code,s.playerId);engine.command(s.code,s.playerId,{action:'ready',ready:true});}
 const room=engine.get(host.code);
 const cmd=(action,data={},who=host)=>engine.command(host.code,who.playerId,{action,roundId:room.event?.roundId,revision:room.event?.revision,...data});
 cmd('start');return{store,engine,host,sessions,room,cmd,advance:ms=>{now+=ms;engine.tick();}};
}
test('event rules, private collection, deadline, reveal, next and end',()=>{
 const f=fixture();try{
 assert.equal(f.room.event.phase,'RULES');f.cmd('event_begin');
 f.cmd('event_answer',{value:25},f.sessions[1]);f.cmd('event_answer',{skip:true},f.sessions[2]);
 const v=f.engine.view(f.room,f.host.playerId).event;assert.equal(v.ownAnswer,null);assert.equal(v.result,null);assert.equal(v.answeredCount,2);assert.equal(v.answers,undefined);
 assert.throws(()=>f.cmd('event_answer',{value:50},f.sessions[1]),e=>e.code==='ALREADY_ANSWERED');
 f.advance(90000);assert.equal(f.room.event.phase,'CLOSED');f.cmd('event_reveal');assert.equal(f.room.event.phase,'TALK');
 assert.deepEqual(f.engine.view(f.room,f.host.playerId).event.result.positions,[25]);
 f.cmd('event_next');assert.equal(f.room.event.phase,'RULES');f.cmd('event_begin');f.cmd('event_close');f.cmd('event_reveal');f.cmd('event_next');assert.equal(f.room.phase,'FINAL');
 }finally{f.store.close();}
});
test('event host controls and stale operations are rejected without mutations',()=>{
 const f=fixture();try{
 assert.throws(()=>f.cmd('event_begin',{},f.sessions[1]),e=>e.code==='HOST_ONLY');
 const old=f.room.event.revision;f.cmd('event_begin');
 assert.throws(()=>f.cmd('event_close',{revision:old}),e=>e.code==='STALE_STATE');
 assert.throws(()=>f.cmd('event_answer',{roundId:'old',value:40}),e=>e.code==='STALE_ROUND');
 assert.throws(()=>f.cmd('event_reveal'),e=>e.code==='BAD_PHASE');
 }finally{f.store.close();}
});
