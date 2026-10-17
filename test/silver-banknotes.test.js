import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three/three.module.js';import{createBanknoteRain}from'../public/silver-ring/src/banknote-rain.js';
test('decorative banknotes stay behind the cabinet and stop when reduced or disabled',()=>{
 const old=globalThis.document;const g=Object.fromEntries(['fillRect','strokeRect','fillText','beginPath','ellipse','stroke','moveTo','bezierCurveTo'].map(k=>[k,()=>{}]));globalThis.document={createElement:()=>({getContext:()=>g})};
 try{const scene=new THREE.Scene(),rain=createBanknoteRain(THREE,scene),m=new THREE.Matrix4();assert.equal(rain.mesh.count,14);rain.update(.05);const before=rain.elapsed;
 for(let i=0;i<14;i++){rain.mesh.getMatrixAt(i,m);assert.ok(m.elements[14]<=-.85);assert.ok(m.elements[13]>=-.6&&m.elements[13]<=4.2);}
 rain.update(1,{reduced:true});assert.equal(rain.elapsed,before);assert.equal(rain.mesh.visible,false);rain.update(.05,{enabled:false});assert.equal(rain.elapsed,before);rain.update(.05);assert.equal(rain.mesh.visible,true);assert.ok(rain.elapsed>before);
 rain.mesh.geometry.dispose();rain.mesh.material.map.dispose();rain.mesh.material.dispose();
 }finally{globalThis.document=old;}
});
