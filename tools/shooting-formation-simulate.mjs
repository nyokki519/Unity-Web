import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,copyFileSync,readdirSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Game} from '../public/shooting/core.js';
import {inputFor} from './shooting-pilot.mjs';

const temp=join(tmpdir(),`shooting-formation-before-${process.pid}`);mkdirSync(temp);
const baselineRef=process.env.SHOOTING_SIM_BASELINE||'294d846';
for(const file of readdirSync('public/shooting')){const path=join('public/shooting',file);if(statSync(path).isFile())copyFileSync(path,join(temp,file));}
for(const file of ['core.js','balance.js'])writeFileSync(join(temp,file),execFileSync('git',['show',`${baselineRef}:public/shooting/${file}`]));
const {Game:BeforeGame}=await import(`${pathToFileURL(join(temp,'core.js')).href}?before=${Date.now()}`);
const sampleCount=Math.max(1,Math.min(100,Number(process.env.SHOOTING_SIM_SEEDS)||50));
function simulate(Type,difficulty,seed){
 const game=new Type({seed:`formation-${seed}`,difficulty,mode:'campaign'});let input={fire:true};
 for(let tick=0;tick<120*330&&game.phase==='play';tick++){
  if(tick%8===0)input=inputFor(game);game.update(1/120,input);
 }
 return{phase:game.phase,clear:!!game.result?.clear,seconds:Number(game.time.toFixed(2)),kills:game.stats.kills,misses:game.stats.misses,graze:game.stats.graze,score:game.stats.score,items:game.stats.items,bossSeconds:game.stats.bossTimes.map(x=>Number(x.toFixed(2)))};
}
const rows=[];
for(const difficulty of ['easy','normal','hard','extreme']){
 for(let seed=0;seed<sampleCount;seed++){
  const before=simulate(BeforeGame,difficulty,seed),after=simulate(Game,difficulty,seed);
  rows.push({difficulty,seed,before,after,clearChanged:before.clear!==after.clear,missDelta:after.misses-before.misses,killDelta:after.kills-before.kills});
 }
 console.log(`${difficulty}: completed ${sampleCount}/${sampleCount} paired seeds`);
}
const summary=Object.fromEntries(['easy','normal','hard','extreme'].map(difficulty=>{const subset=rows.filter(row=>row.difficulty===difficulty);return[difficulty,{n:subset.length,beforeClears:subset.filter(row=>row.before.clear).length,afterClears:subset.filter(row=>row.after.clear).length,clearChanges:subset.filter(row=>row.clearChanged).length,meanBeforeMisses:Number((subset.reduce((s,row)=>s+row.before.misses,0)/subset.length).toFixed(2)),meanAfterMisses:Number((subset.reduce((s,row)=>s+row.after.misses,0)/subset.length).toFixed(2)),meanBeforeKills:Number((subset.reduce((s,row)=>s+row.before.kills,0)/subset.length).toFixed(1)),meanAfterKills:Number((subset.reduce((s,row)=>s+row.after.kills,0)/subset.length).toFixed(1))}]}));
const report={date:new Date().toISOString(),baseline:`${baselineRef} (v1.3.0)`,candidate:process.env.SHOOTING_SIM_LABEL||'working tree',seedsPerDifficulty:sampleCount,note:`${sampleCount} deterministic scripted-pilot seeds per difficulty. The pilot is not a human player, and these results are not estimates of player win rates.`,summary,rows};
const target='docs/shooting/qa/formations-v1.4';mkdirSync(target,{recursive:true});const output=process.env.SHOOTING_SIM_OUTPUT||join(target,'simulation.json');writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary,null,2));rmSync(temp,{recursive:true,force:true});
