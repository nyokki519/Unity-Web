const baseline=process.argv.includes('--baseline');
const {createSimulation}=await import(baseline?'../public/js/abyss/si-v1/si-engine.js':'../public/js/abyss/si-engine.js');
import {writeFileSync} from 'node:fs';
const results=[];
for(const difficulty of ['easy','normal','abyss']){
 const g=createSimulation({difficulty,seed:'jam-report',initialBalls:60}),still=new Map(),seen=new Set(),stalls=[];
 for(let i=0;i<240*115&&g.status==='running';i++){
  if(i%144===0)g.fire([35,45,55,65,75,85][g.fired%6]);g.step(1/240);
  for(const b of g.balls){const slow=Math.hypot(b.vx,b.vy,b.vz)<.007,n=slow?(still.get(b.id)||0)+1:0;still.set(b.id,n);if(n>480&&!seen.has(b.id)){seen.add(b.id);stalls.push({id:b.id,zone:b.zone,stage:b.stage,position:{x:b.x,y:b.y,z:b.z},age:b.age,pins:g.board.pins.filter(p=>Math.hypot(p.x-b.x,p.y-b.y)<.018).map(p=>({id:p.id,x:p.x,y:p.y,r:p.r}))});}}
 }
 results.push({difficulty,stalls,timeouts:g.stats.trayTimeouts,events:g.events.filter(e=>e.type==='timeout'),fired:g.fired,jp:g.jackpots,lost:g.lost,active:g.balls.length});g.dispose();
}
writeFileSync(`docs/qa/jackpot-flow/${baseline?'before':'after'}-stalls.json`,JSON.stringify(results,null,2));console.log(results.map(r=>({difficulty:r.difficulty,stalls:r.stalls.length,timeouts:r.events.length,jackpots:r.jp})));
if(!baseline&&results.some(r=>r.stalls.length||r.events.length||r.active))throw new Error('Residual stall in seeded regression');
