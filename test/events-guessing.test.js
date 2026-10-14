import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './events-helper.js';
for(const game of ['WHO','STORY'])test(`${game}: anonymous answers, own-vote rejection, guesses, solution and hide`,()=>{
 const f=fixture(6,game);try{
 f.cmd('event_begin');for(let i=0;i<3;i++)f.cmd('event_answer',{value:game==='WHO'?`秘密${i}`:{title:`見出し${i}`,text:'体験談'.repeat(50)}},f.sessions[i]);
 assert.equal(f.engine.view(f.room,f.sessions[4].playerId).event.ownAnswer,null);f.cmd('event_close');
 let v=f.engine.view(f.room,f.host.playerId).event;assert.equal(v.moderation.length,3);assert.ok(!v.moderation.some(x=>x.ownerId));
 f.cmd('event_reveal');v=f.engine.view(f.room,f.sessions[4].playerId).event;assert.equal(v.phase,'GUESS');assert.equal(v.guess.solution,null);
 const item=f.room.event.items[f.room.event.itemIndex];const owner=f.sessions.find(s=>s.playerId===item.ownerId);
 assert.throws(()=>f.cmd('event_vote',{itemId:item.id,value:f.host.playerId},owner),e=>e.code==='SELF_VOTE');
 f.cmd('event_vote',{itemId:item.id,value:item.ownerId},f.sessions[4]);assert.equal(f.engine.view(f.room,f.sessions[5].playerId).event.guess.ownVote,null);
 f.cmd('event_close');assert.equal(f.room.event.phase,'GUESS_CLOSED');assert.equal(f.engine.view(f.room,f.sessions[4].playerId).event.guess.solution,null);f.cmd('event_solution');
 assert.equal(f.engine.view(f.room,f.sessions[4].playerId).event.guess.solution.id,item.ownerId);
 f.cmd('event_hide',{itemId:item.id});const after=JSON.stringify(f.engine.view(f.room,f.sessions[4].playerId).event);assert.ok(!after.includes(item.text));assert.equal(f.engine.view(f.room,f.sessions[4].playerId).event.guess.solution,null);
 f.cmd('event_next_item');assert.equal(f.room.event.phase,'GUESS');
 }finally{f.store.close();}
});
