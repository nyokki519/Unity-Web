import {Game} from '../public/shooting/core.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import {inputFor} from './shooting-pilot.mjs';
const rows=[];
for(const difficulty of ['easy','normal','hard','extreme'])for(let seed=0;seed<4;seed++){
 const g=new Game({seed:`balance-${seed}`,difficulty,runId:`balance-${difficulty}-${seed}`});let input={fire:true};
 for(let i=0;i<120*330&&g.phase==='play';i++){if(i%8===0)input=inputFor(g);g.update(1/120,input);}
 rows.push({difficulty,seed,phase:g.phase,clear:g.result?.clear||false,seconds:g.time,kills:g.stats.kills,misses:g.stats.misses,graze:g.stats.graze,score:g.stats.score,items:g.stats.items,level:g.player.level,bossSeconds:g.stats.bossTimes,weaponUse:g.stats.weaponUse});
}
const g=new Game();g.player.invincible=1e9;g.waveCD=1e9;g.midSpawned=g.bossSpawned=true;
const fill=()=>{while(g.bullets.count<2200)g.bullets.add(10+g.rng()*460,g.rng()*700,0,25,{life:30,r:3,bounces:2});};fill();
globalThis.gc?.();const samples=[],before=process.memoryUsage().heapUsed;for(let i=0;i<2400;i++){fill();const t=performance.now();g.update(1/120,{fire:false});samples.push(performance.now()-t);g.drainEvents();}
globalThis.gc?.();samples.sort((a,b)=>a-b);const benchmark={controlledInvulnerable:true,bullets:2200,ticks:2400,simulationSeconds:20,medianUpdateMs:samples[1200],p95UpdateMs:samples[2280],maxUpdateMs:samples.at(-1),heapDeltaBytes:process.memoryUsage().heapUsed-before};
const report={rows,benchmark,note:'Scripted pilot is not a human gameplay evaluation; renderer/device performance measured separately.'};mkdirSync('/workspace/Unity-Web/docs/qa/shooting',{recursive:true});writeFileSync('/workspace/Unity-Web/docs/qa/shooting/simulation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
