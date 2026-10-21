import test from 'node:test';
import assert from 'node:assert/strict';
import * as forces from '../public/silver-ring/src/bowl-forces.js';
const ball=(px,pz,pvx,pvz)=>({px,pz,pvx,pvz,hopY:0,hopV:0});
const edge={x:0,z:0,inner:.019,outer:.043,depth:.0035,gravity:CFG.g};
test('grazing a rounded hole edge curves a near miss without random rebound',()=>{
 const b=ball(-.065,.032,.4,0),dt=1/1000;let largestTurn=0;
 for(let i=0;i<400;i++){forces.applyLipGravity(b,{...edge,dt});b.px+=b.pvx*dt;b.pz+=b.pvz*dt;largestTurn=Math.max(largestTurn,Math.abs(Math.atan2(b.pvz,b.pvx)));}
 assert.ok(largestTurn>.12,'a visible bend for a genuine graze');assert.ok(b.pvx>0,'no forced outward bounce');assert.ok(b.pvz<-.02,'deflection follows edge geometry');
 assert.ok(Math.abs(Math.hypot(b.pvx,b.pvz)-.4)<.002,'energy recovered on leaving the recess');
});
test('lip gravity is symmetric, timestep convergent, absent remotely and inside the hole',()=>{
 const run=(sign,dt)=>{const b=ball(-.065,sign*.032,.4,0);for(let t=0;t<.4-dt/2;t+=dt){forces.applyLipGravity(b,{...edge,dt});b.px+=b.pvx*dt;b.pz+=b.pvz*dt;}return b;};
 const a=run(1,1/240),mirror=run(-1,1/240),fine=run(1,1/480);
 assert.ok(Math.abs(a.pvz+mirror.pvz)<1e-10);assert.ok(Math.abs(a.pz-fine.pz)<.0008);
 for(const x of[0,.1]){const b=ball(x,0,.2,0);forces.applyLipGravity(b,{...edge,dt:1/240});assert.equal(b.pvx,.2);assert.equal(b.pvz,0);}
});
test('air jet adds continuous momentum only during its pulse and within its field',()=>{
 const config={x:0,z:-.046,time:.2,dt:1/240,period:1.8,duty:.32,radius:.06,acceleration:5};
 const b=ball(0,-.04,0,0);assert.ok(forces.applyAirJet(b,config)>0);assert.ok(b.pvz>0&&b.pvz<.03);assert.equal(b.pvx,0);
 for(const overrides of[{duty:0},{time:1.2},{x:1}]){const a=ball(0,-.04,0,0);assert.equal(forces.applyAirJet(a,{...config,...overrides}),0);assert.equal(a.pvz,0);}
 const a=ball(0,-.04,0,0);forces.applyAirJet(a,{...config,dt:1/480});forces.applyAirJet(a,{...config,dt:1/480});assert.ok(Math.abs(a.pvz-b.pvz)<1e-12);
});
import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
test('final bowl wind keeps working after an earlier encounter and respects OFF',()=>{
 const original=CFG.bowls.air.chance;
 try{
  const run=duty=>{CFG.bowls.air.chance=duty;const events=[],s=new Sim((type)=>events.push(type),createRng('wind-repeat'));s.spawnInBowl(2);s.time=.2;Object.assign(s.balls[0],{px:0,pz:-.035,pvx:.3,pvz:0,aired:true});s.stepBowl(s.balls[0],1/240);return{v:s.balls[0].pvz,events};};
  const on=run(.32),off=run(0);assert.ok(on.v-off.v>.001);assert.ok(on.events.includes('air'));assert.ok(!off.events.includes('air'));
 }finally{CFG.bowls.air.chance=original;}
});
test('a moderately fast centre passage falls if support is lost long enough',()=>{
 const s=new Sim(()=>{},createRng('fall-dwell'));s.spawnInBowl(0);const b=s.balls[0];Object.assign(b,{px:0,pz:CFG.bowls.list[0].ringR-.017,pvx:0,pvz:.35});
 for(let i=0;i<20&&b.mode==='bowl';i++)s.step(1/240);
 assert.equal(b.mode,'script','no arbitrary speed veto once gravity has time to pull the ball down');
});
test('a very fast shallow crossing leaves the aperture before it can fall',()=>{
 const s=new Sim(()=>{},createRng('fast-graze'));s.spawnInBowl(0);const b=s.balls[0];Object.assign(b,{px:-.016,pz:CFG.bowls.list[0].ringR+.015,pvx:1.2,pvz:0});
 for(let i=0;i<8;i++)s.step(1/240);assert.equal(b.mode,'bowl');assert.equal(b.holeTime,0);
});
test('committing a falling ball to the chute does not teleport it back onto the rim',()=>{
 const s=new Sim(()=>{},createRng('fall-continuity'));s.spawnInBowl(0);const b=s.balls[0],bw=CFG.bowls.list[0];Object.assign(b,{px:.006,pz:bw.ringR,pvx:0,pvz:0,holeTime:.05,holeIndex:0});
 const before=s.worldPos(b,[0,0,0]);s.sink(b,bw,0,0,bw.ringR);const after=s.worldPos(b,[0,0,0]);assert.deepEqual(after,before);
});
test('a final-hole approach gets a sharp outward puff even between periodic winds',()=>{
 const original=CFG.bowls.air.chance;
 try{
  const run=duty=>{CFG.bowls.air.chance=duty;let bursts=0;const s=new Sim((type,d)=>{if(type==='air'&&d.burst)bursts++;},createRng('sharp-puff'));s.spawnInBowl(2);s.time=1.1;const b=s.balls[0];Object.assign(b,{px:0,pz:-.012,pvx:0,pvz:-.22});const path=[];for(let i=0;i<24;i++){s.step(1/240);path.push({z:b.pz,v:b.pvz,mode:b.mode});}return{s,b,path,bursts};};
  const on=run(.32),off=run(0);assert.ok(on.b.pvz>.10,'must visibly reverse the approaching ball within 100ms');assert.ok(on.b.pvz-off.b.pvz>.30);assert.equal(on.bursts,1,'one shared puff, no per-frame retrigger');assert.equal(off.bursts,0);assert.equal(on.b.mode,'bowl');
 }finally{CFG.bowls.air.chance=original;}
});
test('a puff does not change an already falling ball or any other stage',()=>{
 const run=(tier,time=1.1)=>{const s=new Sim(()=>{},createRng('inside-puff'));s.spawnInBowl(tier);s.time=time;s.airBurstStart=time-.02;const b=s.balls[0],bw=CFG.bowls.list[tier],h=bw.holes[0];Object.assign(b,{px:Math.cos(h.a)*bw.ringR,pz:Math.sin(h.a)*bw.ringR,pvx:0,pvz:0,holeTime:.02,holeIndex:0});s.step(1/240);return b;};
 for(const time of[.2,1.1]){const b=run(2,time);assert.ok(Math.abs(b.pvz)<.01,'no ejection after support was lost');}const a=run(0);assert.ok(Math.abs(a.pvz)<.01);
});

test('the short puff integrates consistently across time steps and cannot act remotely',()=>{
 const run=dt=>{const b=ball(0,.03,0,0);for(let t=0;t<.06;t+=dt)forces.applyAirBurst(b,{x:0,z:0,elapsed:t,dt,duration:.06,radius:.055,inner:.019,acceleration:40});return b.pvz;};
 assert.ok(Math.abs(run(1/240)-run(1/480))<1e-10);assert.ok(run(1/240)>.5);
 const b=ball(0,.1,0,0);assert.equal(forces.applyAirBurst(b,{x:0,z:0,elapsed:.02,dt:1/240,duration:.06,radius:.055,inner:.019,acceleration:40}),0);assert.equal(b.pvz,0);
});
