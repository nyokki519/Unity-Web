import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const questions=JSON.parse(readFileSync(new URL('../data/rating-questions.json',import.meta.url),'utf8'));
const categories=['センス格付け','AI画像格付け','芸術格付け','プロの仕事','骨董品鑑定','盛り付け格付け'];
test('RATING starter pool has two original, sourced questions for all six categories',()=>{
 assert.equal(questions.length,12);
 for(const category of categories){const rows=questions.filter(q=>q.category===category);assert.equal(rows.length,2,category);}
 for(const q of questions){
  assert.equal(q.game,'RATING');assert.ok(q.prompt.length>8);assert.ok(q.explanation.length>8);
  assert.ok(['A','B'].includes(q.correct));assert.deepEqual(Object.keys(q.choices).sort(),['A','B']);
  for(const choice of Object.values(q.choices)){assert.ok(choice.label);assert.ok(choice.alt);assert.match(choice.asset,/^\/rating\/[a-z0-9-]+\.svg$/);assert.ok(existsSync(new URL(`../public${choice.asset}`,import.meta.url)));}
  assert.equal(q.source.kind,'original-created');assert.ok(q.source.assetLicense);assert.ok(q.source.editorialNote);
 }
});
test('RATING assets manifest discloses original provenance and unresolved photo-vs-AI limitation',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/rating-assets.json',import.meta.url),'utf8'));
 assert.equal(manifest.questions.length,questions.length);assert.match(manifest.provenance,/No third-party images/);
 assert.ok(manifest.questions.some(q=>q.editorialNote.includes('AI生成写真')));
});
