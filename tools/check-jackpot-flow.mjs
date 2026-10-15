import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSimulation} from '../public/js/abyss/si-engine.js';
const results=[];
for(let seed=0;seed<5;seed++){
 const g=createSimulation({seed:String(seed),initialBalls:100});
 try{
  for(let tick=0;tick<240*130&&g.status==='running';tick++){
   if(tick%144===0)g.fire([35,45,55,65,75,85][g.fired%6]);
   g.step(1/240);assert.equal(g.fired,g.lost+g.jackpots+g.balls.length);
  }
  assert.equal(g.fired,100);assert.equal(g.balls.length,0);assert.ok(g.jackpots>0);assert.ok(g.stats.trayEntries.every(n=>n>0));
  results.push({seed,shots:g.fired,jackpots:g.jackpots,lost:g.lost,gate:g.stats.gatePasses,entries:g.stats.trayEntries,passes:g.stats.trayPasses,timeouts:g.stats.trayTimeouts,debugUsed:g.debugUsed});
 }finally{g.dispose();}
}
await mkdir('docs/qa/jackpot-si',{recursive:true});await writeFile('docs/qa/jackpot-si/natural-flow.json',JSON.stringify({note:'Original provisional easy geometry; these are seeded test outcomes, not real-machine probabilities.',results},null,2)+'\n');console.log(results);
