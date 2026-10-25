import {writeFileSync} from 'node:fs';
import {DiceWorld,PHYSICS} from '../public/chinchiro/src/dice-physics.js';
import {BOWL,DICE_SIZE,BEVEL,dieMesh,meshVolume} from '../public/chinchiro/src/dice-geometry.js';
const count=Number(process.argv[2]||500),output=process.argv[3]||'/tmp/dice-survey.json';
if(!Number.isInteger(count)||count<1||count>10000)throw Error('invalid count');
const report={count,config:PHYSICS,bowl:BOWL,die:{size:DICE_SIZE,bevel:BEVEL,mass:meshVolume(dieMesh())*PHYSICS.density},valid:0,invalid:{},faceCounts:[0,0,0,0,0,0],contacts:{floor:0,wall:0,dice:0},times:[],maxSpeed:0,nonFinite:0,examples:[]};
for(let seed=1;seed<=count;seed++){
 const w=await DiceWorld.create(seed);
 while(!w.done){w.step();for(const d of w.dice){const v=d.body.linvel();report.maxSpeed=Math.max(report.maxSpeed,Math.hypot(v.x,v.y,v.z));}}
 if(w.result.values){report.valid++;for(const n of w.result.values)report.faceCounts[n-1]++;}else report.invalid[w.result.reason]=(report.invalid[w.result.reason]||0)+1;
 for(const k of Object.keys(report.contacts))report.contacts[k]+=w.contacts[k];report.times.push(w.result.seconds);if(seed<=8)report.examples.push(w.result);w.dispose();
}
report.meanSeconds=report.times.reduce((a,b)=>a+b,0)/count;report.times.sort((a,b)=>a-b);report.p95Seconds=report.times[Math.floor(count*.95)];report.notes='Uncalibrated homogeneous resin/wood model. Face counts exclude invalid throws; not proof of fair or real-world-calibrated dice. Collision counts are contact starts, wall classification approximated by centre radius.';
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,times:undefined,examples:undefined}));
