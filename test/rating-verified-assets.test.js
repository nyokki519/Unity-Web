import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(path.join(root,'data/rating-verified-assets.json'),'utf8'));
test('verified and generated rating assets are local, attributed, and hash-stable',()=>{
 assert.equal(manifest.assets.length,5);
 const ids=new Set();
 for(const asset of manifest.assets){
  assert.ok(!ids.has(asset.id));ids.add(asset.id);
  if(asset.filePageUrl)assert.match(asset.filePageUrl,/^https:\/\/commons\.wikimedia\.org\/wiki\/File(?:%3A|:)/i);
  assert.ok(asset.creator);assert.ok(asset.license);assert.ok(asset.attribution);assert.ok(asset.accessed);
  assert.match(asset.localAsset,/^\/rating\/verified\/[a-z-]+\.(?:jpg|png)$/);
  const file=path.join(root,'public',asset.localAsset.slice(1));assert.ok(existsSync(file));
  const bytes=readFileSync(file);if(asset.localAsset.endsWith('.jpg'))assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);else assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  assert.ok(asset.width>=1000&&asset.height>=700);
  assert.ok(asset.editorialUseNote);
 }
 assert.ok(manifest.assets.some(a=>a.license==='CC0'));
});
