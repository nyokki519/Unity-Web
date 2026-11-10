import test from 'node:test';
import assert from 'node:assert/strict';
import {renderTile,tileLabel} from '../public/mahjong/src/tile-art.js';

test('original tile renderer covers all 34 faces and labels red fives distinctly',()=>{
 for(let tile=0;tile<34;tile++){
  const svg=renderTile(tile);
  assert.match(svg,/viewBox="0 0 72 96"/);
  assert.match(svg,/class="mj-tile-face/);
  assert.ok(tileLabel(tile).length>0);
 }
 assert.match(tileLabel(34),/赤5萬/);assert.match(tileLabel(35),/赤5筒/);assert.match(tileLabel(36),/赤5索/);
 assert.match(renderTile(34),/aria-label="赤5萬"/);
});

test('tile art uses original suit and honor markers without copying remote artwork',()=>{
 assert.match(renderTile(0),/萬/);assert.match(renderTile(9),/class="mj-pin/);assert.match(renderTile(18),/class="mj-sou/);
 for(let tile=27;tile<34;tile++)assert.match(renderTile(tile),tile===31?/mj-white-dragon/:/class="mj-honor/);
 assert.doesNotMatch(renderTile(0),/https?:\/\//);
});

test('tile renderer handles object tiles and provides a safe fallback for invalid values',()=>{
 assert.equal(tileLabel({tile:34}),'赤5萬');
 assert.equal(tileLabel('m5'),'5萬');assert.equal(tileLabel('m0'),'赤5萬');assert.match(renderTile('p0'),/mj-tile-red-five/);
 assert.match(renderTile('not-a-tile'),/aria-label="不明な牌"/);
});
