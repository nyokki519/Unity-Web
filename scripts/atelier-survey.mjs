import {writeFileSync} from 'node:fs';
import {AtelierSim} from '../public/atelier/src/physics.js';
import {SETTINGS} from '../public/atelier/src/config.js';
const rows=[],sessions=[];
for(let seed=0;seed<30;seed++){
 const power=.15+(seed%5)*.18,s=new AtelierSim({seed});s.launch(power);
 for(let i=0;i<240*40&&s.balls.size;i++)s.step();
 rows.push({seed,power,...s.results[0],remaining:s.balls.size});s.dispose();if(seed%10===9)console.log('single runs complete',seed+1);
}
for(let seed=100;seed<103;seed++){
 const s=new AtelierSim({seed});let maxLive=0;
 for(let i=0;i<240*180&&(s.remaining>0||s.balls.size);i++){
  if(i%180===0)s.launch(.45);s.step();maxLive=Math.max(maxLive,s.balls.size);
 }
 sessions.push({seed,launched:s.launched,remaining:s.remaining,active:s.balls.size,results:s.results.length,wins:s.results.filter(r=>r.win).length,returns:s.results.filter(r=>r.reason==='returned').length,maxLive});s.dispose();console.log('session complete',seed,sessions.at(-1));
}
const report={conditions:{dt:SETTINGS.dt,ballDiameter:SETTINGS.ballRadius*2,dishDiameter:SETTINGS.radius*2,holes:3,maxLive:SETTINGS.maxLive,standaloneRuns:30,sessionRuns:3},summary:{wins:rows.filter(r=>r.win).length,holeOutcomes:rows.filter(r=>r.reason==='hole').length,returns:rows.filter(r=>r.reason==='returned').length,meanDwell:rows.reduce((sum,r)=>sum+r.dwell,0)/rows.length,unresolved:rows.reduce((sum,r)=>sum+r.remaining,0)},rows,sessions};
writeFileSync('docs/qa/atelier/physics-survey.json',JSON.stringify(report,null,2));
if(rows.some(r=>r.remaining)||sessions.some(s=>s.remaining||s.active||s.launched!==s.results||s.maxLive>SETTINGS.maxLive))throw new Error('Unresolved or inconsistent session');
console.log(JSON.stringify({summary:report.summary,sessions},null,2));
