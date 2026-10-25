import test from 'node:test';
import assert from 'node:assert/strict';
import {DiceWorld} from '../public/chinchiro/src/dice-physics.js';

// A return to the short, almost-static drop fails both late physical motion and duration.
// Merely delaying finish() cannot satisfy the measured movement/contact assertions.
test('a throw contains late physical tumbling, not a stationary wait for results',async()=>{
 let movingThrows=0,contactThrows=0,turningThrows=0;const times=[];
 for(let seed=1;seed<=12;seed++){
  const w=await DiceWorld.create(seed);let moved=false,contact=false,startRotations=null,lateAngle=0;
  try{
   while(!w.done){w.step();const t=w.tick*w.config.dt;for(const e of w.drainSounds())if(t>=2.5&&t<=3.5&&(e.normalSpeed>.035||e.tangentSpeed>.025))contact=true;
    if(t>=2&&t<=3.5){if(!startRotations)startRotations=w.poses().map(p=>p.q);w.poses().forEach((p,i)=>{const dot=Object.keys(p.q).reduce((sum,k)=>sum+p.q[k]*startRotations[i][k],0);lateAngle=Math.max(lateAngle,2*Math.acos(Math.min(1,Math.abs(dot))));});}
    if(t>=2.5&&t<=3.5&&w.dice.some(d=>Math.hypot(...Object.values(d.body.linvel()))>.03||Math.hypot(...Object.values(d.body.angvel()))>2))moved=true;
   }
   if(lateAngle>1)turningThrows++;if(moved)movingThrows++;if(contact)contactThrows++;if(w.result.values)times.push(w.result.seconds);
  }finally{w.dispose();}
 }
 assert.ok(movingThrows>=10,`only ${movingThrows}/12 have actual motion after 2.5 seconds`);
 assert.ok(turningThrows>=8,`only ${turningThrows}/12 turn at least one radian in the late part of a throw`);
 assert.ok(contactThrows>=10,`only ${contactThrows}/12 have real late contacts`);
 assert.ok(times.length>=9,`${times.length}/12 valid throws`);
 const mean=times.reduce((a,b)=>a+b,0)/times.length;assert.ok(mean>=4&&mean<=6.5,`mean physical duration ${mean}`);
});

test('the moving flat base keeps supporting dice instead of losing triangle contacts',async()=>{
 const w=await DiceWorld.create(10);
 try{while(!w.done){w.step();for(const d of w.dice){const p=w.bowlLocal(d.body.translation());if(Math.hypot(p[0],p[2])<.08)assert.ok(p[1]>=0,`die fell through brass floor at ${w.tick*w.config.dt}s: ${p}`);}w.drainSounds();}assert.notEqual(w.result.reason,'場外に出ました');}finally{w.dispose();}
});

test('an already resting throw has no five-second minimum result timer',async()=>{
 const w=await DiceWorld.create(5,{config:{bowlMotionSeconds:0}});
 try{w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.035,y:.008,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});while(!w.done)w.step();assert.ok(w.result.values);assert.ok(w.result.seconds<1);}finally{w.dispose();}
});

test('prescribed dish movement does not apply invisible forces to airborne dice',async()=>{
 const w=await DiceWorld.create(9,{config:{gravity:0}});
 try{w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.035,y:.3,z:0},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});for(let i=0;i<720;i++)w.step();assert.ok(Math.hypot(...Object.values(w.bowlBody.linvel()))>.01);for(const d of w.dice){assert.ok(Math.hypot(...Object.values(d.body.linvel()))<1e-6);assert.ok(Math.hypot(...Object.values(d.body.angvel()))<1e-6);assert.ok(Math.abs(d.body.translation().y-.3)<1e-6);}}finally{w.dispose();}
});

test('fast moving dish contacts retain support near the edge of the flat base',async()=>{
 for(const seed of [1024,1097]){
  const w=await DiceWorld.create(seed);
  try{while(!w.done){w.step();for(const d of w.dice){const p=w.bowlLocal(d.body.translation());if(Math.hypot(p[0],p[2])<.11)assert.ok(p[1]>=-.001,`seed ${seed}: lost floor support ${p}`);}w.drainSounds();}}finally{w.dispose();}
 }
});
