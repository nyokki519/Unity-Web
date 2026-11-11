import {mkdirSync,writeFileSync,copyFileSync,readdirSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Game} from '../public/shooting/core.js';
import {STAGES} from '../public/shooting/data.js';
import {inputFor} from './shooting-pilot.mjs';

const baselineRef=process.env.SHOOTING_SIM_BASELINE||'294d846';
const baselineSource=process.env.SHOOTING_BASELINE_DIR;
if(!baselineSource)throw new Error('Set SHOOTING_BASELINE_DIR; run via bash tools/with-shooting-baseline.sh node tools/shooting-campaign-simulate.mjs');
const temp=join(tmpdir(),`shooting-campaign-before-${process.pid}`);mkdirSync(temp);
for(const file of readdirSync('public/shooting')){const path=join('public/shooting',file);if(statSync(path).isFile())copyFileSync(path,join(temp,file));}
for(const file of ['core.js','balance.js','pool.js','combat.js'])copyFileSync(join(baselineSource,file),join(temp,file));
const {Game:BeforeGame}=await import(`${pathToFileURL(join(temp,'core.js')).href}?before=${Date.now()}`);
const seeds=Math.max(1,Math.min(50,Number(process.env.SHOOTING_CAMPAIGN_SEEDS)||12));
const builds=[
 {id:'starter',ship:0,weapon:0,support:0,weaponLevels:{},supportLevels:{},upgrades:{}},
 {id:'damage-specialist',ship:7,weapon:17,support:12,weaponLevels:{17:5},supportLevels:{12:5},upgrades:{power:5,energy:4}},
 {id:'survival',ship:4,weapon:6,support:5,weaponLevels:{6:3},supportLevels:{5:5},upgrades:{armor:5,energy:3}}
];
function simulate(Type,difficulty,seed,build){
 const options={seed:`campaign-${difficulty}-${seed}-${build.id}`,mode:'campaign',difficulty,ship:build.ship,weapon:build.weapon,support:build.support,weaponLevels:build.weaponLevels,supportLevels:build.supportLevels,upgrades:build.upgrades};
 const game=new Type(options),stages=[];let nextUpdate=0,previousStage=0;
 const recordStage=passed=>{const base=game.stageBaseline||{};stages.push({stage:game.stage,name:STAGES[game.stage]?.name,passed,seconds:Number(game.stageTime.toFixed(1)),misses:game.stats.misses-(base.misses||0),kills:game.stats.kills-(base.kills||0),items:game.stats.items-(base.items||0),bossSeconds:game.stats.bossTimes.at(-1)?Number(game.stats.bossTimes.at(-1).toFixed(1)):null,hp:game.player.hp,bombs:game.player.bombs,weaponLevel:game.player.level});};
 for(let tick=0;tick<120*1800&&game.phase!=='result';tick++){
  if(game.phase==='stageclear'){
   recordStage(true);previousStage=game.stage;
   if(!game.nextStage())break;
   continue;
  }
  if(tick>=nextUpdate){game.input=inputFor(game);nextUpdate=tick+8;}
  game.update(1/120,game.input);
  if(game.phase==='result'){recordStage(!!game.result?.clear);break;}
 }
 return {clear:!!game.result?.clear,ending:game.result?.ending||game.result?.reason||'timeout',seconds:Number(game.time.toFixed(1)),misses:game.stats.misses,kills:game.stats.kills,score:game.stats.score,stages,final:{hp:game.player.hp,maxHp:game.player.maxHp,bombs:game.player.bombs,level:game.player.level}};
}
const results=[];
for(const difficulty of ['easy','normal','hard','extreme']){
 for(const build of builds){
  for(let seed=0;seed<seeds;seed++){
   const before=simulate(BeforeGame,difficulty,seed,build),after=simulate(Game,difficulty,seed,build);
   results.push({difficulty,build:build.id,seed,before,after});
  }
  console.log(`${difficulty} / ${build.id}: ${seeds} paired routes`);
 }
}
const summary={};
for(const difficulty of ['easy','normal','hard','extreme']){
 summary[difficulty]={};
 for(const build of builds){
  const rows=results.filter(r=>r.difficulty===difficulty&&r.build===build.id);
  const avg=(list,key)=>Number((list.reduce((sum,x)=>sum+(key(x)||0),0)/Math.max(1,list.length)).toFixed(1));
  summary[difficulty][build.id]={n:rows.length,beforeFullClears:rows.filter(r=>r.before.clear).length,afterFullClears:rows.filter(r=>r.after.clear).length,beforeMeanStages:avg(rows,r=>r.before.stages.filter(s=>s.passed).length),afterMeanStages:avg(rows,r=>r.after.stages.filter(s=>s.passed).length),beforeMeanMisses:avg(rows,r=>r.before.misses),afterMeanMisses:avg(rows,r=>r.after.misses),beforeMeanSeconds:avg(rows,r=>r.before.seconds),afterMeanSeconds:avg(rows,r=>r.after.seconds)};
 }
}
const report={date:new Date().toISOString(),baseline:`${baselineRef} (v1.3.0)`,candidate:process.env.SHOOTING_SIM_LABEL||'working tree',seedsPerBuildDifficulty:seeds,routeStages:STAGES.length-1,note:'Paired deterministic scripted-pilot campaign routes. Pilot is a fixed heuristic, not a human player; clear counts are not player win-rate estimates. Each route logs stage duration, damage taken, items, boss duration and remaining resources.',summary,results};
const output=process.env.SHOOTING_SIM_OUTPUT||'docs/shooting/qa/formations-v1.4/campaign-simulation.json';
mkdirSync(output.slice(0,output.lastIndexOf('/')),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(summary,null,2));rmSync(temp,{recursive:true,force:true});
