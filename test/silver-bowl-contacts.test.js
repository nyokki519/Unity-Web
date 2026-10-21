import test from 'node:test';import assert from 'node:assert/strict';
import {resolveBowlPair,advanceHop} from '../public/silver-ring/src/bowl-contacts.js';
const ball=(px,pz,pvx,pvz)=>({px,pz,pvx,pvz,hopY:0,hopV:0});
test('oblique ball collision redirects both balls without adding kinetic energy',()=>{
 const a=ball(-.02,0,.5,.1),b=ball(.02,.014,-.2,0),energy=o=>o.pvx**2+o.pvz**2+(o.hopV||0)**2,before=energy(a)+energy(b);
 assert.ok(resolveBowlPair(a,b,{radius:.026,restitution:.8,friction:.08,heightA:0,heightB:0}));assert.ok(Math.abs(a.pvz-.1)>.02);assert.ok(energy(a)+energy(b)<=before+1e-8);
});
test('balls separated vertically do not collide and coincident balls resolve finitely',()=>{
 const a=ball(0,0,.3,0),b=ball(0,0,-.2,0);assert.equal(resolveBowlPair(a,b,{radius:.026,heightA:0,heightB:.08}),0);
 assert.ok(resolveBowlPair(a,b,{radius:.026,heightA:0,heightB:0}));assert.ok([a.px,a.pz,b.px,b.pz,a.pvx,b.pvx].every(Number.isFinite));
});
import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
test('an incoming ball can knock a candidate out before hole entry is committed',()=>{
 const sim=new Sim(()=>{},createRng('pre-sink-contact'));sim.spawnInBowl(0);sim.spawnInBowl(0);const[a,b]=sim.balls;
 Object.assign(a,{px:0,pz:CFG.bowls.list[0].ringR,pvx:0,pvz:0,holeTime:.044,holeIndex:0});Object.assign(b,{px:-.048,pz:a.pz,pvx:.8,pvz:0});
 sim.step(1/240);assert.equal(a.mode,'bowl');assert.ok(a.pvx>.3);assert.equal(a.pendingSink,null);
});
test('multiple bowl balls stay finite, never repeat a stage sink, and all resolve',()=>{
 for(let tier=0;tier<3;tier++){
  const sim=new Sim(()=>{},createRng(`contacts-stress-${tier}`)),seen=new Set(),sink=sim.sink.bind(sim);
  sim.sink=(b,...args)=>{const key=`${b.id}:${b.bi}`;assert.ok(!seen.has(key),'duplicate stage sink');seen.add(key);sink(b,...args);};
  for(let i=0;i<12;i++)sim.spawnInBowl(tier);
  for(let step=0;step<240*90&&sim.liveCount();step++){sim.step(1/240);for(const b of sim.balls){const p=sim.worldPos(b,[0,0,0]);assert.ok(p.every(Number.isFinite));if(b.mode==='bowl')assert.ok((b.hopY||0)<.06,'no explosive collision hop');}}
  assert.equal(sim.liveCount(),0,`tier ${tier+1} must drain`);assert.ok(seen.size>=12);
 }
});
test('a stalled bowl ball returns its credit exactly once instead of keeping the game alive',()=>{
 const events=[],sim=new Sim((type,data)=>{if(type==='foul')events.push(data);},createRng('stall-return'));
 sim.spawnInBowl(0);const b=sim.balls[0];Object.assign(b,{bowlT:34.9,px:Math.cos(.5)*.0475,pz:Math.sin(.5)*.0475,pvx:0,pvz:0,dampMul:100});
 for(let i=0;i<240*5;i++)sim.step(1/240);assert.equal(sim.liveCount(),0);assert.equal(events.length,1);assert.equal(events[0].reason,'bowl-stall');
 for(let i=0;i<240;i++)sim.step(1/240);assert.equal(events.length,1);
});
test('fast passage over a hole has no extra braking or pull from the hole',()=>{
 const a=new Sim(()=>{},createRng('rim-speed')),b=new Sim(()=>{},createRng('rim-speed'));a.spawnInBowl(0);b.spawnInBowl(0);
 for(const sim of[a,b])Object.assign(sim.balls[0],{px:.008,pz:CFG.bowls.list[0].ringR,pvx:.4,pvz:.1});
 const bw=CFG.bowls.list[0],holes=bw.holes;try{bw.holes=[];a.stepBowl(a.balls[0],1/240);}finally{bw.holes=holes;}
 b.stepBowl(b.balls[0],1/240);assert.ok(Math.abs(a.balls[0].pvx-b.balls[0].pvx)<1e-12);assert.ok(Math.abs(a.balls[0].pvz-b.balls[0].pvz)<1e-12);assert.equal(b.balls[0].hopV,0);
});
