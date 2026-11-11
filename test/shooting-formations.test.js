import test from 'node:test';
import assert from 'node:assert/strict';
import {wavePositions} from '../public/shooting/core.js';

test('wave formations have distinct readable geometry and stay within the playfield',()=>{
 const forms=Array.from({length:4},(_,i)=>wavePositions(5,i+1,0));
 assert.equal(new Set(forms.map(rows=>JSON.stringify(rows))).size,4);
 for(const rows of forms){
  assert.equal(rows.length,5);
  assert.ok(rows.every(({x,y})=>x>=24&&x<=456&&y>=-180&&y<=-20));
  assert.equal(new Set(rows.map(({x,y})=>`${x}:${y}`)).size,5);
 }
 // The V's center arrives below its outer wings; the flank attack comes in pairs.
 assert.ok(forms[1][2].y>forms[1][0].y);
 assert.equal(forms[2][0].y,forms[2][1].y);
 assert.equal(forms[2][2].y,forms[2][3].y);
 // The curved wave has its own smooth height profile, distinct from the V.
 assert.notDeepEqual(forms[1].map(({y})=>y),forms[3].map(({y})=>y));
});

test('formation placement is deterministic and adapts to count and stage',()=>{
 assert.deepEqual(wavePositions(4,9,3),wavePositions(4,9,3));
 assert.notDeepEqual(wavePositions(4,9,3),wavePositions(4,10,3));
 assert.notDeepEqual(wavePositions(4,9,3),wavePositions(4,9,4));
 assert.equal(wavePositions(3,4,2).length,3);
});

test('odd flank formations center their rear guard instead of loading one side',()=>{
 for(const count of [3,5,7]){
  const rows=wavePositions(count,3,0);
  for(let i=0;i<count-(count%2);i+=2){
   assert.equal(rows[i].x+rows[i+1].x,480);
   assert.equal(rows[i].y,rows[i+1].y);
  }
  if(count%2)assert.equal(rows.at(-1).x,240);
 }
});
