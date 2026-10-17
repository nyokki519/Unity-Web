import test from 'node:test';import assert from 'node:assert/strict';
const model=await import('../public/silver-ring/src/camera-pose.js').catch(()=>({}));
test('closeup orbit clamps pitch and distance, keeps target fixed across angles',()=>{
 assert.equal(typeof model.bowlCameraPose,'function');
 const a=model.bowlCameraPose({height:1.455,aspect:.48,pitch:50,yaw:0,zoom:1}),b=model.bowlCameraPose({height:1.455,aspect:.48,pitch:65,yaw:40,zoom:1});
 assert.deepEqual(a.target,b.target);assert.notDeepEqual(a.position,b.position);
 const distance=p=>Math.hypot(...p.position.map((v,i)=>v-p.target[i]));assert.ok(Math.abs(distance(a)-distance(b))<1e-10);
 for(const bad of [{pitch:-500,yaw:999,zoom:100},{pitch:NaN,yaw:Infinity,zoom:NaN}]){
  const p=model.bowlCameraPose({height:1.455,aspect:.48,...bad});assert.ok(p.position.every(Number.isFinite));assert.ok(p.position[1]>p.target[1]);assert.ok(distance(p)>.5&&distance(p)<1.3);
 }
});
