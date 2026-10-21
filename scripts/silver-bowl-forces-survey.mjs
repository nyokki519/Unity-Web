import {writeFileSync} from 'node:fs';
import {Sim} from '../public/silver-ring/src/physics.js';
import {CFG} from '../public/silver-ring/src/config.js';
import {createRng} from '../public/silver-ring/src/seed.js';
const option=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const trials=Number(option('trials','200')),output=option('output','docs/qa/retro-physical-lips/stage-survey.json');
if(!Number.isSafeInteger(trials)||trials<1)throw Error('invalid trials');
const saved=CFG.bowls.air.chance,rows=[];
try{
 for(let tier=0;tier<3;tier++)for(const duty of(tier===2?[0,.32]:[.32])){
  CFG.bowls.air.chance=duty;
  let wins=0,losses=0,unresolved=0,windEvents=0,windRuns=0,seconds=0,maxSeconds=0;
  for(let trial=0;trial<trials;trial++){
   let result=null,wind=0;
   const s=new Sim((type,data)=>{if(type==='sink'&&data.tier===tier)result=data.win;if(type==='air')wind++;},createRng(`physical-lip-stage-${tier}-${trial}`));
   s.spawnInBowl(tier);
   for(let i=0;i<240*90&&result===null&&s.liveCount();i++)s.step(1/240);
   if(result===true)wins++;else if(result===false)losses++;else unresolved++;
   windEvents+=wind;if(wind)windRuns++;seconds+=s.time;maxSeconds=Math.max(maxSeconds,s.time);
  }
  rows.push({tier:tier+1,duty,trials,wins,losses,unresolved,windEvents,windRuns,meanSeconds:seconds/trials,maxSeconds});
 }
}finally{CFG.bowls.air.chance=saved;}
const report={conditions:{dt:1/240,contacts:{...CFG.bowls.contacts},air:{...CFG.bowls.air}},rows,note:'Natural seeded single-ball bowl entries. Not full-game odds or physical-device performance.'};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
if(rows.some(r=>r.unresolved))process.exitCode=1;
