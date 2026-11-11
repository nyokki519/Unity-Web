import test from 'node:test';
import assert from 'node:assert/strict';
import {BulletPool} from '../public/shooting/pool.js';

function assertPoolIndexInvariant(pool){
 assert.equal(pool.renderIndices.length,pool.count);
 const seen=new Set();
 for(const [position,index] of pool.renderIndices.entries()){
  assert.equal(pool.active[index],1);assert.equal(pool.renderPosition[index],position);assert.equal(seen.has(index),false);seen.add(index);
 }
 for(let i=0;i<pool.capacity;i++)assert.equal(pool.active[i]===1,seen.has(i));
}

test('render index list tracks allocation, swap removal, and slot reuse',()=>{
 const pool=new BulletPool(70);for(let i=0;i<20;i++)pool.add(i,0,0,0);
 assertPoolIndexInvariant(pool);pool.remove(5);assertPoolIndexInvariant(pool);
 const replacement=pool.add(99,0,0,0);assert.equal(replacement,5);assertPoolIndexInvariant(pool);
});

test('render index list remains valid under mixed-owner clear and complete clear',()=>{
 const pool=new BulletPool(65);for(let i=0;i<65;i++)pool.add(i,0,0,0,{owner:i%2});
 pool.clear(1);assert.equal(pool.count,33);assertPoolIndexInvariant(pool);
 assert.deepEqual([...pool.renderIndices].sort((a,b)=>a-b),[...Array(33)].map((_,i)=>i*2));
 pool.clear();assert.equal(pool.count,0);assert.equal(pool.free.length,65);assertPoolIndexInvariant(pool);
});

test('dense render indices preserve a bijection through long mixed reuse sequences',()=>{
 const pool=new BulletPool(31);let seed=0x7c51;
 const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
 for(let operation=0;operation<5000;operation++){
  if(next()<.62)pool.add(next()*480,next()*720,0,0,{owner:next()<.5?0:1});
  else if(pool.count){const active=pool.renderIndices[Math.floor(next()*pool.renderIndices.length)];pool.remove(active);}
  assertPoolIndexInvariant(pool);
 }
});
