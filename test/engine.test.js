import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GameEngine,GameError,settingsFrom} from '../src/engine.js';
import {RoomStore} from '../src/store.js';
import {validateQuestions,questions} from '../src/questions.js';
import {modes} from '../src/modes/index.js';
function answerFor(q,variant=0){switch(q.mode){case'ALIGN':case'PREDICT':return variant?'b':'a';case'LINE':return variant?90:10;case'RANK':return q.choices.map(c=>c.id)[variant?'reverse':'slice']();case'AUCTION':return Object.fromEntries(q.choices.map((c,i)=>[c.id,i===variant?100:0]));case'QUICK':return '話したいこと';}}
function setup(mode='ALIGN',autoReveal=true){let now=Date.now();const store=new RoomStore(':memory:'),engine=new GameEngine(store,{now:()=>now,countdownMs:3000,hostGraceMs:12000});const host=engine.create('ホスト',{mode,depth:'LIGHT',rounds:3,autoReveal});const guest=engine.join(host.code,'ゲスト');for(const s of[host,guest]){engine.connect(s.code,s.playerId);engine.command(s.code,s.playerId,{action:'ready',ready:true});}engine.command(host.code,host.playerId,{action:'start'});return{store,engine,host,guest,room:engine.get(host.code),advance:ms=>{now+=ms;engine.tick();}};}
test('full question catalog, complete mode/depth pools and safe schemas',()=>{assert.ok(validateQuestions()>=192);for(const mode of Object.keys(modes))for(const depth of['LIGHT','BALANCED','DEEP'])assert.ok(questions.some(q=>q.mode===mode&&q.depth===depth));});
for(const mode of Object.keys(modes))test(`${mode}: three real rounds, private answers, reveal, talk, own/group summaries`,()=>{
 const{store,engine,host,guest,room,advance}=setup(mode);const ids=new Set();
 for(let i=0;i<3;i++){
  const q=room.round.question;assert.equal(q.mode,mode);assert.ok(!ids.has(q.id));ids.add(q.id);
  const roundId=room.round.id;
  assert.throws(()=>engine.command(host.code,guest.playerId,{action:'reveal'}),e=>e.code==='HOST_ONLY');
  assert.throws(()=>engine.command(host.code,host.playerId,{action:'reveal'}),e=>e.code==='WAIT_ANSWERS');
  engine.command(host.code,guest.playerId,{action:'answer',roundId,value:answerFor(q,1)});
  const hostView=engine.view(room,host.playerId);assert.equal(hostView.round.result,null);assert.equal(hostView.round.ownAnswer,null);assert.equal(hostView.round.answeredCount,1);assert.equal(hostView.round.answers,undefined);assert.equal(hostView.round.question.valueTags,undefined);
  assert.throws(()=>engine.command(host.code,guest.playerId,{action:'answer',roundId,value:answerFor(q)}),e=>e.code==='ALREADY_ANSWERED');
  assert.throws(()=>engine.command(host.code,host.playerId,{action:'answer',roundId:'stale',value:answerFor(q)}),e=>e.code==='STALE_ROUND');
  engine.command(host.code,host.playerId,{action:'answer',roundId,value:answerFor(q)});
  assert.equal(room.phase,'COUNTDOWN');assert.equal(engine.view(room,guest.playerId).round.result,null);
  advance(3000);assert.equal(room.phase,'TALK');assert.ok(room.round.result);assert.ok(q.talkPrompt);
  if(mode==='LINE'){assert.deepEqual(room.round.result.positions,[10,90]);assert.equal(room.round.result.average,50);assert.ok(!JSON.stringify(room.round.result).includes(guest.playerId));}
  if(mode==='ALIGN')assert.deepEqual(room.round.result.counts,[1,1]);
  if(mode==='AUCTION')assert.equal(room.round.result.allocation.reduce((s,r)=>s+r.average,0),100);
  engine.command(host.code,host.playerId,{action:'next'});
 }
 assert.equal(room.phase,'FINAL');const own=engine.view(room,host.playerId).summary;assert.equal(own.questions,3);assert.equal(own.people,2);assert.ok(own.note.includes('性格診断'));assert.equal(own.otherPlayers,undefined);
 engine.command(host.code,host.playerId,{action:'again'});assert.equal(room.phase,'LOBBY');assert.ok(Object.values(room.players).every(p=>!p.ready));store.close();
});
test('strict answer validation, no invalid transitions or partial state changes',()=>{
 const{store,engine,host,guest,room}=setup('AUCTION');const before=JSON.stringify(room);
 assert.throws(()=>engine.command(host.code,host.playerId,{action:'answer',roundId:room.round.id,value:{money:101}}),e=>e.code==='INVALID_ANSWER');assert.equal(JSON.stringify(room),before);
 const q=room.round.question;assert.throws(()=>modes.RANK.validate({choices:[{id:'a'},{id:'b'}]},['a','a']));assert.throws(()=>modes.LINE.validate(q,'50'));assert.throws(()=>modes.LINE.validate(q,-1));assert.throws(()=>modes.QUICK.validate(q,'x'.repeat(201)));
 engine.disconnect(host.code,guest.playerId);const index=room.index;assert.throws(()=>engine.command(host.code,host.playerId,{action:'skip'}),e=>e.code==='NEED_PLAYERS');assert.equal(room.index,index);store.close();
});
test('manual reveal, pause countdown, passes, late join, and offline exclusion',()=>{
 const{store,engine,host,guest,room,advance}=setup('ALIGN',false);const late=engine.join(host.code,'新しい人');engine.connect(host.code,late.playerId);engine.command(host.code,late.playerId,{action:'ready',ready:true});assert.equal(engine.view(room,late.playerId).round.participating,false);assert.throws(()=>engine.command(host.code,late.playerId,{action:'answer',roundId:room.round.id,value:'a'}),e=>e.code==='SPECTATING');
 engine.command(host.code,host.playerId,{action:'answer',roundId:room.round.id,value:'a'});engine.disconnect(host.code,guest.playerId);engine.command(host.code,host.playerId,{action:'exclude_offline'});assert.equal(room.phase,'ANSWER');engine.command(host.code,host.playerId,{action:'reveal'});engine.command(host.code,host.playerId,{action:'pause'});advance(5000);assert.equal(room.phase,'COUNTDOWN');engine.command(host.code,host.playerId,{action:'pause'});advance(3000);assert.equal(room.phase,'TALK');assert.equal(room.round.result.total,1);engine.command(host.code,host.playerId,{action:'next'});assert.ok(room.round.participants.includes(late.playerId));store.close();
});
test('host failover, duplicate names, immutable submitted answers, expiration',()=>{
 const{store,engine,host,guest,room,advance}=setup();const same=engine.join(host.code,'ゲスト');assert.equal(room.players[same.playerId].name,'ゲスト · 2');engine.disconnect(host.code,host.playerId);advance(12000);assert.equal(room.hostId,guest.playerId);engine.connect(host.code,host.playerId);assert.equal(room.hostId,guest.playerId);assert.throws(()=>engine.command(host.code,host.playerId,{action:'end'}),e=>e.code==='HOST_ONLY');engine.command(host.code,guest.playerId,{action:'end'});advance(3600001);assert.throws(()=>engine.get(host.code),e=>e.code==='ROOM_NOT_FOUND');assert.equal(store.load().length,0);store.close();
});
test('SQLite restoration preserves identity and answers but never stores raw tokens',()=>{
 const dir=mkdtempSync(join(tmpdir(),'unity-db-')),path=join(dir,'rooms.sqlite');const store=new RoomStore(path),engine=new GameEngine(store);const a=engine.create('A',{mode:'ALIGN',rounds:3}),b=engine.join(a.code,'B');for(const p of[a,b]){engine.connect(a.code,p.playerId);engine.command(a.code,p.playerId,{action:'ready',ready:true});}engine.command(a.code,a.playerId,{action:'start'});engine.command(a.code,a.playerId,{action:'answer',roundId:engine.get(a.code).round.id,value:'b'});store.close();const s2=new RoomStore(path),e2=new GameEngine(s2);const{room,player}=e2.authenticate(a.code,a.token);assert.equal(player.id,a.playerId);assert.equal(e2.view(room,a.playerId).round.ownAnswer.value,'b');assert.equal(player.connected,false);assert.equal(e2.view(room,b.playerId).round.ownAnswer,null);assert.ok(!JSON.stringify(s2.load()).includes(a.token));s2.close();rmSync(dir,{recursive:true});
});
test('settings and room access reject invalid input',()=>{assert.throws(()=>settingsFrom({mode:'missing'}));assert.throws(()=>settingsFrom({category:'MORAL',mode:'LINE',depth:'LIGHT'}),e=>e.code==='EMPTY_POOL');const store=new RoomStore(':memory:'),engine=new GameEngine(store);assert.throws(()=>engine.create('',{}),e=>e.code==='BAD_NAME');assert.equal(engine.rooms.size,0);assert.throws(()=>engine.get('0000'),e=>e.code==='ROOM_NOT_FOUND');store.close();});
