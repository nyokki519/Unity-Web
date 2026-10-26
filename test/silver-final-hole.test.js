import {holeGeometry} from '../public/silver-ring/src/hole-geometry.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CFG} from '../public/silver-ring/src/config.js';
import {Sim,winFlyPts,winFunnelSpec} from '../public/silver-ring/src/physics.js';
const bez=(p,t)=>p[0].map((_,i)=>(1-t)**3*p[0][i]+3*(1-t)**2*t*p[1][i]+3*(1-t)*t*t*p[2][i]+t**3*p[3][i]);
test('final winning transfer begins continuously and clears the full funnel before turning',()=>{
 const tier=2,bw=CFG.bowls.list[tier],wh=bw.holes.find(h=>h.win),hx=Math.cos(wh.a)*bw.ringR,hz=Math.sin(wh.a)*bw.ringR;
 const f=winFunnelSpec(tier);
 for(let k=0;k<24;k++){
  const sim=new Sim(()=>{});sim.spawnInBowl(tier);const b=sim.balls[0],a=k*Math.PI/12;
  Object.assign(b,{px:hx+Math.cos(a)*holeGeometry(bw,wh).capture*.99,pz:hz+Math.sin(a)*holeGeometry(bw,wh).capture*.99,holeTime:.046});
  const before=sim.worldPos(b,[0,0,0]);sim.sink(b,bw,bw.holes.indexOf(wh),hx,hz);
  assert.deepEqual(sim.worldPos(b,[0,0,0]),before);
  const pts=b.chain[0].pts;
  for(let j=0;j<=200;j++){
   const p=bez(pts,j/200);
   // Entire sphere fits the vertical sleeve, including the offset at entry.
   assert.ok(Math.hypot(p[0]-f.x,p[2]-f.z)+CFG.ball.r<=f.radius+1e-9);
  }
  assert.ok(pts[3][1]+CFG.ball.r<f.bottom);
  assert.deepEqual(b.chain[1].pts[0],pts[3]);
  assert.equal(b.chain[1].end,'jackpot');
 }
});
test('existing first and second stage transfer geometry remains unchanged',()=>{
 for(let tier=0;tier<2;tier++)assert.equal(winFlyPts(tier).drop[3][1],winFlyPts(tier).drop[0][1]-.10);
});
