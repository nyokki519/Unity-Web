import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const physics=await import('../public/silver-ring/src/physics.js').catch(()=>({}));
test('authorized port preserves seeded launch/disc/shutter/bowl trajectories under both declared rules',async()=>{
 assert.equal(typeof physics.Sim,'function');const{CFG}=await import('../public/silver-ring/src/config.js');const{createRng}=await import('../public/silver-ring/src/seed.js');const fixture=JSON.parse(readFileSync(new URL('../docs/qa/cafe-motor/authorized-reference-baseline.json',import.meta.url)));
 const originalGate=CFG.gate.halfW,originalShutter=CFG.shutter.halfW,originalScale=CFG.shutter.openTimeScale,originalContacts=CFG.bowls.contacts.enabled;try{CFG.gate.halfW=.026;CFG.shutter.halfW=.055;CFG.shutter.openTimeScale=1;CFG.bowls.contacts.enabled=false;
 for(const expected of fixture.cases){CFG.shutter.blockRate=expected.interference?1.8:0;CFG.bowls.air.chance=expected.interference?.32:0;const counts={},sim=new physics.Sim(type=>counts[type]=(counts[type]||0)+1,createRng('silver-baseline'));let fired=0;const samples=[];for(let t=0;t<240*65;t++){if(t<20*200&&t%20===0&&sim.liveCount()<30&&sim.launch(.45))fired++;sim.step(1/240);if(t%240===0&&t<240*12)samples.push(sim.balls.slice(0,3).map(b=>({id:b.id,mode:b.mode,world:sim.worldPos(b,[0,0,0])})));}assert.deepEqual({interference:expected.interference,fired,counts,active:sim.balls.length,samples},expected);}
 }finally{CFG.gate.halfW=originalGate;CFG.shutter.halfW=originalShutter;CFG.shutter.openTimeScale=originalScale;CFG.bowls.contacts.enabled=originalContacts;}
});
test('all three stages naturally produce both winning and losing apertures',async()=>{
 const{CFG}=await import('../public/silver-ring/src/config.js');const{createRng}=await import('../public/silver-ring/src/seed.js');CFG.shutter.blockRate=0;CFG.bowls.air.chance=0;
 for(let stage=0;stage<3;stage++){const outcomes=[];for(let trial=0;trial<30;trial++){const sim=new physics.Sim((type,data)=>{if(type==='sink'&&data.tier===stage)outcomes.push(data.win);},createRng(`stage-${stage}-${trial}`));sim.spawnInBowl(stage);for(let i=0;i<240*60&&outcomes.length<=trial;i++)sim.step(1/240);assert.equal(outcomes.length,trial+1,'every trial must resolve');}assert.ok(outcomes.some(Boolean),`stage ${stage+1} has wins`);assert.ok(outcomes.some(x=>!x),`stage ${stage+1} has losses`);}
});

test('short and long opening durations halve while closing durations stay unchanged',async()=>{
 const {CFG}=await import('../public/silver-ring/src/config.js');
 const saved=CFG.shutter.openTimeScale;
 try {for(const short of [true,false])for(const open of [true,false]){
  const make=()=>{const sim=new physics.Sim(()=>{});let i=0;sim.rand=()=>i++===0?(short?0:.99):.4;return sim;};
  CFG.shutter.openTimeScale=1;const before=make()._shutterDur(open);
  CFG.shutter.openTimeScale=.5;const after=make()._shutterDur(open);
  assert.equal(after,before*(open?.5:1));
 }}finally{CFG.shutter.openTimeScale=saved;}
});
