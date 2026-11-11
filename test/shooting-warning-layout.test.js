import test from 'node:test';
import assert from 'node:assert/strict';
import {warningNoticeRect} from '../public/shooting/renderer.js';

test('warning uses the side opposite the player/source and avoids the ship at every legal x position',()=>{
 for(const playerX of [36,60,120,200,220,240,260,300,420,444]){
  for(const bossX of [100,240,380]){
   const box=warningNoticeRect(playerX,bossX);
   const overlaps=playerX+36>box.x&&playerX-36<box.x+box.width;
   assert.equal(overlaps,false,'player='+playerX+', boss='+bossX+', box='+JSON.stringify(box));
  }
 }
});

test('ordinary battle alerts use a compact side lane rather than covering the central bullet corridor',()=>{
 for(const playerX of [36,60,120,200,220,240,260,300,420,444]){
  for(const sourceX of [24,240,456]){
   const box=warningNoticeRect(playerX,sourceX);
   assert.equal(box.width,184);assert.equal(box.height,62);assert.ok(box.x===12||box.x===284);assert.ok(box.y>=235&&box.y+box.height<=305);
   assert.equal(playerX+36>box.x&&playerX-36<box.x+box.width,false,'player='+playerX+', source='+sourceX+', box='+JSON.stringify(box));
  }
 }
});
