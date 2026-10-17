import{Sim}from'../public/silver-ring/src/physics.js';import{CFG}from'../public/silver-ring/src/config.js';import{createRng}from'../public/silver-ring/src/seed.js';import{writeFileSync,mkdirSync}from'node:fs';
const out=process.env.SILVER_QA_DIR||'docs/qa/silver-ring';mkdirSync(out,{recursive:true});const results=[];
for(const seed of ['silver-0','silver-1','silver-2']){
 CFG.shutter.blockRate=0;CFG.bowls.air.chance=0;const counts={},entries=[0,0,0],passes=[0,0,0],dwell=[0,0,0];let sim;
 sim=new Sim((type,data)=>{counts[type]=(counts[type]||0)+1;if(type==='bowlenter')entries[data.tier]++;if(type==='sink'&&data.win)passes[data.tier]++;},createRng(seed));
 let fired=0,rejected=0,maxLive=0;const still=new Map(),stalls=new Set();
 for(let t=0;t<240*210;t++){
  if(t<20*1000&&t%20===0){if(sim.liveCount()<30&&sim.launch(.45))fired++;else rejected++;}
  sim.step(1/240);maxLive=Math.max(maxLive,sim.liveCount());
  for(const b of sim.balls){if(b.mode==='bowl')dwell[b.bi]+=1/240;if(t%120===0){const p=sim.worldPos(b,[0,0,0]);if(!p.every(Number.isFinite))throw Error('Non-finite ball');const prev=still.get(b.id);if(!prev||Math.hypot(...p.map((n,i)=>n-prev.p[i]))>CFG.ball.r*.1)still.set(b.id,{p,at:sim.time});else if(sim.time-prev.at>5)stalls.add(b.id);}}
  if(t>20*1000&&sim.liveCount()===0)break;
 }
 const ledger=fired===(counts.foul||0)+(counts.swamp||0)+(counts.jackpot||0)+sim.liveCount();
 results.push({seed,attempts:1000,fired,rejected,maxLive,active:sim.liveCount(),elapsed:sim.time,counts,entries,passes,meanTrayDwell:dwell.map((n,i)=>entries[i]?n/entries[i]:null),stalledBalls:[...stalls],ledger});console.log(seed,'fired',fired,'jackpots',counts.jackpot||0,'stalls',stalls.size);
}
writeFileSync(out+'/natural-flow.json',JSON.stringify({note:'Authorized reference-derived near-physics model. 1000 attempts/seed, power45%,12Hz,240Hz step,30 live-ball cap; standard rule (air/block OFF). Stalls: <5% ball diameter displacement for5s. Not SI or real-machine odds.',results},null,2));
if(results.some(r=>!r.ledger||r.active||r.maxLive>30))throw Error('Unresolved or inconsistent natural trial');
if(!results.some(r=>r.counts.jackpot>0))throw Error('Natural launches did not demonstrate a three-stage jackpot');
