import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {games} from '../src/events/catalog.js';
const questions=JSON.parse(readFileSync(new URL('../data/rating-questions.json',import.meta.url),'utf8'));
const categories=['センス格付け','AI画像格付け','芸術格付け','プロの仕事','骨董品鑑定','盛り付け格付け'];
test('RATING pool keeps six categories and marks the verified photo-vs-generated question separately',()=>{
 assert.equal(questions.length,14);
 for(const category of categories){const rows=questions.filter(q=>q.category===category);assert.ok(rows.length>=1,category);}
 const verified=questions.filter(q=>q.enabled!==false&&q.source.kind==='verified-comparison');assert.equal(verified.length,2);assert.deepEqual(verified.map(q=>q.id).sort(),['rating-ai-photo-01','rating-art-catalog-01']);
 for(const q of questions){
  assert.equal(q.game,'RATING');assert.ok(q.prompt.length>8);assert.ok(q.explanation.length>8);
  assert.ok(['A','B'].includes(q.correct));assert.deepEqual(Object.keys(q.choices).sort(),['A','B']);
  for(const choice of Object.values(q.choices)){assert.ok(choice.label);assert.ok(choice.alt);assert.match(choice.asset,/^\/rating\/(?:verified\/)?[a-z0-9-]+\.(?:svg|jpg|png|webp)$/);assert.ok(existsSync(new URL(`../public${choice.asset}`,import.meta.url)));}
  assert.ok(['original-created','verified-comparison'].includes(q.source.kind));assert.ok(q.source.assetLicense);assert.ok(q.source.editorialNote);
 }
 const photo=verified.find(q=>q.id==='rating-ai-photo-01'),art=verified.find(q=>q.id==='rating-art-catalog-01');assert.equal(photo.correct,'A');assert.equal(photo.choices.A.provenance.license,'CC0');assert.equal(photo.choices.B.provenance.kind,'generated');assert.equal(art.correct,'B');assert.equal(art.choices.B.provenance.creator,'Johannes Vermeer');assert.equal(art.choices.A.provenance.creator,'Pieter de Hooch');assert.match(art.source.editorialNote,/isPublicDomain=true/);assert.equal(art.choices.A.provenance.license,'CC0 (The Met Open Access)');
});
test('RATING instructions use a question-neutral choice criterion',()=>{
 assert.match(games.RATING.rule,/お題に合うと思う方/);
 const ui=readFileSync(new URL('../public/js/events/rating.js',import.meta.url),'utf8');assert.match(ui,/AとBを見比べ、お題に合うと思う方を選択/);assert.doesNotMatch(ui,/一流だと思う方を選択/);
});
test('RATING assets manifest discloses original provenance and unresolved photo-vs-AI limitation',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/rating-assets.json',import.meta.url),'utf8'));
 assert.equal(manifest.questions.length,12);assert.match(manifest.provenance,/No third-party images/);assert.deepEqual(manifest.verifiedComparisonQuestionIds,['rating-ai-photo-01','rating-art-catalog-01']);assert.equal(manifest.separateVerifiedAssetsManifest,'data/rating-verified-assets.json');
 assert.ok(manifest.questions.some(q=>q.editorialNote.includes('AI生成写真')));
});
