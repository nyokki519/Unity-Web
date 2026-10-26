import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {DiceWorld,PHYSICS} from '../public/chinchiro/src/dice-physics.js';
import {BOWL,DICE_SIZE} from '../public/chinchiro/src/dice-geometry.js';
const count=Number(process.argv[2]||500),output=process.argv[3]||'/tmp/chinchiro-support.json';
if(!Number.isInteger(count)||count<1||count>10000)throw Error('invalid count');
// Positive control: point queries must detect real metal, not silently use wrong units.
const probe=await DiceWorld.create(0);probe.step();let metal=false;
probe.world.intersectionsWithPoint(probe.toSolverPoint({x:0,y:-.002,z:0}),c=>{if(probe.bowlHandles.has(c.handle))metal=true;return !metal;});assert.ok(metal,'point query must detect the solid brass base');probe.dispose();
// The secondary geometry audit discards expensive sound observations, not contacts.
// Verify that this leaves actual solver poses/results bit-identical first.
const discardSoundDetails=w=>{w.collectSounds=()=>w.events.drainContactForceEvents(()=>{});};
for(const seed of [1,73,296]){const a=await DiceWorld.create(seed),b=await DiceWorld.create(seed);discardSoundDetails(b);while(!a.done){a.step();a.drainSounds();b.step();}assert.deepEqual(a.result,b.result);assert.deepEqual(a.poses(),b.poses());a.dispose();b.dispose();}
const report={count,config:PHYSICS,solidQueryPositiveControl:true,observerEquivalenceSeeds:[1,73,296],insideMaterial:[],belowInterior:[],valid:0,invalid:{},note:'Same solver and release conditions; only sound observation work omitted. Every physics tick checks die centres against actual solid dish colliders and below the bowl interior, not only the flat base.'};
for(let seed=1;seed<=count;seed++){
 const w=await DiceWorld.create(seed);discardSoundDetails(w);let materialFlag=false,belowFlag=false;
 while(!w.done){w.step();for(let i=0;i<3;i++){
  const p=w.dice[i].body.translation();if(!belowFlag&&Math.hypot(p.x,p.z)<BOWL.flatRadius+BOWL.curveRadius-DICE_SIZE*Math.sqrt(3)/2&&p.y<-.001){report.belowInterior.push({seed,die:i,tick:w.tick,p:{...p}});belowFlag=true;}
  if(!materialFlag)w.world.intersectionsWithPoint(w.toSolverPoint(p),c=>{if(w.bowlHandles.has(c.handle)){report.insideMaterial.push({seed,die:i,tick:w.tick,p:{...p}});materialFlag=true;return false;}return true;});
 }}
 if(w.result.values)report.valid++;else report.invalid[w.result.reason]=(report.invalid[w.result.reason]||0)+1;w.dispose();
}
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,insideMaterial:report.insideMaterial.length,belowInterior:report.belowInterior.length}));
