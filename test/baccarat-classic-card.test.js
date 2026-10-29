import test from 'node:test';
import assert from 'node:assert/strict';
import {FACES,BACK} from '../public/baccarat/card-data.js';
import {classicCardFace,classicCardBack} from '../public/baccarat/classic-card.js';
test('classic uses the reference white stock and black edge without changing Unity face identity or Vesper masters',()=>{
 for(const face of FACES){const converted=classicCardFace(face);assert.match(converted,/fill="#fff" stroke="#000"/);assert.doesNotMatch(converted,/fill="url\(#paper\)"/);assert.equal(converted.match(/data-rank="[^"]+" data-suit="[^"]+"/)[0],face.match(/data-rank="[^"]+" data-suit="[^"]+"/)[0]);assert.match(face,/fill="url\(#paper\)"/);}
 assert.match(classicCardBack(BACK),/rx="14" fill="#13332f" stroke="#000"/);assert.match(BACK,/stroke="#cfbc8e"/);
});
