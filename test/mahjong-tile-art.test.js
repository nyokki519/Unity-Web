import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderTile,tileAssetPath,tileLabel} from '../public/mahjong/src/tile-art.js';

test('all 34 faces and three red fives use local Kobalab art and accessible labels',()=>{
 for(let tile=0;tile<34;tile++){
  const image=renderTile(tile);
  assert.match(image,/class="mj-tile-svg/);
  assert.match(image,/aria-label=/);
  assert.match(image,/loading="eager"/);
  assert.ok(tileLabel(tile).length>0);
 }
 assert.deepEqual([34,35,36].map(tile=>tileAssetPath(tile)),['m0.gif','p0.gif','s0.gif']);
 assert.match(tileLabel(34),/赤5萬/);assert.match(tileLabel(35),/赤5筒/);assert.match(tileLabel(36),/赤5索/);
 assert.match(renderTile(34),/aria-label="赤5萬"/);
});

test('reference assets are local and tile backs preserve concealed information',async()=>{
 assert.match(renderTile(0),/\/mahjong\/assets\/kobalab\/tiles\/m1\.gif/);
 assert.match(renderTile('p0'),/\/mahjong\/assets\/kobalab\/tiles\/p0\.gif/);
 assert.match(renderTile(null,{back:true}),/pai\.gif/);
 assert.doesNotMatch(renderTile(0),/https?:\/\//);
 for(const name of ['m1.gif','m9.gif','p0.gif','s9.gif','z7.gif','pai.gif']){
  const file=await readFile(new URL(`../public/mahjong/assets/kobalab/tiles/${name}`,import.meta.url));
  assert.equal(file.subarray(0,3).toString(),'GIF',name);
 }
});

test('renderer keeps labels and red-five names safe for object and invalid values',()=>{
 assert.equal(tileLabel({tile:34}),'赤5萬');
 assert.equal(tileLabel('m5'),'5萬');assert.equal(tileLabel('m0'),'赤5萬');
 assert.match(renderTile('not-a-tile'),/aria-label="不明な牌"/);
 assert.match(renderTile('<img src=x>'),/alt="不明な牌"/);
});
