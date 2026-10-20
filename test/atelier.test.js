import test from 'node:test';
import assert from 'node:assert/strict';
import {AtelierSim} from '../public/atelier/src/physics.js';
import {SETTINGS,holes,surfaceHeight} from '../public/atelier/src/config.js';
import {buildDish} from '../public/atelier/src/geometry.js';
test('dish geometry leaves real circular apertures open',()=>{
 const {vertices,indices}=buildDish();assert.ok(indices.length>3000);assert.ok(Array.from(vertices).every(Number.isFinite));
 for(const h of holes){for(let i=0;i<indices.length;i+=3){const v=[0,1,2].map(k=>indices[i+k]*3);const sign=(a,b)=> (h.x-vertices[a])*(vertices[b+2]-vertices[a+2])-(h.z-vertices[a+2])*(vertices[b]-vertices[a]);const s=[sign(v[0],v[1]),sign(v[1],v[2]),sign(v[2],v[0])];assert.ok(!(s.every(n=>n>1e-10)||s.every(n=>n< -1e-10)),'hole center covered by a triangle');}}
});
test('physical drops resolve all three holes exactly once',()=>{
 const sim=new AtelierSim({seed:42});try{for(const hole of holes){const ball=sim.drop(hole.x,hole.z);for(let i=0;i<240*4&&sim.balls.has(ball.id);i++)sim.step();assert.equal(sim.results.at(-1).hole,hole.id);assert.equal(sim.results.at(-1).win,hole.win);}
 assert.equal(sim.results.length,3);for(let i=0;i<240;i++)sim.step();assert.equal(sim.results.length,3);assert.equal(sim.balls.size,0);}finally{sim.dispose();}
});
test('launch limits, conservation, replay and finite multi-ball motion',()=>{
 const a=new AtelierSim({seed:51}),b=new AtelierSim({seed:51});try{for(let i=0;i<SETTINGS.maxLive;i++){assert.ok(a.launch(.5));assert.ok(b.launch(.5));for(let t=0;t<100;t++){a.step();b.step();}}
 const available=a.remaining;while(a.balls.size<SETTINGS.maxLive)a.launch(.5);assert.equal(a.launch(.5),null);assert.equal(a.remaining,available-(SETTINGS.maxLive-b.balls.size));
 for(let t=0;t<240*45;t++){a.step();b.step();for(const ball of a.balls.values())assert.ok(Object.values(ball.body.translation()).every(Number.isFinite));}
 assert.equal(a.balls.size,0);assert.equal(a.launched,a.results.length);assert.equal(b.launched,b.results.length);assert.deepEqual(a.results,b.results);
 assert.equal(SETTINGS.ballRadius,.0055);assert.ok(surfaceHeight(.18)>surfaceHeight(.06));}finally{a.dispose();b.dispose();}
});
test('dish collision faces stay below 10mm edge length for 11mm balls',()=>{
 const {vertices,indices}=buildDish();let max=0;
 for(let i=0;i<indices.length;i+=3)for(let e=0;e<3;e++){const a=indices[i+e]*3,b=indices[i+(e+1)%3]*3;max=Math.max(max,Math.hypot(vertices[a]-vertices[b],vertices[a+2]-vertices[b+2]));}
 assert.ok(max<.010,`oversized surface facet ${max}`);
});
test('a natural launch drains through an aperture before the return timeout',()=>{
 const sim=new AtelierSim({seed:2});try{sim.launch(.51);for(let i=0;i<240*25&&sim.balls.size;i++)sim.step();assert.equal(sim.results[0]?.reason,'hole','rolling resistance must allow a natural hole outcome');assert.equal(sim.balls.size,0);}finally{sim.dispose();}
});
