import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './events-helper.js';
for(const n of [6,15])for(const game of ['QUEST','CAFE'])test(`${game} ${n} people: teams, private draft, captain, budgets, approval`,()=>{
 const f=fixture(n,game);try{
 f.cmd('event_teams',{count:3});assert.equal(f.room.event.teams.length,3);f.cmd('event_begin');assert.equal(f.room.event.phase,'CONSULT');
 const t=f.room.event.teams[0],captain=f.sessions.find(s=>s.playerId===t.captainId),other=f.sessions.find(s=>s.playerId!==t.captainId&&t.memberIds.includes(s.playerId));
 const value=game==='QUEST'?'全員朝にコーヒーを飲む':{name:'木漏れ日',concept:'静かに読書できる',selection:{location:'park',menu:'coffee',interior:'simple'}};
 if(game==='CAFE'){
 f.cmd('event_cafe_draft',{value},captain);assert.equal(f.engine.view(f.room,other.playerId).event.team.draft.name,'木漏れ日');assert.equal(f.engine.view(f.room,f.sessions.find(s=>!t.memberIds.includes(s.playerId)).playerId).event.team.draft,null);
 assert.throws(()=>f.cmd('event_answer',{value:{...value,selection:{location:'station',menu:'food',interior:'garden'}}},captain),e=>e.code==='BUDGET_EXCEEDED');
 }
 assert.throws(()=>f.cmd('event_answer',{value},other),e=>e.code==='CAPTAIN_ONLY');f.cmd('event_answer',{value},captain);f.cmd('event_close');f.cmd('event_reveal');assert.equal(f.room.event.result.teams[0].answer.skip,undefined);
 if(game==='QUEST'){f.cmd('event_approve',{teamId:t.id});assert.equal(f.engine.view(f.room,other.playerId).event.result.teams[0].approved,true);}
 f.cmd('event_next');f.cmd('event_kick',{playerId:other.playerId});assert.throws(()=>f.engine.authenticate(f.host.code,other.token),e=>e.code==='BAD_SESSION');
 }finally{f.store.close();}
});
