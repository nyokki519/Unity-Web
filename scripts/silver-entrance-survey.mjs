import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
import {writeFileSync} from 'node:fs';
const original=CFG.gate.halfW, originalShutter=CFG.shutter.halfW, rows=[];
for(const width of [.026,.022])for(let seed=0;seed<16;seed++){
 CFG.gate.halfW=width;CFG.shutter.halfW=width===.026?.055:.048;let shots=0,gates=0,jackpots=0;const sim=new Sim(type=>{if(type==='gate')gates++;if(type==='jackpot')jackpots++;},createRng(`entrance-${seed}`));let t=0;
 for(;t<240*240;t++){if(t%20===0&&shots<250&&sim.liveCount()<30&&sim.launch(.45))shots++;sim.step(1/240);if(shots===250&&sim.liveCount()===0)break;}
 rows.push({width,seed,shots,gates,jackpots,remaining:sim.liveCount()});
}
CFG.gate.halfW=original;CFG.shutter.halfW=originalShutter;
const report={conditions:{seeds:16,shots:250,power:.45,dt:1/240,air:CFG.bowls.air.chance,interference:CFG.shutter.blockRate,maxSeconds:240},rows,summary:[.026,.022].map(width=>({width,shots:rows.filter(r=>r.width===width).reduce((s,r)=>s+r.shots,0),gates:rows.filter(r=>r.width===width).reduce((s,r)=>s+r.gates,0),jackpots:rows.filter(r=>r.width===width).reduce((s,r)=>s+r.jackpots,0),remaining:rows.filter(r=>r.width===width).reduce((s,r)=>s+r.remaining,0)}))};writeFileSync('docs/qa/entrance-width/simulation.json',JSON.stringify(report,null,2));console.log(report.summary);
