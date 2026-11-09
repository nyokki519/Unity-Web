import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const themes=JSON.parse(readFileSync(new URL('../data/tier-themes.json',import.meta.url),'utf8'));

test('theme pack has at least fifteen ready-to-play Japanese topics',()=>{
  assert.ok(themes.length>=15);
  for(const theme of themes){
    assert.match(theme.id,/^[a-z0-9-]+$/);
    assert.ok(theme.title.trim().length>0);
    assert.ok(theme.description.trim().length>0);
    assert.ok(theme.prompt.trim().length>0);
    assert.ok(Array.isArray(theme.categories)&&theme.categories.length>0);
    assert.ok(Array.isArray(theme.items)&&theme.items.length>=2&&theme.items.length<=10,`${theme.id} item count`);
    assert.ok(theme.items.every(item=>/^[a-z0-9-]+$/.test(item.id)&&item.label.trim().length>0));
    assert.equal(new Set(theme.items.map(item=>item.id)).size,theme.items.length,`${theme.id} duplicate item IDs`);
    assert.equal(new Set(theme.items.map(item=>item.label)).size,theme.items.length,`${theme.id} duplicate labels`);
  }
  assert.equal(new Set(themes.map(theme=>theme.id)).size,themes.length,'duplicate theme IDs');
});

test('theme pack covers relationship, food, hobbies, travel, work, and life values',()=>{
  const categories=new Set(themes.flatMap(theme=>theme.categories));
  for(const category of ['恋愛','食べ物','趣味','旅行','仕事','人生観'])assert.ok(categories.has(category),`missing category: ${category}`);
  assert.ok(categories.size>=10,`expected broad theme variety, got ${categories.size}`);
});

test('the requested style cost-performance starter is present and aligned with the reference image',()=>{
  const theme=themes.find(theme=>theme.id==='style-cost-performance');
  assert.ok(theme);
  assert.equal(theme.prompt,'かっこよくなるためのコスパTier表');
  assert.deepEqual(theme.items.map(item=>item.label),['眉毛を整える','似合うメガネを選ぶ','靴を手入れする','サイズの合う服を着る','髪型を整える','肌をケアする','歯並びを整える']);
});
