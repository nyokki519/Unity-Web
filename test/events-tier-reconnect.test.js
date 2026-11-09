import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GameEngine} from '../src/engine.js';
import {RoomStore} from '../src/store.js';

test('Tier answer keeps its shape, stays private, and survives room-store reconnect',()=>{
 const dir=mkdtempSync(join(tmpdir(),'unity-tier-reconnect-'));
 const path=join(dir,'rooms.sqlite');let now=Date.now(),store=new RoomStore(path);
 try{
  const engine=new GameEngine(store,{now:()=>now}),host=engine.create('司会',{eventGame:'TIER'}),guest=engine.join(host.code,'参加者');
  for(const session of [host,guest]){
   engine.connect(host.code,session.playerId);
   engine.command(host.code,session.playerId,{action:'ready',ready:true});
  }
  engine.command(host.code,host.playerId,{action:'start'});
  let room=engine.get(host.code);
  engine.command(host.code,host.playerId,{action:'event_begin',roundId:room.event.roundId,revision:room.event.revision});
  room=engine.get(host.code);const items=room.event.question.items;
  const payload={tiers:{S:items.map(item=>item.id),A:[],B:[],C:[],D:[]}};
  const observed=[];engine.onChange=changed=>observed.push({owner:engine.view(changed,host.playerId).event.ownAnswer,other:engine.view(changed,guest.playerId).event.ownAnswer});
  engine.command(host.code,host.playerId,{action:'event_answer',roundId:room.event.roundId,revision:room.event.revision,value:payload});
  assert.deepEqual(observed.at(-1),{owner:{value:payload},other:null});
  assert.deepEqual(engine.view(room,host.playerId).event.ownAnswer,{value:payload});
  store.close();store=new RoomStore(path);
  const restored=new GameEngine(store,{now:()=>now}),restoredRoom=restored.authenticate(host.code,host.token).room;
  assert.deepEqual(restored.view(restoredRoom,host.playerId).event.ownAnswer,{value:payload});
  assert.equal(restored.view(restoredRoom,guest.playerId).event.ownAnswer,null);
  assert.equal(restoredRoom.event.phase,'ANSWER');
 }finally{
  store.close();rmSync(dir,{recursive:true,force:true});
 }
});
