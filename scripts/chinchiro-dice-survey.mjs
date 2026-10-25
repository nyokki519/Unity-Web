import {writeFileSync} from 'node:fs';
import {DiceWorld,PHYSICS} from '../public/chinchiro/src/dice-physics.js';
import {BOWL,DICE_SIZE,BEVEL,dieMesh,meshVolume,FACES,rotate} from '../public/chinchiro/src/dice-geometry.js';
const count=Number(process.argv[2]||500),output=process.argv[3]||'/tmp/dice-survey.json';
if(!Number.isInteger(count)||count<1||count>10000)throw Error('invalid count');
const report={count,config:PHYSICS,bowl:BOWL,die:{size:DICE_SIZE,bevel:BEVEL,mass:meshVolume(dieMesh())*PHYSICS.density},valid:0,invalid:{},faceCounts:[0,0,0,0,0,0],contacts:{floor:0,wall:0,dice:0},belowFlatBase:[],invalidExamples:[],times:[],validTimes:[],lateMotion:{moving:0,contacting:0,turningOverOneRadian:0,changingTopFace:0},maxSpeed:0,nonFinite:0,examples:[]};
for(let seed=1;seed<=count;seed++){
 const w=await DiceWorld.create(seed);let moving=false,contacting=false,turning=false,changing=false,lateRotations=null,lateFaces=null,below=false;
 while(!w.done){w.step();const t=w.tick*w.config.dt;for(const e of w.drainSounds())if(t>=2&&t<=3.5&&(e.normalSpeed>.035||e.tangentSpeed>.025))contacting=true;
 if(t>=2&&t<=3.5&&w.tick%24===0){
  const poses=w.poses(),faces=poses.map(p=>FACES.map(f=>({v:f.value,y:rotate(p.q,f.n)[1]})).sort((a,b)=>b.y-a.y)[0].v);
  if(!lateRotations){lateRotations=poses.map(p=>p.q);lateFaces=faces;}
  poses.forEach((p,i)=>{const dot=Object.keys(p.q).reduce((sum,k)=>sum+p.q[k]*lateRotations[i][k],0);if(2*Math.acos(Math.min(1,Math.abs(dot)))>1)turning=true;if(faces[i]!==lateFaces[i])changing=true;});
  if(w.dice.some(d=>Math.hypot(...Object.values(d.body.linvel()))>.03||Math.hypot(...Object.values(d.body.angvel()))>2))moving=true;
 }
 for(const d of w.dice){const p=w.bowlLocal(d.body.translation());if(!below&&Math.hypot(p[0],p[2])<BOWL.flatRadius-DICE_SIZE&&p[1]<-.001){report.belowFlatBase.push({seed,seconds:t,local:p});below=true;}const v=d.body.linvel();report.maxSpeed=Math.max(report.maxSpeed,Math.hypot(v.x,v.y,v.z));}}
 if(w.result.values){report.valid++;report.validTimes.push(w.result.seconds);for(const n of w.result.values)report.faceCounts[n-1]++;}else{report.invalid[w.result.reason]=(report.invalid[w.result.reason]||0)+1;if(report.invalidExamples.length<32)report.invalidExamples.push({...w.result,local:w.dice.map(d=>w.bowlLocal(d.body.translation()))});}
 for(const [k,v] of Object.entries({moving,contacting,turningOverOneRadian:turning,changingTopFace:changing}))if(v)report.lateMotion[k]++;
 for(const k of Object.keys(report.contacts))report.contacts[k]+=w.contacts[k];report.times.push(w.result.seconds);if(seed<=8)report.examples.push(w.result);w.dispose();
}
report.meanSeconds=report.times.reduce((a,b)=>a+b,0)/count;report.times.sort((a,b)=>a-b);report.p95Seconds=report.times[Math.floor(count*.95)];report.validTimes.sort((a,b)=>a-b);report.validMeanSeconds=report.validTimes.reduce((a,b)=>a+b,0)/report.validTimes.length;report.validMedianSeconds=report.validTimes[Math.floor(report.validTimes.length*.5)];report.validP95Seconds=report.validTimes[Math.floor(report.validTimes.length*.95)];
report.notes='Prescribed visible dish movement supplies energy through contacts; not five-second passive steel restitution. Uncalibrated homogeneous solid-steel/brass design model. Face counts exclude invalid throws; not proof of fair or real-world-calibrated dice. Collision counts are contact starts, wall classification approximated by centre radius.';
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,times:undefined,validTimes:undefined,examples:undefined,invalidExamples:report.invalidExamples.length,belowFlatBase:report.belowFlatBase.length}));
