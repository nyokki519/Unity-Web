import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
import {writeFileSync} from 'node:fs';
CFG.shutter.blockRate=0;CFG.bowls.air.chance=0;
const budget=process.argv.includes('--budget'),budgetShots=Number(process.argv.find(x=>x.startsWith('--shots='))?.split('=')[1]||400);const rows=[];
for(let trial=0;trial<48;trial++){
 let hit=false,fired=0,refunds=0,net=0;const counts={};
 const rng=createRng(`economy-200-${trial}`),sim=new Sim((ev)=>{counts[ev]=(counts[ev]||0)+1;if(ev==='jackpot')hit=true;if(ev==='foul'){refunds++;net--;}},rng);
 for(let t=0;t<240*700&&!hit;t++){
  if(t%20===0&&fired<5000&&(!budget||net<budgetShots)&&sim.liveCount()<30&&sim.launch(.45)){fired++;net++;}
  sim.step(1/240);
  if((fired>=5000||(budget&&net>=budgetShots))&&sim.liveCount()===0)break;
 }
 rows.push({seed:`economy-200-${trial}`,hit,fired,refunds,net,counts});
 if(trial%8===7)console.log('completed',trial+1);
}
const successes=rows.filter(r=>r.hit).map(r=>r.net).sort((a,b)=>a-b);
const report={conditions:{budgetShots:budget?budgetShots:null,seeds:48,power:.45,shotsPerSecond:12,maxLive:30,dt:1/240,cap:5000,interference:false},rows,hitCount:successes.length,medianNetShots:successes[Math.floor(successes.length/2)]};
writeFileSync(budget?`docs/qa/visible-rain-zawa/economy-budget-${budgetShots}.json`:'docs/qa/visible-rain-zawa/economy-survey.json',JSON.stringify(report,null,2));console.log({hitCount:report.hitCount,medianNetShots:report.medianNetShots});
