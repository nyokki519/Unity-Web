import test from 'node:test';
import assert from 'node:assert/strict';
test('die faces are read from quaternion normals, including ambiguous edge rests',async()=>{
 const {topFace}=await import('../public/chinchiro/src/dice-geometry.js');
 assert.equal(topFace({x:0,y:0,z:0,w:1}).value,1);
 assert.equal(topFace({x:1,y:0,z:0,w:0}).value,6);
 assert.equal(topFace({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}).value,3);
 assert.equal(topFace({x:0,y:0,z:-Math.SQRT1_2,w:Math.SQRT1_2}).value,4);
 assert.equal(topFace({x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2}).value,5);
 assert.equal(topFace({x:-Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2}).value,2);
 assert.equal(topFace({x:0,y:0,z:Math.sin(Math.PI/8),w:Math.cos(Math.PI/8)}),null);
});
test('physical throws replay initial seed and settle without selecting outcomes',async()=>{
 const {DiceWorld}=await import('../public/chinchiro/src/dice-physics.js');
 const a=await DiceWorld.create(23),b=await DiceWorld.create(23);
 try{
  for(let i=0;i<2400&&!a.done;i++){a.step();b.step();}
  assert.ok(a.done);assert.deepEqual(a.result,b.result);assert.deepEqual(a.poses(),b.poses());
  assert.ok(a.contacts.floor>0);assert.ok(a.result.values?.every(n=>n>=1&&n<=6)||a.result.reason);
 }finally{a.dispose();b.dispose();}
});
test('game accepts physical faces atomically and preserves its existing reroll rules',async()=>{
 const {Match}=await import('../public/chinchiro/src/game.js');const m=new Match();m.placeBet(25);
 m.roll([1,1,1]);assert.deepEqual(m.dice,[1,1,1]);assert.equal(m.locked,true);assert.throws(()=>m.roll([2,2,2]));
});

test('shared die and bowl surfaces are watertight and die mass follows SI volume',async()=>{
 const {dieMesh,bowlMesh,meshVolume}=await import('../public/chinchiro/src/dice-geometry.js');
 for(const g of [dieMesh(),bowlMesh()]){const edges=new Map();for(let i=0;i<g.indices.length;i+=3)for(let j=0;j<3;j++){const edge=[g.indices[i+j],g.indices[i+(j+1)%3]].sort((a,b)=>a-b).join(':');edges.set(edge,(edges.get(edge)||0)+1);}assert.ok([...edges.values()].every(n=>n===2));}
 const mass=meshVolume(dieMesh())*8000;assert.ok(mass>.030&&mass<.034);
});

test('floor collision produces a bounce and die-to-die contact changes horizontal velocity',async()=>{
 const {DiceWorld}=await import('../public/chinchiro/src/dice-physics.js');const w=await DiceWorld.create(25);
 try{
  w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.035,y:.04,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:-.1,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});
  let bounced=false;for(let i=0;i<70;i++){w.step();if(w.dice[1].body.linvel().y>.1)bounced=true;}assert.ok(bounced);assert.ok(w.contacts.floor>0);
 }finally{w.dispose();}
 const p=await DiceWorld.create(26,{config:{gravity:0}});
 try{
  p.dice.forEach((d,i)=>{d.body.setTranslation({x:i===0?-.02:i===1?.02:.08,y:.04,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:i===0?.3:i===1?-.3:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});
  for(let i=0;i<20;i++)p.step();assert.ok(p.contacts.dice>0);assert.ok(p.dice[0].body.linvel().x<0);assert.ok(p.dice[1].body.linvel().x>0);
 }finally{p.dispose();}
});

test('a stack on the outer flat floor cannot be accepted as three top faces',async()=>{
 const {DiceWorld}=await import('../public/chinchiro/src/dice-physics.js');const w=await DiceWorld.create(23);
 try{
  w.dice.forEach((d,i)=>{d.body.setTranslation({x:i<2?.03:-.03,y:i===1?.024:.008,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});
  while(!w.done)w.step();assert.equal(w.result.values,null);assert.match(w.result.reason,/重なり/);
 }finally{w.dispose();}
});

test('CCD blocks a fast floor crossing and the curved rim redirects an outward die',async()=>{
 const {DiceWorld}=await import('../public/chinchiro/src/dice-physics.js');const w=await DiceWorld.create(27);
 try{
  w.dice.forEach((d,i)=>{d.body.setTranslation({x:(i-1)*.035,y:.04,z:0},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:0,y:-10,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});
  for(let i=0;i<4;i++)w.step();assert.ok(w.dice.every(d=>d.body.translation().y>0),'no floor tunnelling');
 }finally{w.dispose();}
 const r=await DiceWorld.create(28);
 try{
  r.dice.forEach((d,i)=>{d.body.setTranslation({x:i===0?.115:0,y:i===0?.055:.008,z:i===0?0:(i-1)*.035},true);d.body.setRotation({x:0,y:0,z:0,w:1},true);d.body.setLinvel({x:i===0?.5:0,y:0,z:0},true);d.body.setAngvel({x:0,y:0,z:0},true);});
  for(let i=0;i<80&&!r.done;i++)r.step();assert.ok(r.contacts.wall>0);assert.ok(r.dice[0].body.linvel().x<.4);
 }finally{r.dispose();}
});
