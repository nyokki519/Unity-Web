import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createApp} from '../src/server.js';
test('original lounge loop and tier cues ship with declared provenance and audio MIME',async()=>{const manifest=JSON.parse(await readFile(new URL('../public/baccarat/audio/manifest.json',import.meta.url),'utf8'));assert.equal(manifest.bpm,78);assert.equal(manifest.bars,16);assert.ok(manifest.files['lounge-jazz'].durationSeconds>45);const app=createApp({database:':memory:'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));try{const base='http://127.0.0.1:'+app.server.address().port;for(const [name,meta]of Object.entries(manifest.files)){const response=await fetch(base+'/baccarat/audio/'+name+'.mp3');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'audio/mpeg');assert.equal((await response.arrayBuffer()).byteLength,meta.bytes);}}finally{await app.close();}});

import {Audio} from '../public/baccarat/audio.js';
test('receipt audio shares payout tiers and preserves its independent result bus',()=>{
 for(const [receipt,expected,extension]of [
  [{net:-100,lines:[]},'loss',null], [{net:0,lines:[]},'tie',null],
  [{net:9999,lines:[]},'win',null], [{net:10000,lines:[]},'win','result-2'],
  [{net:1,lines:[{side:'tie',profit:1}]},'win','result-2'],
  [{net:100000,lines:[]},'win','result-3']]){
  const audio=new Audio(),events=[],samples=[];audio.ctx={state:'running'};
  audio.event=kind=>events.push(kind);audio.sample=(...args)=>samples.push(args);
  audio.roundResult(receipt);assert.deepEqual(events,[expected]);
  assert.deepEqual(samples.map(s=>s.slice(0,2)),extension?[[extension,'resultVolume']]:[]);
 }
});
test('table actions use distinct original samples and retain a bounded voice pool',()=>{
 const audio=new Audio(),samples=[];audio.ctx={state:'running',currentTime:1};
 audio.sample=(name,channel)=>{samples.push([name,channel]);return true;};
 for(const kind of ['chip','card','land','lock','third']){audio.ctx.currentTime+=1;audio.event(kind);}
 assert.deepEqual(samples,[['chip','se'],['card','se'],['land','se'],['lock','se'],['third','se']]);
 audio.active=20;audio.samples.set('chip',{});delete audio.sample;
 assert.equal(audio.sample('chip'),false);
});
test('tactile cues and result extensions stay short with procedural provenance',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/baccarat/audio/manifest.json',import.meta.url),'utf8'));
 assert.match(manifest.sources,/no external samples/);
 for(const [name,max]of Object.entries({chip:.12,card:.2,land:.2,lock:.7,third:.8,'result-2':2.4,'result-3':2.4})){
  assert.ok(manifest.files[name].durationSeconds<=max,name);
  assert.ok(manifest.files[name].bytes>500,name);
 }
});
test('a third-card cue is not suppressed by a simultaneous paper cue',()=>{
 const a=new Audio(),heard=[];a.ctx={state:'running',currentTime:1};a.sample=(name)=>{heard.push(name);return true;};
 a.event('card');a.event('third');a.event('third');assert.deepEqual(heard,['card','third']);
});
