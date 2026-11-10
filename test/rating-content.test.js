import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const questions=JSON.parse(readFileSync(new URL('../data/rating-questions.json',import.meta.url),'utf8'));
const categories=['センス格付け','AI画像格付け','芸術格付け','プロの仕事','骨董品鑑定','盛り付け格付け'];
test('RATING pool keeps six categories and marks the verified photo-vs-generated question separately',()=>{
 assert.equal(questions.length,13);
 for(const category of categories){const rows=questions.filter(q=>q.category===category);assert.ok(rows.length>=1,category);}
 const verified=questions.filter(q=>q.enabled!==false&&q.source.kind==='verified-comparison');assert.equal(verified.length,1);assert.equal(verified[0].id,'rating-ai-photo-01');
 for(const q of questions){
  assert.equal(q.game,'RATING');assert.ok(q.prompt.length>8);assert.ok(q.explanation.length>8);
  assert.ok(['A','B'].includes(q.correct));assert.deepEqual(Object.keys(q.choices).sort(),['A','B']);
  for(const choice of Object.values(q.choices)){assert.ok(choice.label);assert.ok(choice.alt);assert.match(choice.asset,/^\/rating\/(?:verified\/)?[a-z0-9-]+\.(?:svg|jpg|png)$/);assert.ok(existsSync(new URL(`../public${choice.asset}`,import.meta.url)));}
  assert.ok(['original-created','verified-comparison'].includes(q.source.kind));assert.ok(q.source.assetLicense);assert.ok(q.source.editorialNote);
 }
 assert.equal(verified[0].correct,'A');assert.equal(verified[0].choices.A.provenance.license,'CC0');assert.equal(verified[0].choices.B.provenance.kind,'generated');
});
test('RATING assets manifest discloses original provenance and unresolved photo-vs-AI limitation',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/rating-assets.json',import.meta.url),'utf8'));
 assert.equal(manifest.questions.length,12);assert.match(manifest.provenance,/No third-party images/);
 assert.ok(manifest.questions.some(q=>q.editorialNote.includes('AI生成写真')));
});
