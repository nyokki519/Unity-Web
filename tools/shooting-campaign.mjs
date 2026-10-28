import {Game} from '../public/shooting/core.js';
import {createProfile,recordResult} from '../public/shooting/save.js';
import {inputFor} from './shooting-pilot.mjs';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const rows=[];
for(const difficulty of ['easy','normal'])for(let seed=0;seed<2;seed++){
 const options={seed:`full-campaign-${seed}`,difficulty,runId:`full-${difficulty}-${seed}`},g=new Game(options),profile=createProfile(),inputs=[];let input={fire:true};
 for(let frame=0;frame<120*1900&&g.phase==='play';frame++){
  if(frame%8===0){input=inputFor(g);inputs.push([g.tick,input]);}
  g.update(1/120,input);if(g.phase==='stageclear'){assert.equal(recordResult(profile,g.result,{...g.options,stage:g.stage}).ok,true);g.nextStage();}
 }
 if(g.result)assert.equal(recordResult(profile,g.result,{...g.options,stage:g.stage}).ok,true);
 assert.equal(profile.stats.kills,g.stats.kills);assert.equal(profile.stats.score,g.stats.score);assert.equal(profile.stats.runs,1);
 const replay=new Game(options);let cursor=0,current={fire:true};while(replay.tick<g.tick&&replay.phase==='play'){
  while(cursor<inputs.length&&inputs[cursor][0]<=replay.tick)current=inputs[cursor++][1];replay.update(1/120,current);if(replay.phase==='stageclear'&&replay.tick<g.tick)replay.nextStage();
 }
 assert.deepEqual(replay.snapshot(),g.snapshot());assert.deepEqual(replay.stats,g.stats);
 const row={difficulty,seed,clear:g.result?.clear,phase:g.phase,stage:g.stage+1,seconds:g.time,score:g.stats.score,kills:g.stats.kills,graze:g.stats.graze,misses:g.stats.misses,recordedInputs:inputs.length,replayExact:true,profileRuns:profile.stats.runs,profileStages:profile.stages,ending:g.result?.ending};rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('/workspace/Unity-Web/docs/qa/shooting/campaign.json',JSON.stringify(rows,null,2));
