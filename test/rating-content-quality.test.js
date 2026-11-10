import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const questions=JSON.parse(readFileSync(resolve(root,'data/rating-questions.json'),'utf8')).filter(q=>q.enabled!==false);
const hash=path=>createHash('sha256').update(readFileSync(resolve(root,'public',path.replace(/^\//,'')))).digest('hex');

test('enabled practice questions do not repeat the same comparison artwork under a reversed answer key',()=>{
 const byPair=new Map();
 for(const q of questions.filter(q=>q.source.kind==='original-created')){
  const key=[hash(q.choices.A.asset),hash(q.choices.B.asset)].sort().join(':');
  const previous=byPair.get(key);
  assert.equal(previous,undefined,`${q.id} duplicates the image pair already used by ${previous}`);
  byPair.set(key,q.id);
 }
});

test('enabled original practice questions use a distinct prompt within each category',()=>{
 const prompts=new Map();
 for(const q of questions.filter(q=>q.source.kind==='original-created')){
  const key=`${q.category}:${q.prompt}`;
  const previous=prompts.get(key);
  assert.equal(previous,undefined,`${q.id} repeats the prompt used by ${previous}`);
  prompts.set(key,q.id);
 }
});

test('replacement practice questions ask a new visual question and explain the exact answer criterion',()=>{
 assert.equal(questions.length,12,'quality is improved by replacing duplicate content, not by inflating the pool');
 const expected={
  'rating-sense-02':['B','遠目','コントラスト'],
  'rating-art-02':['A','抽象画','余白'],
  'rating-craft-02':['B','アイコン','線幅'],
  'rating-antique-02':['A','染付皿','真贋'],
  'rating-plating-02':['B','前菜','重ならず']
 };
 for(const [id,[correct,promptCue,explanationCue]] of Object.entries(expected)){
  const q=questions.find(row=>row.id===id);
  assert.ok(q,`missing ${id}`);assert.equal(q.correct,correct);
  assert.ok(q.prompt.includes(promptCue),`${id} prompt is not the intended question`);
  assert.ok(q.explanation.includes(explanationCue),`${id} does not explain its answer criterion`);
  assert.match(q.source.editorialNote,/オリジナルSVG練習図版/);
 }
});

test('practice SVGs are clean landscape illustrations with no embedded answer text',()=>{
 for(const q of questions.filter(q=>q.source.kind==='original-created'))for(const choice of Object.values(q.choices)){
  const svg=readFileSync(resolve(root,'public',choice.asset.replace(/^\//,'')),'utf8');
  const box=svg.match(/viewBox=["']\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i);
  assert.ok(box,`${q.id} missing viewBox`);
  const ratio=Number(box[3])/Number(box[4]);
  assert.ok(ratio>=1.3&&ratio<=1.8,`${q.id} ${choice.asset} ratio ${ratio.toFixed(2)} does not fit the choice card`);
  assert.doesNotMatch(svg,/<text\b/i,`${q.id} ${choice.asset} contains text inside its artwork`);
 }
});
