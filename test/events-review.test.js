import test from 'node:test';import assert from 'node:assert/strict';import {fixture} from './events-helper.js';
for(const transition of ['switch','second-round'])test(`moderation during CLOSED after ${transition} cannot bypass reveal or sample limit`,()=>{
 const f=fixture(6,'WHO');try{f.cmd('event_config',{options:{...f.room.event.options,itemLimit:1}});if(transition==='switch')f.cmd('event_switch',{gameId:'WHO',options:{roundLimit:2,itemLimit:1}});else{f.cmd('event_begin');f.cmd('event_close');f.cmd('event_reveal');f.cmd('event_next');}
 f.cmd('event_begin');for(const [i,s]of f.sessions.entries())f.cmd('event_answer',{value:`匿名の回答${i}`},s);f.cmd('event_close');const first=f.room.event.items[0],originalText=first.text;f.cmd('event_hide',{itemId:first.id});assert.equal(f.room.event.phase,'CLOSED');assert.throws(()=>f.cmd('event_next_item'),e=>e.code==='BAD_PHASE');f.cmd('event_reveal');assert.equal(f.room.event.items.length,1);assert.equal(f.engine.view(f.room,f.host.playerId).event.guess.total,1);assert.ok(!JSON.stringify(f.engine.view(f.room,f.host.playerId).event).includes(originalText));
 }finally{f.store.close();}
});
for(const game of ['QUEST','CAFE'])test(`${game}: before reveal only the submitting captain receives submitted contents`,()=>{
 const f=fixture(6,game);try{f.cmd('event_begin');const team=f.room.event.teams[0],captain=f.sessions.find(s=>s.playerId===team.captainId),value=game==='QUEST'?'秘密の確定回答':{name:'秘密の確定案',concept:'まだ公開しない',selection:{location:'park',menu:'coffee',interior:'simple'}};f.cmd('event_answer',{value},captain);
 for(const s of f.sessions){const view=f.engine.view(f.room,s.playerId).event;if(s!==captain)assert.ok(!JSON.stringify(view).includes('秘密の確定'));else assert.deepEqual(view.ownAnswer.value,value);}
 f.cmd('event_close');f.cmd('event_reveal');assert.ok(JSON.stringify(f.engine.view(f.room,f.sessions[1].playerId).event.result).includes('秘密の確定'));
 }finally{f.store.close();}
});
test('captain failover selects a connected teammate who has not personally passed',()=>{
 const f=fixture(6,'CAFE');try{f.cmd('event_begin');const team=f.room.event.teams[0],captain=f.sessions.find(s=>s.playerId===team.captainId),passer=f.sessions.find(s=>s.playerId===team.memberIds[1]);f.cmd('event_answer',{skip:true},passer);f.engine.disconnect(f.host.code,captain.playerId);f.advance(1);assert.notEqual(team.captainId,passer.playerId);const next=f.sessions.find(s=>s.playerId===team.captainId);assert.equal(f.engine.view(f.room,next.playerId).event.ownAnswer,null);f.cmd('event_answer',{value:{name:'復旧カフェ',concept:'代表が引き継いだ',selection:{location:'park',menu:'coffee',interior:'simple'}}},next);assert.ok(f.room.event.answers[team.id]);}finally{f.store.close();}
});
test('event selection ignores an empty pool in hidden legacy selectors',()=>{
 const f=fixture();try{const host=f.engine.create('別の司会',{eventGame:'WHO',mode:'LINE',category:'MORAL',depth:'LIGHT'});assert.equal(f.engine.get(host.code).settings.eventGame,'WHO');}finally{f.store.close();}
});
