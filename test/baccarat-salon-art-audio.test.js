import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chipArt } from '../public/baccarat/salon-art.js';
import { SalonAudio } from '../public/baccarat/salon-audio.js';

test('independent detailed denomination assets and injection-safe custom chips', async () => {
  for (const value of [1,10,100,500,1000,5000]) {
    const source = await readFile(new URL(chipArt(value)), 'utf8');
    assert.match(source, /UNITY SALON/); assert.match(source, /mask="url\(#community\)"/);
    assert.match(source, /data:image\/webp;base64/); assert.ok(source.includes(value.toLocaleString('en-US')));
  }
  assert.ok(chipArt('<script>').startsWith('data:image/svg+xml,'));
  assert.ok(!decodeURIComponent(chipArt('<script>')).includes('<script>'));
});

test('audio unlock, channels, contact cap, pause/resume and disposal', async () => {
  let created = 0;
  class Node { constructor(){this.gain=this.frequency={value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(v){this.value=v;}};} connect(){} disconnect(){this.disconnected=true;} start(){} stop(){this.stopped=true;} }
  class Context { constructor(){created++;this.state='suspended';this.currentTime=1;this.destination={};} createGain(){return new Node();} createOscillator(){return new Node();} async resume(){this.state='running';} async suspend(){this.state='suspended';} async close(){this.state='closed';} }
  globalThis.AudioContext=Context;
  const audio=new SalonAudio(); audio.play('chip'); assert.equal(created,0);
  assert.equal(await audio.unlock(),true); assert.ok(audio.timer); assert.ok(audio.nodes.size>0);
  audio.set({bgm:0,se:.7,ui:.2}); assert.equal(audio.timer,null); assert.equal(audio.gains.se.gain.value,.7); assert.equal(audio.gains.ui.gain.value,.2);
  for(let i=0;i<100;i++) {audio.ctx.currentTime+=.1; audio.play('chip');}
  assert.ok(audio.nodes.size<=24);
  audio.pause(); assert.equal(audio.nodes.size,0); assert.equal(audio.ctx.state,'suspended');
  audio.play('win'); assert.equal(audio.nodes.size,0);
  await audio.resume(); audio.play('win'); assert.ok(audio.nodes.size>0);
  audio.set({muted:true,bgm:1}); assert.equal(audio.gains.se.gain.value,0); assert.equal(audio.timer,null);
  const ctx=audio.ctx; audio.dispose(); assert.equal(audio.nodes.size,0); assert.equal(ctx.state,'closed'); assert.equal(await audio.unlock(),false); audio.dispose();
  delete globalThis.AudioContext;
});
