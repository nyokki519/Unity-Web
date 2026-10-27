import test from 'node:test';import assert from 'node:assert/strict';
import {entryBurstFrame,shouldCueEntry} from '../public/silver-ring/src/entry-celebration.js';
test('final entry particles start at the physical event, are repeatable and leave the centre clear',()=>{
 assert.equal(entryBurstFrame(-.001).visible,false);assert.equal(entryBurstFrame(1.1).visible,false);
 const a=entryBurstFrame(.1);assert.ok(a.visible&&a.particles.length>=48);
 assert.deepEqual(a,entryBurstFrame(.1));
 for(const p of a.particles){assert.ok(Math.hypot(p[0],p[2])>.027);assert.ok(p.every(Number.isFinite));}
 assert.ok(entryBurstFrame(.1,true).particles.length<a.particles.length);
});
test('replay cues a short entry sound once per angle, never before entry',()=>{
 const played=new Set();assert.equal(shouldCueEntry(played,0,.99,1),false);
 assert.equal(shouldCueEntry(played,0,1,1),true);assert.equal(shouldCueEntry(played,0,1.1,1),false);
 assert.equal(shouldCueEntry(played,1,1,1),true);assert.equal(shouldCueEntry(played,2,1,1),true);
 assert.equal(shouldCueEntry(new Set(),0,1,undefined),false);
});
test('all replay cuts use the supplied single kyuiin recording and respect mute',async()=>{
 const {AudioEngine}=await import('../public/silver-ring/src/audio.js');
 const roles=[],voice={muted:false,ctx:{currentTime:10},master:{},samples:{play(role){roles.push(role);return true;}}};
 for(let i=0;i<3;i++)assert.equal(AudioEngine.prototype.replayEntry.call(voice),true);
 assert.deepEqual(roles,['replayEntry','replayEntry','replayEntry']);
 voice.muted=true;assert.equal(AudioEngine.prototype.replayEntry.call(voice),false);assert.equal(roles.length,3);
});
test('replacement kyuiin contains active audio and its natural quiet tail as lossless PCM',async()=>{
 const {readFileSync}=await import('node:fs'),b=readFileSync(new URL('../public/silver-ring/audio/replay-entry.wav',import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');let pos=12,pcm,rate,channels;
 while(pos+8<=b.length){const id=b.toString('ascii',pos,pos+4),n=b.readUInt32LE(pos+4);if(id==='fmt '){assert.equal(b.readUInt16LE(pos+8),1);channels=b.readUInt16LE(pos+10);rate=b.readUInt32LE(pos+12);assert.equal(b.readUInt16LE(pos+22),16);}if(id==='data')pcm=b.subarray(pos+8,pos+8+n);pos+=8+n+(n%2);}
 const duration=pcm.length/(rate*channels*2);assert.ok(duration>1.69&&duration<1.70);
 const rms=(start,end)=>{let sum=0,n=0;for(let i=start;i<end;i+=2){sum+=(pcm.readInt16LE(i)/32768)**2;n++;}return Math.sqrt(sum/n);};
 const count=Math.floor(rate*.1)*channels*2;assert.ok(rms(0,count)>.1);assert.ok(rms(pcm.length-count,pcm.length)<.001);
});
