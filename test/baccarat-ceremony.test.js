import test from 'node:test';
import assert from 'node:assert/strict';
import {dealMotion,clearMotion,lockMotion,thirdMotion,settleMotion} from '../public/baccarat/motion.js';
function fixture(){
 const pending=[]; const classes=new Set();
 const inner={animate(frames,opts){pending.push({frames,opts});return {finished:new Promise(()=>{}),cancel(){}};}};
 const node={...inner,getBoundingClientRect:()=>({left:30,top:50}),querySelector:()=>inner};
 globalThis.matchMedia=()=>({matches:false});globalThis.getComputedStyle=()=>({transform:'matrix(0,1,-1,0,0,0)'});
 globalThis.document={hidden:false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 return {node,pending,classes};
}
test('face callback waits for front visibility and cancellation discards it',async()=>{
 const {node,pending}=fixture();let seen=0;dealMotion(node,{speed:'quick'},()=>seen++);
 assert.equal(seen,0);assert.ok(pending.some(a=>a.frames.some(f=>f.transform==='rotateY(0deg)')));
 clearMotion();await new Promise(r=>setTimeout(r,110));assert.equal(seen,0);
});
test('instant reveal is synchronous and stage helpers create no movement',()=>{
 const {node,pending}=fixture();let seen=0;dealMotion(node,{speed:'instant'},()=>seen++);lockMotion({speed:'instant'});thirdMotion({speed:'instant'});
 assert.equal(seen,1);assert.equal(pending.length,0);settleMotion({net:0,lines:[]},{speed:'instant'});clearMotion();
});
test('normal deal preserves computed third card pose and has bounded duration',()=>{
 const {node,pending}=fixture();dealMotion(node,{speed:'normal'},()=>{});
 assert.match(pending[0].frames[0].transform,/matrix\(0,1,-1,0,0,0\)/);assert.ok(pending.every(a=>a.opts.duration<=500));clearMotion();
});
