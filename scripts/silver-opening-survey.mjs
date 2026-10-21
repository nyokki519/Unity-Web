import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
import {writeFileSync} from 'node:fs';
const option=(name,fallback)=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const seedCount=Number(option('seeds','48')),seedStart=Number(option('start','0'));
const shotBudget=Number(option('shots','250')),scales=option('scales','1,0.5').split(',').map(Number);
if(!Number.isSafeInteger(shotBudget)||shotBudget<1||scales.some(x=>!Number.isFinite(x)||x<=0))throw new Error('invalid shots/scales');
const airMode=option('air','current'),originalAir=CFG.bowls.air.chance;
if(!['current','on','off'].includes(airMode))throw new Error('air must be current, on or off');
const airChance=airMode==='off'?0:airMode==='on'?.32:originalAir;
const output=option('output','docs/qa/entrance-open-time/simulation.json');
if(!Number.isSafeInteger(seedCount)||seedCount<1||!Number.isSafeInteger(seedStart)||seedStart<0)throw new Error('seeds/start must be positive/nonnegative integers');
const saved=CFG.shutter.openTimeScale, rows=[];
try {
 CFG.bowls.air.chance=airChance;
 for(const scale of scales)for(let seed=seedStart;seed<seedStart+seedCount;seed++){
  CFG.shutter.openTimeScale=scale;
  let shots=0,gates=0,jackpots=0,refunds=0,airBursts=0;
  const stageEntries=[0,0,0],stageWins=[0,0,0],stageLosses=[0,0,0];
  const sim=new Sim((type,data)=>{if(type==='gate')gates++;if(type==='jackpot')jackpots++;if(type==='foul')refunds++;if(type==='bowlenter')stageEntries[data.tier]++;if(type==='sink')(data.win?stageWins:stageLosses)[data.tier]++;if(type==='air'&&data.burst)airBursts++;},createRng(`opening-${seed}`));
  for(let t=0;t<240*240;t++){
   if(t%20===0&&shots-refunds<shotBudget&&sim.liveCount()<30&&sim.launch(.45))shots++;
   sim.step(1/240);
   if(shots-refunds===shotBudget&&sim.liveCount()===0)break;
  }
  rows.push({scale,seed,shots,refunds,gates,jackpots,remaining:sim.liveCount(),netShots:shots-refunds,stageEntries,stageWins,stageLosses,airBursts});
  if((seed-seedStart+1)%25===0)console.log(JSON.stringify({scale,start:seedStart,completed:seed-seedStart+1,total:seedCount}));
 }
}finally{CFG.shutter.openTimeScale=saved;CFG.bowls.air.chance=originalAir;}
const report={conditions:{bowlContacts:{...CFG.bowls.contacts},seeds:seedCount,seedStart,netShotBudget:shotBudget,power:.45,dt:1/240,air:airChance,airSettings:{...CFG.bowls.air,chance:airChance},interference:CFG.shutter.blockRate,gateHalfWidth:CFG.gate.halfW,shutterHalfWidth:CFG.shutter.halfW,maxSeconds:240},rows,summary:scales.map(scale=>{
 const trials=rows.filter(r=>r.scale===scale);
 return {scale,runs:trials.length,winningRuns:trials.filter(r=>r.jackpots>0).length,winningRunRate:trials.filter(r=>r.jackpots>0).length/trials.length,shots:trials.reduce((s,r)=>s+r.shots,0),gates:trials.reduce((s,r)=>s+r.gates,0),jackpots:trials.reduce((s,r)=>s+r.jackpots,0),remaining:trials.reduce((s,r)=>s+r.remaining,0),incompleteRuns:trials.filter(r=>r.netShots!==shotBudget).length};
})};
writeFileSync(output,JSON.stringify(report,null,2));console.log(report.summary);
