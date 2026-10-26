import test from 'node:test';import assert from 'node:assert/strict';
import {CFG} from '../public/silver-ring/src/config.js';
import {holeGeometry,canEnterHole} from '../public/silver-ring/src/hole-geometry.js';
import {Sim,winFunnelSpec} from '../public/silver-ring/src/physics.js';
test('final winning bore admits the full sphere, rather than an off-centre overlapping ball',()=>{
 const bw=CFG.bowls.list[2],h=bw.holes.find(h=>h.win),g=holeGeometry(bw,h);
 assert.ok(g.aperture>CFG.ball.r);assert.ok(g.capture<=g.aperture-CFG.ball.r);
 assert.ok(g.capture<.006);assert.equal(canEnterHole(g.x+.020,g.z,g),false);assert.equal(canEnterHole(g.x+.025,g.z,g),false);
 assert.equal(canEnterHole(g.x,g.z,g),true);assert.equal(canEnterHole(g.x+g.capture*.99,g.z,g),true);
 const f=winFunnelSpec(2);assert.equal(f.x,g.x);assert.equal(f.z,bw.cz+g.z);assert.equal(f.radius,g.aperture);
 for(const other of bw.holes.filter(o=>!o.win)){const q=holeGeometry(bw,other);assert.ok(Math.hypot(g.x-q.x,g.z-q.z)>g.ringRadius+.0045+q.ringRadius+.0028,'decorative rims must not overlap');}
});
test('simulation cannot commit an offset pending final entry after contacts',()=>{
 const bw=CFG.bowls.list[2],h=bw.holes.find(h=>h.win),g=holeGeometry(bw,h),sim=new Sim(()=>{});sim.spawnInBowl(2);const b=sim.balls[0];
 Object.assign(b,{px:g.x+.020,pz:g.z,pvx:0,pvz:0,holeTime:.05,holeIndex:bw.holes.indexOf(h)});
 sim.step(1/240);assert.equal(b.mode,'bowl');assert.equal(b.pendingSink,null);
});
test('final entry sound/event waits until the entire sphere has passed the rim plane',()=>{
 const events=[],bw=CFG.bowls.list[2],h=bw.holes.find(h=>h.win),g=holeGeometry(bw,h),s=new Sim((type,data)=>{if(type==='sink')events.push(data);});s.spawnInBowl(2);const b=s.balls[0];
 Object.assign(b,{px:g.x,pz:g.z,holeTime:.012,holeIndex:bw.holes.indexOf(h)});s.sink(b,bw,bw.holes.indexOf(h),g.x,g.z);
 const top=winFunnelSpec(2).top;assert.equal(events.length,0);
 for(let i=0;i<90;i++){s.stepScript(b,1/240);if(b.wy+CFG.ball.r>top)assert.equal(events.length,0);}
 assert.equal(events.length,1);assert.ok(events[0].y+CFG.ball.r<=top);
});
