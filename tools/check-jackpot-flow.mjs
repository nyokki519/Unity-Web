import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSimulation} from '../public/js/abyss/si-engine.js';
const output=process.env.JACKPOT_QA_DIR||'docs/qa/jackpot-flow';
const results=[];
for(const seed of ['abyss','0','1','2','3']){
 const g=createSimulation({seed:String(seed),initialBalls:100});
 try{
  for(let tick=0;tick<240*130&&g.status==='running';tick++){
   if(tick%144===0)g.fire(35);
   g.step(1/240);assert.equal(g.fired,g.lost+g.jackpots+g.balls.length);
  }
  assert.equal(g.fired,100);assert.equal(g.balls.length,0);
  results.push({physicsVersion:g.physicsVersion,seed,shots:g.fired,jackpots:g.jackpots,lost:g.lost,gate:g.stats.gatePasses,entries:g.stats.trayEntries,passes:g.stats.trayPasses,timeouts:g.stats.trayTimeouts,debugUsed:g.debugUsed});
 }finally{g.dispose();}
}
assert.ok(results.reduce((sum,r)=>sum+r.jackpots,0)>0,'natural shots must reach an actual jackpot');
await mkdir(output,{recursive:true});await writeFile(`${output}/natural-flow.json`,JSON.stringify({note:'Original provisional easy geometry; these are seeded test outcomes, not real-machine probabilities.',results},null,2)+'\n');console.log(results);
