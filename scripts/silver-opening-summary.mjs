import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const folder='docs/qa/entrance-open-time-1000';
const reports=Array.from({length:4},(_,i)=>JSON.parse(readFileSync(`${folder}/shard-${i}.json`)));
const rows=reports.flatMap(r=>r.rows);
for(const report of reports){const {seeds,seedStart,...conditions}=report.conditions;assert.deepEqual(conditions,(({seeds,seedStart,...rest})=>rest)(reports[0].conditions));}
const previous=JSON.parse(readFileSync('docs/qa/entrance-open-time/simulation.json'));
for(const old of previous.rows)assert.deepEqual(rows.find(row=>row.seed===old.seed&&row.scale===old.scale),old,'first 48 seeds must reproduce the previous run');
assert.equal(rows.length,2000);assert.equal(new Set(rows.map(r=>`${r.scale}:${r.seed}`)).size,2000);
for(const row of rows){assert.equal(row.remaining,0);assert.equal(row.netShots,250);assert.ok(row.seed>=0&&row.seed<1000);}
function wilson(hits,n){const z=1.959963984540054,p=hits/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h];}
const summary=[1,.5].map(scale=>{const trials=rows.filter(r=>r.scale===scale),n=trials.length;assert.equal(n,1000);const sum=key=>trials.reduce((s,r)=>s+r[key],0),wins=trials.filter(r=>r.jackpots>0).length;return {scale,runs:n,winningRuns:wins,winningRunRate:wins/n,winningRun95CI:wilson(wins,n),shots:sum('shots'),gates:sum('gates'),gateRate:sum('gates')/sum('shots'),jackpots:sum('jackpots'),remaining:sum('remaining')};});
const pairs=Array.from({length:1000},(_,seed)=>{const a=rows.find(r=>r.seed===seed&&r.scale===1),b=rows.find(r=>r.seed===seed&&r.scale===.5);return Number(b.jackpots>0)-Number(a.jackpots>0);});
const difference=pairs.reduce((a,b)=>a+b,0)/pairs.length;
const variance=pairs.reduce((s,d)=>s+(d-difference)**2,0)/(pairs.length-1),se=Math.sqrt(variance/pairs.length);
const report={conditions:{...reports[0].conditions,seeds:1000,seedStart:0},summary,pairedDifference:{newMinusOld:difference,approximate95CI:[difference-1.96*se,difference+1.96*se],oldOnly:pairs.filter(x=>x===-1).length,newOnly:pairs.filter(x=>x===1).length},notes:['Fixed power 0.45, air ON 0.32, interference OFF; results do not cover all player strategies.','Confidence intervals describe Monte Carlo sampling uncertainty, not model realism.','Shared seed does not preserve ball-by-ball random draws after trajectories diverge.','250 net shots are completed even after jackpot.']};
writeFileSync(`${folder}/summary.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
