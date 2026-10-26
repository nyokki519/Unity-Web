import assert from 'node:assert/strict';
import {CFG} from '../public/silver-ring/src/config.js';
import {Sim,winFunnelSpec} from '../public/silver-ring/src/physics.js';
import {holeGeometry} from '../public/silver-ring/src/hole-geometry.js';
import {createRng} from '../public/silver-ring/src/seed.js';
const count=Number(process.argv[2]||200),saved=CFG.bowls.air.chance,bw=CFG.bowls.list[2],h=holeGeometry(bw,bw.holes.find(h=>h.win)),rows=[];
try{for(const wind of [0,.32]){
 CFG.bowls.air.chance=wind;let wins=0,losses=0,unresolved=0,maxAdmissionOffset=0,maxEventOffset=0;
 for(let i=0;i<count;i++){
  let ended=false;const sim=new Sim((type,d)=>{if(type!=='sink'||d.tier!==2)return;ended=true;if(d.win){wins++;assert.ok(d.y+CFG.ball.r<=winFunnelSpec(2).top);maxEventOffset=Math.max(maxEventOffset,Math.hypot(d.x-h.x,d.z-bw.cz-h.z));}else losses++;},createRng('aperture-check-'+i));
  const original=sim.sink.bind(sim);sim.sink=(ball,bowl,index,x,z)=>{if(ball.bi===2&&bowl.holes[index].win){const distance=Math.hypot(ball.px-h.x,ball.pz-h.z);assert.ok(distance<h.capture);maxAdmissionOffset=Math.max(maxAdmissionOffset,distance);}return original(ball,bowl,index,x,z);};
  sim.spawnInBowl(2);for(let step=0;step<240*90&&!ended&&sim.liveCount();step++)sim.step(1/240);if(!ended)unresolved++;
 }
 assert.equal(unresolved,0);assert.ok(wins>0&&losses>0);rows.push({wind,count,wins,losses,unresolved,maxAdmissionOffset,maxEventOffset,capture:h.capture});
}}finally{CFG.bowls.air.chance=saved;}
console.log(JSON.stringify({note:'Controlled third-stage entries, not full250-ball session jackpot rates.',rows},null,2));
