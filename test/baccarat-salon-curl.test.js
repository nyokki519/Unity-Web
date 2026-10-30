import test from 'node:test';
import assert from 'node:assert/strict';
import {gripNormal, foldPoint, projectedProgress} from '../public/baccarat/salon-curl.js';
test('eight grip regions select outward normals', () => {
 for (const [x,y,nx,ny] of [[0,1,0,1],[0,-1,0,-1],[-1,0,-1,0],[1,0,1,0],[-1,1,-1,1],[1,1,1,1],[-1,-1,-1,-1],[1,-1,1,-1]]) {
  const n=gripNormal(x,y); assert.equal(Math.sign(n.x),nx); assert.equal(Math.sign(n.y),ny);
 }
});
test('cylindrical diagonal curl bends x and y and unwinds', () => {
 const n=gripNormal(1,1), point={x:.5,y:.6945};
 const flat=foldPoint(point,n,0), bent=foldPoint(point,n,.35), restored=foldPoint(point,n,0);
 assert.deepEqual(flat,restored); assert.equal(flat.z,0); assert.ok(bent.x<flat.x && bent.y<flat.y && bent.z>0);
 assert.ok(projectedProgress(0,{x:-.2,y:-.2},n,1)>0);
 assert.equal(projectedProgress(.3,{x:.3,y:.3},n,1),0);
});
