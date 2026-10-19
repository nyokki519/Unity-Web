import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
import {writeFileSync} from 'node:fs';
const option=(name,fallback)=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const seedCount=Number(option('seeds','48')),seedStart=Number(option('start','0'));
const output=option('output','docs/qa/entrance-open-time/simulation.json');
if(!Number.isSafeInteger(seedCount)||seedCount<1||!Number.isSafeInteger(seedStart)||seedStart<0)throw new Error('seeds/start must be positive/nonnegative integers');
const saved=CFG.shutter.openTimeScale, rows=[];
try {
 for(const scale of [1,.5])for(let seed=seedStart;seed<seedStart+seedCount;seed++){
  CFG.shutter.openTimeScale=scale;
  let shots=0,gates=0,jackpots=0,refunds=0;
  const sim=new Sim(type=>{if(type==='gate')gates++;if(type==='jackpot')jackpots++;if(type==='foul')refunds++;},createRng(`opening-${seed}`));
  for(let t=0;t<240*240;t++){
   if(t%20===0&&shots-refunds<250&&sim.liveCount()<30&&sim.launch(.45))shots++;
   sim.step(1/240);
   if(shots-refunds===250&&sim.liveCount()===0)break;
  }
  rows.push({scale,seed,shots,refunds,gates,jackpots,remaining:sim.liveCount(),netShots:shots-refunds});
  if((seed-seedStart+1)%25===0)console.log(JSON.stringify({scale,start:seedStart,completed:seed-seedStart+1,total:seedCount}));
 }
}finally{CFG.shutter.openTimeScale=saved;}
const report={conditions:{seeds:seedCount,seedStart,netShotBudget:250,power:.45,dt:1/240,air:CFG.bowls.air.chance,interference:CFG.shutter.blockRate,gateHalfWidth:CFG.gate.halfW,shutterHalfWidth:CFG.shutter.halfW,maxSeconds:240},rows,summary:[1,.5].map(scale=>{
 const trials=rows.filter(r=>r.scale===scale);
 return {scale,runs:trials.length,winningRuns:trials.filter(r=>r.jackpots>0).length,winningRunRate:trials.filter(r=>r.jackpots>0).length/trials.length,shots:trials.reduce((s,r)=>s+r.shots,0),gates:trials.reduce((s,r)=>s+r.gates,0),jackpots:trials.reduce((s,r)=>s+r.jackpots,0),remaining:trials.reduce((s,r)=>s+r.remaining,0),incompleteRuns:trials.filter(r=>r.netShots!==250).length};
})};
writeFileSync(output,JSON.stringify(report,null,2));console.log(report.summary);
