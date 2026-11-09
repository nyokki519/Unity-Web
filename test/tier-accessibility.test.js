import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../public/js/events/tier.css',import.meta.url),'utf8');
const js=await readFile(new URL('../public/js/events/tier.js',import.meta.url),'utf8');

test('Tier UI keeps primary touch controls at least 44px and fits narrow phones',()=>{
 assert.match(css,/\.tier-label,\.tier-pick,\.tier-unassign,\.tier-submit,\.tier-image-button\{min-height:48px\}/);
 assert.match(css,/\.tier-pick\{width:48px;height:48px/);
 assert.match(css,/@media\(max-width:414px\)/);
 assert.match(css,/grid-template-columns:53px minmax\(0,1fr\)/);
 assert.match(css,/overflow-wrap:anywhere/);
});

test('Tier placement has keyboard-operable button alternatives and announces status',()=>{
 assert.match(js,/button\(item\.label/);
 assert.match(js,/button\(tier,\(\)=>placeSelected\(tier\)/);
 assert.match(js,/setAttribute\('aria-pressed'/);
 assert.match(js,/setAttribute\('aria-label','選択中のカードを配置するTier'\)/);
 assert.match(js,/setAttribute\('role','status'\)/);
 assert.match(js,/focusPickerNext/);
});

test('reduced-motion preference suppresses transitions and animation',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/animation-duration:\.01ms!important/);
 assert.match(css,/transition-duration:\.01ms!important/);
});
