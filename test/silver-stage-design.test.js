import test from 'node:test';import assert from 'node:assert/strict';
import {autoBowlCameraPose} from '../public/silver-ring/src/camera-pose.js';
import {stageMaterials,createStageStructure} from '../public/silver-ring/src/stage-structure.js';
import {stageSoundMix,contactVoice} from '../public/silver-ring/src/stage-sound.js';
test('final close-up looks from the side and above while earlier camera presets stay unchanged',()=>{
 const first=autoBowlCameraPose({height:1,aspect:.48}),last=autoBowlCameraPose({height:1,aspect:.48,tier:2});
 assert.notDeepEqual(first,last);assert.ok(last.position[0]<-.2);assert.ok(last.position[1]>last.target[1]+.4);assert.ok(last.position.every(Number.isFinite));
 assert.deepEqual(first,autoBowlCameraPose({height:1,aspect:.48,tier:0}));
});
test('structure separates silver guides, dark supports and brass entry and keeps fittings below the dish',()=>{
 const mats=stageMaterials();assert.notEqual(mats.rail.color.getHex(),mats.support.color.getHex());assert.notEqual(mats.entry.color.getHex(),mats.rail.color.getHex());
 const g=createStageStructure({R:.135,edgeY:.048,merge:false},mats);let bolts=0;
 g.traverse(o=>{if(o.userData.mountBolt){bolts++;assert.ok(o.position.y<.04);}});assert.equal(bolts,4);
 const rim=g.children.find(o=>o.userData.formedRim);assert.ok(rim);
 const vertices=rim.geometry.attributes.position;for(let i=0;i<vertices.count;i++)assert.ok(Math.hypot(vertices.getX(i),vertices.getZ(i))>.144,'formed return clears maximum ball envelope');
});
test('third-stage mix ducks ambience without changing recorded win clips; contacts are bounded and silent at rest',()=>{
 assert.ok(stageSoundMix(true).ambient<stageSoundMix(false).ambient);
 for(const type of ['rim','pair','air']){
  assert.equal(contactVoice(type,0),null);
  const small=contactVoice(type,.1),large=contactVoice(type,10);
  assert.ok(large.gain>=small.gain&&large.gain<=.08);assert.ok(large.duration<=.1);
 }
 assert.notDeepEqual(contactVoice('rim',.2),contactVoice('pair',.2));
});
test('mounts form a connected load path to the existing rear arm and stay beneath the bowl',async()=>{
 const THREE=await import('../public/vendor/three/three.module.js');
 const {CFG}=await import('../public/silver-ring/src/config.js'),{bowlSurfaceY}=await import('../public/silver-ring/src/physics.js');
 for(const bw of CFG.bowls.list){
  const g=createStageStructure({R:bw.R,edgeY:.048,merge:false,surfaceY:(x,z)=>bowlSurfaceY(x,z,bw)},stageMaterials());g.updateMatrixWorld(true);
  const members=[];g.traverse(o=>{if(o.userData.loadBearing)members.push(o);});assert.ok(members.length>15);
  const boxes=members.map(o=>new THREE.Box3().setFromObject(o).expandByScalar(.0001)),seen=new Set([0]);
  for(let pass=0;pass<members.length;pass++)for(let i=0;i<members.length;i++)if(seen.has(i))for(let j=0;j<members.length;j++)if(boxes[i].intersectsBox(boxes[j]))seen.add(j);
  assert.equal(seen.size,members.length,'all mounting members must touch a connected assembly');
  const link=members.find(o=>o.userData.armConnector);assert.ok(link);assert.ok(new THREE.Box3().setFromObject(link).containsPoint(new THREE.Vector3(0,-.055,-.095)));
  for(const member of members){const p=member.geometry.attributes.position;for(let i=0;i<p.count;i++){
   const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(member.matrixWorld);
   if(Math.hypot(v.x,v.z)<bw.R)assert.ok(v.y<bowlSurfaceY(v.x,v.z,bw)-.001,'fittings must stay below playable surface');
  }}
 }
});

test('static support parts batch into two draws without losing any bolt geometry',()=>{
 const unmerged=createStageStructure({R:.135,edgeY:.048,merge:false},stageMaterials()),merged=createStageStructure({R:.135,edgeY:.048},stageMaterials());
 const count=g=>g.children.reduce((n,o)=>n+o.geometry.attributes.position.count,0);
 assert.equal(count(merged),count(unmerged));assert.equal(merged.children.length,3);
 assert.equal(merged.children.reduce((n,o)=>n+(o.userData.mountBoltCount||0),0),4);
});
