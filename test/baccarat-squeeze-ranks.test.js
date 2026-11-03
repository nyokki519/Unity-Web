import test from 'node:test';
import assert from 'node:assert/strict';
import {FACES} from '../public/baccarat/card-data.js';
import {classicCardFace,squeezeCardFace} from '../public/baccarat/classic-card.js';
test('every squeeze face removes exactly both rank indices while retaining suits and face art',()=>{
 for(const original of FACES){
  const normal=classicCardFace(original),squeezed=squeezeCardFace(original);
  assert.equal((normal.match(/<text\b/g)||[]).length,2);
  assert.doesNotMatch(squeezed,/<text\b/);
  assert.equal(squeezed,normal.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,''));
  assert.equal((squeezed.match(/class="main-pip"/g)||[]).length,(normal.match(/class="main-pip"/g)||[]).length);
  assert.equal((squeezed.match(/<image /g)||[]).length,(normal.match(/<image /g)||[]).length);
 }
});
test('normal card master keeps all numeric and letter indices after squeeze conversion',()=>{
 for(const i of [0,1,9,10,11,12]){const before=classicCardFace(FACES[i]);squeezeCardFace(FACES[i]);assert.equal(classicCardFace(FACES[i]),before);assert.equal((before.match(/<text\b/g)||[]).length,2);}
});
