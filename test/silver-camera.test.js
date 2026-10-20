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
test('auto bowl view looks down at 30 degrees without becoming overhead',()=>{
 assert.equal(typeof model.autoBowlCameraPose,'function');
 for(const aspect of [.48,1.6]){
 const p=model.autoBowlCameraPose({height:1.455,aspect});const d=p.position.map((v,i)=>v-p.target[i]);
 const angle=Math.atan2(d[1],Math.hypot(d[0],d[2]))*180/Math.PI;
 assert.ok(angle>=29&&angle<=31);assert.ok(p.position[2]>.55);
 }
});
test('free vertical movement translates camera with target and clamps travel',()=>{
 assert.equal(typeof model.moveFreeCameraHeight,'function');
 const refs={camera:{position:{y:2}},controls:{target:{y:1.5}}};
 model.moveFreeCameraHeight(refs,-.4);assert.equal(refs.controls.target.y,1.1);assert.equal(refs.camera.position.y,1.6);
 model.moveFreeCameraHeight(refs,-100);assert.equal(refs.controls.target.y,.2);assert.ok(Math.abs(refs.camera.position.y-.7)<1e-9);
});
