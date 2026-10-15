import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/engine.js';
import {RoomStore} from '../src/store.js';
function setup(settings={mode:'MIX',rounds:6}){
 let now=Date.now();const store=new RoomStore(':memory:'),engine=new GameEngine(store,{now:()=>now,countdownMs:0,hostGraceMs:100});const host=engine.create('テスト司会',settings);engine.connect(host.code,host.playerId);engine.command(host.code,host.playerId,{action:'ready',ready:true});const room=engine.get(host.code);
 const cmd=(action,data={},id=host.playerId)=>engine.command(host.code,id,{action,roundId:room.event?.roundId??room.round?.id,revision:room.event?.revision,...data});
 const advance=()=>{engine.tick();now+=5000;engine.tick();};return{store,engine,host,room,cmd,advance};
}
const bots=f=>Object.values(f.room.players).filter(p=>p.cpu&&!p.left);
test('only host adds/removes clearly marked CPU players in lobby; targets are idempotent and capacity is enforced',()=>{
 const f=setup();try{
  const guest=f.engine.join(f.host.code,'CPUみたいな名前');f.engine.connect(guest.code,guest.playerId);
  assert.throws(()=>f.cmd('cpu_add',{count:1},guest.playerId),e=>e.code==='HOST_ONLY');
  f.cmd('cpu_add',{total:6});assert.equal(bots(f).length,4);f.cmd('cpu_add',{total:6});assert.equal(bots(f).length,4);
  assert.ok(bots(f).every(p=>p.ready&&p.connected));assert.equal(f.engine.view(f.room,guest.playerId).players.filter(p=>p.cpu).length,4);
  for(const count of [0,-1,1.5,25,'5'])assert.throws(()=>f.cmd('cpu_add',{count}),e=>e.code==='BAD_SETTINGS');
  f.cmd('cpu_add',{total:15});assert.equal(bots(f).length,13);f.cmd('cpu_add',{count:9});assert.equal(bots(f).length,22);
  assert.throws(()=>f.cmd('cpu_add',{count:1}),e=>e.code==='ROOM_FULL');f.cmd('cpu_clear');assert.equal(bots(f).length,0);assert.ok(!f.room.players[guest.playerId].left);
 }finally{f.store.close();}
});
test('one human can finish all legacy modes with CPU answers; answer privacy, pause and next round remain intact',()=>{
 const f=setup();try{
  f.cmd('cpu_add',{count:1});f.cmd('start');assert.throws(()=>f.cmd('cpu_clear'),e=>e.code==='NOT_LOBBY');
  for(const mode of ['ALIGN','PREDICT','LINE','RANK','AUCTION','QUICK']){
   assert.equal(f.room.round.question.mode,mode);f.cmd('pause');f.advance();assert.equal(Object.keys(f.room.round.answers).length,0);f.cmd('pause');f.advance();
   assert.equal(Object.keys(f.room.round.answers).length,1,mode);const view=f.engine.view(f.room,f.host.playerId);assert.equal(view.round.ownAnswer,null);assert.equal(view.round.result,null);assert.equal(view.round.answers,undefined);
   f.cmd('answer',{skip:true});f.engine.tick();assert.equal(f.room.phase,'TALK');assert.equal(f.room.round.result.total??f.room.round.result.answers?.length,1);f.cmd('next');
  }
  assert.equal(f.room.phase,'FINAL');f.cmd('again');f.advance();assert.ok(bots(f).every(p=>p.ready));assert.equal(f.room.players[f.host.playerId].ready,false);
 }finally{f.store.close();}
});
for(const people of [2,6,15])for(const game of ['VALUES','WHO','BOUNDARY','QUEST','CAFE','STORY'])test(`${game}: one human and ${people-1} CPU participants reach reveal, next round and end with legal answers/votes`,()=>{
 const f=setup({eventGame:game,eventOptions:{roundLimit:2,itemLimit:2}});try{
  f.cmd('cpu_add',{total:people});f.cmd('start');
  for(let round=0;round<2;round++){
   f.cmd('event_begin');f.advance();const e=f.room.event;const grouped=['QUEST','CAFE'].includes(game);
   if(grouped){const own=e.teams.find(t=>t.memberIds.includes(f.host.playerId));assert.equal(own.captainId,f.host.playerId);assert.equal(e.answers[own.id],undefined);assert.ok(e.teams.filter(t=>t.id!==own.id).every(t=>e.answers[t.id]));}
   else{assert.equal(Object.keys(e.answers).length,people-1);assert.equal(f.engine.view(f.room,f.host.playerId).event.ownAnswer,null);}
   assert.equal(f.engine.view(f.room,f.host.playerId).event.result,null);f.cmd('event_answer',{skip:true});f.cmd('event_close');f.cmd('event_reveal');
   if(['WHO','STORY'].includes(game))while(e.phase==='GUESS'){
    f.advance();const item=e.items[e.itemIndex];assert.equal(e.votes[item.ownerId],undefined);assert.equal(Object.keys(e.votes).length,people-2);assert.ok(Object.entries(e.votes).every(([id,v])=>v.value!==id));
    f.cmd('event_close');f.cmd('event_solution');f.cmd('event_next_item');
   }
   assert.equal(e.phase,'TALK');if(game==='CAFE')assert.ok(e.result.teams.filter(t=>t.cost).every(t=>!t.cost.overBudget));f.cmd('event_next');
  }
  assert.equal(f.room.phase,'FINAL');
 }finally{f.store.close();}
});
test('CPU never takes host, does not act without a connected human, and survives database restoration',()=>{
 const f=setup({mode:'ALIGN',rounds:2});try{
  f.cmd('cpu_add',{count:1});f.cmd('start');f.engine.disconnect(f.host.code,f.host.playerId);f.advance();assert.equal(f.room.hostId,f.host.playerId);assert.equal(Object.keys(f.room.round.answers).length,0);
  const restored=new GameEngine(f.store,{now:()=>Date.now()+10000});const room=restored.get(f.host.code);assert.ok(Object.values(room.players).filter(p=>p.cpu).every(p=>p.connected));assert.equal(room.players[f.host.playerId].connected,false);
  restored.connect(f.host.code,f.host.playerId);restored.tick();const resume=new GameEngine(f.store,{now:()=>Date.now()+20000});resume.connect(f.host.code,f.host.playerId);resume.tick();assert.equal(Object.keys(resume.get(f.host.code).round.answers).length,1);
 }finally{f.store.close();}
});
test('CPU credentials cannot authenticate, humans take captain priority, and human-containing teams are not auto-submitted',()=>{
 const f=setup({eventGame:'CAFE'});try{
  f.cmd('cpu_add',{total:6});const bot=bots(f)[0];bot.tokenHash=createHash('sha256').update('a'.repeat(64)).digest('hex');assert.throws(()=>f.engine.authenticate(f.host.code,'a'.repeat(64)),e=>e.code==='BAD_SESSION');assert.throws(()=>f.engine.connect(f.host.code,bot.id),e=>e.code==='BAD_SESSION');
  const guest=f.engine.join(f.host.code,'後から参加');f.engine.connect(guest.code,guest.playerId);f.cmd('ready',{ready:true},guest.playerId);f.cmd('start');
  const members=Object.values(f.room.players).filter(p=>!p.left);const assignments=Object.fromEntries(members.map(p=>[p.id,p.id===f.host.playerId?0:1]));
  f.cmd('event_teams',{count:2,assignments});f.cmd('event_begin');const t=f.room.event.teams.find(t=>t.memberIds.includes(guest.playerId));assert.equal(t.captainId,guest.playerId);f.engine.disconnect(guest.code,guest.playerId);f.advance();assert.equal(f.room.event.answers[t.id],undefined);f.engine.connect(guest.code,guest.playerId);f.advance();assert.equal(t.captainId,guest.playerId);
 }finally{f.store.close();}
});
test('editable tiny numeric scales do not crash the CPU scheduler',()=>{
 const f=setup({eventGame:'BOUNDARY'});try{
  f.cmd('cpu_add',{count:1});f.cmd('start');const q={...f.room.event.questions.find(q=>q.game==='BOUNDARY'),id:'tiny',scale:{min:1e-12,max:1e-11,step:1e-12,unit:'km'}};
  f.cmd('event_question',{question:q});f.cmd('event_begin',{questionId:q.id});assert.doesNotThrow(()=>f.advance());assert.ok(f.room.event.answers[bots(f)[0].id]);
 }finally{f.store.close();}
});
test('target size can shrink from fifteen to six by removing only CPU players',()=>{
 const f=setup();try{
  f.cmd('cpu_add',{total:15});f.cmd('cpu_add',{total:6});assert.equal(bots(f).length,5);assert.equal(Object.values(f.room.players).filter(p=>!p.left).length,6);
  const humans=[];for(let i=0;i<6;i++)humans.push(f.engine.join(f.host.code,`人${i}`));
  assert.throws(()=>f.cmd('cpu_add',{total:6}),e=>e.code==='BAD_SETTINGS');assert.ok(humans.every(s=>!f.room.players[s.playerId].left));
 }finally{f.store.close();}
});
